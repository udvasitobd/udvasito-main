/**
 * Blood requests — specs §6.2: `create` (SCR-M02), `getForOwner` and `close` (SCR-M03), `listMine` (SCR-M04).
 *
 * The contact number is checked (VAL-03) and stored; it is never put in events, logs or errors (CLAUDE.md rule 3)
 * and is read back only through `_lib/visibility.ts`.
 */
import { paginationOptsValidator } from 'convex/server';
import { v } from 'convex/values';

import { internal } from './_generated/api';
import type { Doc, Id } from './_generated/dataModel';
import type { MutationCtx, QueryCtx } from './_generated/server';
import { noLongerNeededText, roundKm } from './_lib/alertText';
import { assertSameArea, memberMutation, memberQuery } from './_lib/auth';
import { bloodBanksNear } from './_lib/bloodBanks';
import { appError, validationError } from './_lib/errors';
import { logEvent } from './_lib/events';
import { checkPlaceChain } from './_lib/places';
import { sendAlert } from './_lib/push';
import { randomBytes } from './_lib/random';
import { requestPlaceNames } from './_lib/requestPlace';
import { getSettings } from './_lib/settings';
import { confirmedDonorPhoneFor, isOwnVerifiedPhone } from './_lib/visibility';
import { canCreateRequest } from './rules/limits';
import { distanceKm, insideBangladesh } from './rules/places';
import {
  checkClientId,
  checkComponent,
  checkNeededBy,
  checkNote,
  checkPatientName,
  checkPlace,
  checkRequestGroup,
  checkUnits,
  checkWard,
  roundPoint,
  SLUG_LENGTH,
  slugFromBytes,
  urgencyOf,
} from './rules/request';
import { contactExpiry } from './rules/responses';
import { dhakaMonthStart } from './rules/time';
import { checkPhone, type Checked } from './rules/validation';
import { component, lang, requestGroup } from './schema';

/** Statuses that count as "open" for S-22 (a covered request can still need more bags). */
const OPEN_STATUSES = ['live', 'covered'] as const;
const ALL_STATUSES = ['live', 'covered', 'closed'] as const;

function must<T>(result: Checked<T>): T {
  if (!result.ok) throw validationError(result.error);
  return result.value;
}

/** Open requests now, and requests created since 00:00 on the 1st of this month (Dhaka) — both by index. */
async function requestCounts(ctx: MutationCtx, requesterId: Id<'profiles'>, now: number) {
  const count = async (status: Doc<'requests'>['status'], since?: number) =>
    (
      await ctx.db
        .query('requests')
        .withIndex('by_requester_status', (q) => {
          const mine = q.eq('requesterId', requesterId).eq('status', status);
          return since === undefined ? mine : mine.gte('_creationTime', since);
        })
        .collect()
    ).length;
  const monthStart = dhakaMonthStart(now);
  const [open, thisMonth] = await Promise.all([
    Promise.all(OPEN_STATUSES.map((status) => count(status))),
    Promise.all(ALL_STATUSES.map((status) => count(status, monthStart))),
  ]);
  const sum = (values: number[]) => values.reduce((total, value) => total + value, 0);
  return { open: sum(open), thisMonth: sum(thisMonth) };
}

async function uniqueSlug(ctx: MutationCtx): Promise<string> {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const slug = slugFromBytes(randomBytes(SLUG_LENGTH));
    const taken = await ctx.db
      .query('requests')
      .withIndex('by_publicSlug', (q) => q.eq('publicSlug', slug))
      .first();
    if (!taken) return slug;
  }
  throw appError('ERR_INTERNAL');
}

/** Where the request is: the chosen hospital, or the chosen thana (its centre, or the rounded point sent). */
async function resolvePlace(
  ctx: MutationCtx,
  caller: { isDemo: boolean },
  args: {
    hospitalId?: Id<'hospitals'>;
    divisionId: Id<'places'>;
    districtId: Id<'places'>;
    upazilaId: Id<'places'>;
    placeText?: string;
    approxLat?: number;
    approxLng?: number;
  },
) {
  const { placeText } = must(checkPlace(args));
  if (args.hospitalId) {
    const hospital: Doc<'hospitals'> | null = await ctx.db.get(args.hospitalId);
    if (!hospital || !hospital.active) throw validationError({ field: 'place', messageKey: 'validation.VAL-07.empty' });
    assertSameArea(caller, hospital);
    const point = roundPoint(hospital);
    return {
      hospitalId: hospital._id,
      divisionId: hospital.divisionId,
      districtId: hospital.districtId,
      upazilaId: hospital.upazilaId,
      ...(placeText ? { placeText } : {}),
      approxLat: point.lat,
      approxLng: point.lng,
    };
  }
  const upazila = await checkPlaceChain(ctx, args, { field: 'place', messageKey: 'validation.VAL-07.empty' });
  const sent =
    args.approxLat !== undefined && args.approxLng !== undefined && insideBangladesh(args.approxLat, args.approxLng)
      ? { lat: args.approxLat, lng: args.approxLng }
      : upazila;
  const point = roundPoint(sent);
  return {
    divisionId: args.divisionId,
    districtId: args.districtId,
    upazilaId: args.upazilaId,
    placeText,
    approxLat: point.lat,
    approxLng: point.lng,
  };
}

/**
 * Post a request (SCR-M02). Called again with the same `clientId` (a retry after a dropped connection) it returns the
 * first request instead of making a second one.
 */
export const create = memberMutation({
  args: {
    clientId: v.string(),
    bloodGroup: requestGroup,
    component,
    isDengue: v.boolean(),
    unitsNeeded: v.number(),
    hospitalId: v.optional(v.id('hospitals')),
    divisionId: v.id('places'),
    districtId: v.id('places'),
    upazilaId: v.id('places'),
    placeText: v.optional(v.string()),
    approxLat: v.optional(v.number()),
    approxLng: v.optional(v.number()),
    neededBy: v.number(),
    contactPhone: v.string(),
    patientName: v.optional(v.string()),
    ward: v.optional(v.string()),
    note: v.optional(v.string()),
    // A volunteer posting from a public post uses its own function (P3, SCR-V…), never this one.
    source: v.union(v.literal('form'), v.literal('voice'), v.literal('text'), v.literal('paste')),
    aiAssisted: v.boolean(),
    lang,
  },
  handler: async (ctx, args) => {
    const { caller } = ctx;
    const clientId = must(checkClientId(args.clientId));
    const earlier = await ctx.db
      .query('requests')
      .withIndex('by_clientId', (q) => q.eq('clientId', clientId))
      .first();
    if (earlier) {
      if (earlier.requesterId !== caller.profile._id) throw appError('ERR_FORBIDDEN');
      return { requestId: earlier._id, existing: true };
    }

    const now = Date.now();
    const bloodGroup = must(checkRequestGroup(args.bloodGroup));
    const chosenComponent = must(checkComponent(bloodGroup, args.component));
    const unitsNeeded = must(checkUnits(args.unitsNeeded));
    const neededBy = must(checkNeededBy(args.neededBy, now));
    const contactPhone = must(checkPhone(args.contactPhone, 'contactPhone'));
    const patientName = must(checkPatientName(args.patientName));
    const ward = must(checkWard(args.ward));
    const note = must(checkNote(args.note));
    const place = await resolvePlace(ctx, caller, args);

    const settings = await getSettings(ctx);
    const limit = canCreateRequest(
      { phoneVerified: caller.profile.phoneVerified, volunteer: caller.role !== 'member' },
      await requestCounts(ctx, caller.profile._id, now),
      settings,
    );
    if (!limit.ok)
      throw limit.code === 'ERR_OPEN_REQUEST_LIMIT' ? appError(limit.code, limit.params) : appError(limit.code);

    const requestId = await ctx.db.insert('requests', {
      requesterId: caller.profile._id,
      source: args.source,
      clientId,
      bloodGroup,
      component: chosenComponent,
      isDengue: args.isDengue,
      unitsNeeded,
      unitsConfirmed: 0,
      ...place,
      neededBy,
      urgency: urgencyOf(neededBy, now),
      ...(patientName ? { patientName } : {}),
      ...(ward ? { ward } : {}),
      ...(note ? { note } : {}),
      contactPhone,
      contactPhoneVerified: isOwnVerifiedPhone(caller.profile, contactPhone),
      lang: args.lang,
      publicSlug: await uniqueSlug(ctx),
      status: 'live',
      wave: 0,
      volunteerShownIds: [],
      fallbackShown: false,
      zeroEligibleAtPublish: false,
      verifiedBadge: false,
      slipStatus: 'none',
      revealsFrozen: false,
      hiddenByModerator: false,
      aiAssisted: args.aiAssisted,
      isDemo: caller.isDemo,
    });
    await logEvent(ctx, {
      name: 'request_published',
      isDemo: caller.isDemo,
      requestId,
      actorRole: caller.role,
      props: { aiAssisted: args.aiAssisted, source: args.source },
    });
    await ctx.scheduler.runAfter(0, internal.matching.startRequest, { requestId });
    return { requestId, existing: false };
  },
});

type Owner = { profile: Doc<'profiles'>; isDemo: boolean };

/** The caller's own request. Anyone else's (or one across the practice / real line) is simply not found. */
async function ownRequest(ctx: QueryCtx, requestId: Id<'requests'>, caller: Owner): Promise<Doc<'requests'>> {
  const request = await ctx.db.get(requestId);
  if (!request || request.requesterId !== caller.profile._id || request.isDemo !== caller.isDemo)
    throw appError('ERR_NOT_FOUND');
  return request;
}

/** SCR-M03's search progress: everyone alerted, who saw it, who said yes, who holds a slot. */
function progressOf(responses: Doc<'responses'>[]) {
  return {
    notified: responses.length,
    opened: responses.filter((r) => r.openedAt !== undefined || r.state !== 'notified').length,
    accepted: responses.filter((r) => r.acceptedAt !== undefined).length,
    confirmed: responses.filter((r) => r.state === 'confirmed').length,
  };
}

/**
 * `requests.getForOwner` 📞 (SCR-M03) — live status for the requester: progress counts and one card per confirmed
 * donor. A donor's number comes only through `confirmedDonorPhoneFor` (a live reveal; none for "I'll call them").
 * After S-13 without a "yes" it flags the helpline (`fallbackShown`; the number is fetched on tap, D-R3, so it is not
 * in this answer); when no donor matched at publish it adds the district's blood banks (F-504). Volunteers come in P3.
 */
export const getForOwner = memberQuery({
  args: { requestId: v.id('requests') },
  handler: async (ctx, { requestId }) => {
    const { caller } = ctx;
    const request = await ownRequest(ctx, requestId, caller);
    const now = Date.now();
    const point = { lat: request.approxLat, lng: request.approxLng };
    const [names, responses] = await Promise.all([
      requestPlaceNames(ctx, request),
      ctx.db
        .query('responses')
        .withIndex('by_request_state', (q) => q.eq('requestId', request._id))
        .collect(),
    ]);
    const confirmed = responses
      .filter((r) => r.state === 'confirmed')
      .sort((a, b) => (a.confirmedAt ?? 0) - (b.confirmedAt ?? 0));
    const confirmedDonors = [];
    for (const response of confirmed) {
      const [donorProfile, profile] = await Promise.all([
        ctx.db.get(response.donorProfileId),
        ctx.db.get(response.donorId),
      ]);
      if (!donorProfile || !profile) continue;
      const home = await ctx.db.get(donorProfile.upazilaId);
      const phone = await confirmedDonorPhoneFor(ctx, caller.profile, profile, request, now);
      confirmedDonors.push({
        responseId: response._id,
        firstName: profile.firstName,
        group: donorProfile.bloodGroup,
        area: { en: home?.nameEn ?? '', bn: home?.nameBn ?? '' },
        km: home ? roundKm(distanceKm(home, point)) : null,
        phone: phone ?? null,
        callMode: response.callMode,
      });
    }
    const live = request.status === 'live';
    // F-504: told at once when no donor matches at all, with the helpline and the district's blood banks.
    const noDonors = live && request.zeroEligibleAtPublish;
    return {
      request: {
        requestId: request._id,
        status: request.status,
        closeReason: request.closeReason ?? null,
        bloodGroup: request.bloodGroup,
        component: request.component,
        isDengue: request.isDengue,
        unitsNeeded: request.unitsNeeded,
        unitsConfirmed: request.unitsConfirmed,
        neededBy: request.neededBy,
        createdAt: request._creationTime,
        verified: request.verifiedBadge,
        phoneVerified: request.contactPhoneVerified,
        place: names.place,
        area: names.area,
        patientName: request.patientName ?? null,
        ward: request.ward ?? null,
        note: request.note ?? null,
      },
      progress: progressOf(responses),
      wave: request.wave,
      nextWaveAt: request.nextWaveAt ?? null,
      confirmedDonors,
      /** No donor said yes within S-13 → the helpline button (fetched on tap, D-R3). Volunteers join this in P3. */
      fallbackShown: live && request.fallbackShown,
      noDonors: { show: noDonors, bloodBanks: noDonors ? await bloodBanksNear(ctx, request) : [] },
      revealsFrozen: request.revealsFrozen,
      /** Shows CMP-PracticeBadge (specs §1.9). */
      practice: request.isDemo,
    };
  },
});

/**
 * `requests.listMine` (SCR-M04) — the caller's requests, newest first. In `by_requester_status` the statuses sort
 * closed < covered < live, so "active" is the range after `closed` (live first, then covered).
 */
export const listMine = memberQuery({
  args: { status: v.union(v.literal('active'), v.literal('closed')), paginationOpts: paginationOptsValidator },
  handler: async (ctx, { status, paginationOpts }) => {
    const { caller } = ctx;
    const requesterId = caller.profile._id;
    const result = await ctx.db
      .query('requests')
      .withIndex('by_requester_status', (q) =>
        status === 'active'
          ? q.eq('requesterId', requesterId).gt('status', 'closed')
          : q.eq('requesterId', requesterId).eq('status', 'closed'),
      )
      .order('desc')
      .paginate(paginationOpts);
    const page = [];
    for (const request of result.page) {
      if (request.isDemo !== caller.isDemo) continue;
      const names = await requestPlaceNames(ctx, request);
      page.push({
        requestId: request._id,
        bloodGroup: request.bloodGroup,
        component: request.component,
        isDengue: request.isDengue,
        status: request.status,
        closeReason: request.closeReason ?? null,
        unitsNeeded: request.unitsNeeded,
        unitsConfirmed: request.unitsConfirmed,
        neededBy: request.neededBy,
        createdAt: request._creationTime,
        place: names.place,
        area: names.area,
      });
    }
    return { ...result, page };
  },
});

/** Donors still deciding, or on standby, are told it is no longer needed (NTF-09). */
const STILL_WAITING = ['notified', 'opened', 'standby'] as const;

/**
 * `requests.close` (F-501, SCR-M03) — "All bags arranged" or "No longer needed". Matching jobs re-check the status
 * before they act, so a closed request sends no further wave. Contact details stay visible S-18 days from now.
 * Volunteer and admin closing join with their roles (P3, P5); the donation-confirmation prompt is P2.
 */
export const close = memberMutation({
  args: { requestId: v.id('requests'), reason: v.union(v.literal('fulfilled'), v.literal('not_needed')) },
  handler: async (ctx, { requestId, reason }) => {
    const { caller } = ctx;
    const request = await ownRequest(ctx, requestId, caller);
    if (request.status === 'closed') throw appError('ERR_REQUEST_CLOSED');
    const now = Date.now();
    const settings = await getSettings(ctx);
    await ctx.db.patch(request._id, { status: 'closed', closeReason: reason, closedAt: now, nextWaveAt: undefined });

    // Reveals only ever get shorter here: a number that has already stopped showing never comes back.
    const expiresAt = contactExpiry({ neededBy: request.neededBy, closedAt: now }, now, settings);
    const reveals = await ctx.db
      .query('contactReveals')
      .withIndex('by_request', (q) => q.eq('requestId', request._id))
      .collect();
    for (const reveal of reveals)
      if (reveal.reason === 'confirmed_slot' && reveal.expiresAt > expiresAt)
        await ctx.db.patch(reveal._id, { expiresAt });

    if (request.bloodGroup !== 'not_sure') {
      const group = request.bloodGroup;
      const names = await requestPlaceNames(ctx, request);
      for (const state of STILL_WAITING) {
        const waiting = await ctx.db
          .query('responses')
          .withIndex('by_request_state', (q) => q.eq('requestId', request._id).eq('state', state))
          .collect();
        for (const response of waiting) {
          const donor = await ctx.db.get(response.donorId);
          if (!donor) continue;
          const place = names.place[donor.language] || names.area[donor.language];
          await sendAlert(ctx, {
            recipientId: donor._id,
            template: 'NTF-09',
            requestId: request._id,
            ...noLongerNeededText(group, place, donor.language),
            url: `/alerts/${request._id}`,
            androidChannel: 'updates',
            isDemo: request.isDemo,
          });
        }
      }
    }

    await logEvent(ctx, {
      name: 'request_closed',
      isDemo: request.isDemo,
      requestId: request._id,
      actorRole: caller.role,
      props: { reason },
    });
    return null;
  },
});
