/**
 * A donor's side of a request — specs §6.3, SCR-D03 / SCR-D04: the inbox, opening an alert, the request as a donor
 * sees it, and the answer (accept / decline). Before confirmation a donor sees the group, component, place, area,
 * distance, time, note (phone numbers masked) and badges — never a phone number, the requester's name or the
 * patient's name. A confirmed donor also gets the requester's first name and contact number (through
 * `_lib/visibility.ts`), the patient's name and ward.
 *
 * Not in P1 (build prompt): still-coming checks, withdrawing, report & block, the offline outbox.
 */
import { v } from 'convex/values';

import type { Doc, Id } from './_generated/dataModel';
import type { QueryCtx } from './_generated/server';
import { donorConfirmedText, roundKm } from './_lib/alertText';
import { donorMutation, donorQuery, memberQuery } from './_lib/auth';
import { donorProfileOf, isLiveNow } from './_lib/donors';
import { appError, validationError } from './_lib/errors';
import { logEvent } from './_lib/events';
import { sendAlert } from './_lib/push';
import { requestPlaceNames, type Named } from './_lib/requestPlace';
import { getSettings } from './_lib/settings';
import { grantReveal, requestContactFor } from './_lib/visibility';
import { scrubText } from '../src/lib/scrub';
import { computeEligibility, type DonationHistory } from './rules/eligibility';
import { distanceKm } from './rules/places';
import { checkClientId } from './rules/request';
import {
  canAnswer,
  contactExpiry,
  laterDonation,
  slotFor,
  unitsCovered,
  whyNotEligible,
  type NotEligible,
} from './rules/responses';
import { dhakaDate } from './rules/time';
import { checkLastDonation, type Checked } from './rules/validation';
import { callMode } from './schema';

/** SCR-D03 lists these states; declined, withdrew and not_responding drop out of the list. */
const LISTED = ['notified', 'opened', 'accepted', 'confirmed', 'standby'] as const;
type ListedState = (typeof LISTED)[number];

export type InboxItem = {
  requestId: Id<'requests'>;
  state: ListedState;
  notifiedAt: number;
  bloodGroup: Doc<'requests'>['bloodGroup'];
  component: Doc<'requests'>['component'];
  urgency: Doc<'requests'>['urgency'];
  place: Named;
  area: Named;
  /** From the donor's thana centre to the hospital; null when the donor profile is gone. */
  km: number | null;
  neededBy: number;
  verified: boolean;
  /** Closed, or removed by a moderator: shown greyed as "No longer needed". */
  closed: boolean;
};

const newestFirst = (a: InboxItem, b: InboxItem) => b.notifiedAt - a.notifiedAt;

/**
 * `responses.inbox` — Needs your answer (notified / opened), You said yes (accepted / confirmed / standby), Earlier
 * (any of those on a request that is no longer needed); newest first. A member who is not a donor gets empty lists.
 * A request a moderator removed is left out: it cannot be opened any more (`visibleRequest`).
 */
export const inbox = memberQuery({
  args: {},
  handler: async (ctx) => {
    const me = ctx.caller.profile;
    const rows: Doc<'responses'>[] = [];
    for (const state of LISTED) {
      rows.push(
        ...(await ctx.db
          .query('responses')
          .withIndex('by_donor_state', (q) => q.eq('donorId', me._id).eq('state', state))
          .collect()),
      );
    }
    const donor = await donorProfileOf(ctx, me._id);
    const home = donor ? await ctx.db.get(donor.upazilaId) : null;

    const needsAnswer: InboxItem[] = [];
    const saidYes: InboxItem[] = [];
    const earlier: InboxItem[] = [];
    for (const response of rows) {
      if (response.isDemo !== me.isDemo) continue;
      const request = await ctx.db.get(response.requestId);
      if (!request || request.isDemo !== me.isDemo || request.hiddenByModerator) continue;
      const { place, area } = await requestPlaceNames(ctx, request);
      const item: InboxItem = {
        requestId: request._id,
        state: response.state as ListedState,
        notifiedAt: response.notifiedAt,
        bloodGroup: request.bloodGroup,
        component: request.component,
        urgency: request.urgency,
        place,
        area,
        km: home ? roundKm(distanceKm(home, { lat: request.approxLat, lng: request.approxLng })) : null,
        neededBy: request.neededBy,
        verified: request.verifiedBadge,
        closed: request.status === 'closed',
      };
      if (item.closed) earlier.push(item);
      else if (item.state === 'notified' || item.state === 'opened') needsAnswer.push(item);
      else saidYes.push(item);
    }
    return {
      needsAnswer: needsAnswer.sort(newestFirst),
      saidYes: saidYes.sort(newestFirst),
      earlier: earlier.sort(newestFirst),
    };
  },
});

/**
 * `responses.markOpened` — the donor opened the request (from a push or from the inbox): `notified` → `opened` once,
 * with a `notification_opened` event, and this request's alerts to the donor get `openedAt`.
 */
export const markOpened = donorMutation({
  args: { requestId: v.id('requests'), notificationId: v.optional(v.id('notifications')) },
  handler: async (ctx, { requestId, notificationId }) => {
    const response = await ctx.db
      .query('responses')
      .withIndex('by_request_donor', (q) => q.eq('requestId', requestId).eq('donorProfileId', ctx.donor._id))
      .first();
    if (!response) return null;
    const now = Date.now();
    if (response.state === 'notified') {
      await ctx.db.patch(response._id, { state: 'opened', openedAt: now });
      await logEvent(ctx, {
        name: 'notification_opened',
        isDemo: response.isDemo,
        requestId,
        props: { wave: response.wave, fromPush: notificationId !== undefined },
      });
    }
    const alerts = await ctx.db
      .query('notifications')
      .withIndex('by_request', (q) => q.eq('requestId', requestId))
      .collect();
    for (const alert of alerts) {
      if (alert.recipientId === ctx.caller.profile._id && alert.openedAt === undefined)
        await ctx.db.patch(alert._id, { openedAt: now });
    }
    return null;
  },
});

function must<T>(result: Checked<T>): T {
  if (!result.ok) throw validationError(result.error);
  return result.value;
}

/** My response to this request (by index), or ERR_NOT_FOUND: only alerted donors see a request this way. */
async function myResponse(ctx: QueryCtx, requestId: Id<'requests'>, donorProfileId: Id<'donorProfiles'>) {
  const response = await ctx.db
    .query('responses')
    .withIndex('by_request_donor', (q) => q.eq('requestId', requestId).eq('donorProfileId', donorProfileId))
    .first();
  if (!response) throw appError('ERR_NOT_FOUND');
  return response;
}

/** The request, unless it is gone, removed by a moderator or from the other area (practice / real). */
async function visibleRequest(ctx: QueryCtx, requestId: Id<'requests'>, isDemo: boolean) {
  const request = await ctx.db.get(requestId);
  if (!request || request.isDemo !== isDemo || request.hiddenByModerator) throw appError('ERR_NOT_FOUND');
  return request;
}

/** `alert.trackRecord`: member since, requests posted, donations confirmed by either side. */
async function trackRecord(ctx: QueryCtx, requester: Doc<'profiles'>) {
  let requests = 0;
  let donations = 0;
  for (const status of ['live', 'covered', 'closed'] as const) {
    const posted = await ctx.db
      .query('requests')
      .withIndex('by_requester_status', (q) => q.eq('requesterId', requester._id).eq('status', status))
      .collect();
    requests += posted.length;
    for (const request of posted) {
      const confirmed = await ctx.db
        .query('responses')
        .withIndex('by_request_state', (q) => q.eq('requestId', request._id).eq('state', 'confirmed'))
        .collect();
      donations += confirmed.filter((r) => r.outcomeDonor === 'donated' || r.outcomeRequester === 'donated').length;
    }
  }
  return { memberSince: requester._creationTime, requests, donations };
}

/**
 * `responses.getForDonor` 📞 (SCR-D04). The requester's number only for a confirmed donor with a live reveal, and
 * not while contact details are paused after a report.
 */
export const getForDonor = donorQuery({
  args: { requestId: v.id('requests') },
  handler: async (ctx, { requestId }) => {
    const response = await myResponse(ctx, requestId, ctx.donor._id);
    const request = await visibleRequest(ctx, requestId, ctx.caller.profile.isDemo);
    const now = Date.now();
    const [requester, names, home] = await Promise.all([
      ctx.db.get(request.requesterId),
      requestPlaceNames(ctx, request),
      ctx.db.get(ctx.donor.upazilaId),
    ]);
    const point = { lat: request.approxLat, lng: request.approxLng };
    const confirmed = response.state === 'confirmed';
    const phone = confirmed ? await requestContactFor(ctx, ctx.caller.profile, request, now) : undefined;
    return {
      request: {
        requestId: request._id,
        status: request.status,
        closed: request.status === 'closed',
        bloodGroup: request.bloodGroup,
        component: request.component,
        isDengue: request.isDengue,
        unitsNeeded: request.unitsNeeded,
        neededBy: request.neededBy,
        urgency: request.urgency,
        verified: request.verifiedBadge,
        phoneVerified: request.contactPhoneVerified,
        note: request.note ? scrubText(request.note) : null,
        place: names.place,
        area: names.area,
        km: home ? roundKm(distanceKm(home, point)) : null,
        /** Directions open at a listed hospital's own point; a typed place is searched by its name. */
        directionsTo: request.hospitalId ? point : null,
      },
      myResponse: { state: response.state, callMode: response.callMode, declineReason: response.declineReason ?? null },
      /** Shows CMP-PracticeBadge (specs §1.9). */
      practice: request.isDemo,
      /** The donor's saved choice, to pre-set "Share numbers" / "I'll call them". */
      defaultCallMode: ctx.donor.callMode,
      requester: confirmed && requester ? { firstName: requester.firstName, phone: phone ?? null } : null,
      patientName: confirmed ? (request.patientName ?? null) : null,
      ward: confirmed ? (request.ward ?? null) : null,
      trackRecord: requester ? await trackRecord(ctx, requester) : null,
      contactsPaused: request.revealsFrozen,
    };
  },
});

function notEligibleParams(why: NotEligible): Record<string, string | number> {
  if (why.reason === 'cooldown') return { reason: why.reason, date: dhakaDate(why.date) };
  if (why.reason === 'age') return { reason: why.reason, min: why.min, max: why.max };
  return { reason: why.reason };
}

const historyOf = (donor: Doc<'donorProfiles'>): DonationHistory => ({
  gender: donor.gender,
  neverDonated: donor.neverDonated,
  ...(donor.lastDonationDate !== undefined ? { lastDonationDate: donor.lastDonationDate } : {}),
  ...(donor.lastDonationType !== undefined ? { lastDonationType: donor.lastDonationType } : {}),
});

/**
 * `responses.accept` 🔁 — one transaction (Convex mutations are serialisable, so two donors can never take the same
 * slot): re-check the rules; confirmed while fewer than units + S-12 are confirmed, else standby. A confirmed donor
 * gets the requester's number; the requester gets the donor's number unless the donor chose "I'll call them".
 */
export const accept = donorMutation({
  args: { requestId: v.id('requests'), clientId: v.string(), selfCheck: v.literal(true), callMode },
  handler: async (ctx, args) => {
    const clientId = must(checkClientId(args.clientId));
    const { donor } = ctx;
    const profile = ctx.caller.profile;
    const response = await myResponse(ctx, args.requestId, donor._id);
    const request = await visibleRequest(ctx, args.requestId, profile.isDemo);
    // A retry of the same tap returns what the first one decided.
    if (response.acceptClientId === clientId && (response.state === 'confirmed' || response.state === 'standby')) {
      return { state: response.state, contactsPaused: request.revealsFrozen };
    }
    if (!canAnswer(response.state)) throw appError('ERR_ALREADY_RESPONDED');
    if (request.status === 'closed') throw appError('ERR_REQUEST_CLOSED');

    const settings = await getSettings(ctx);
    const now = Date.now();
    const why = whyNotEligible(
      {
        ...historyOf(donor),
        live: isLiveNow(profile, donor, now, settings),
        bloodGroup: donor.bloodGroup,
        plateletOptIn: donor.plateletOptIn,
        dateOfBirth: profile.dateOfBirth,
      },
      request,
      now,
      settings,
    );
    if (why) throw appError('ERR_NOT_ELIGIBLE', notEligibleParams(why));

    const confirmedSoFar = await ctx.db
      .query('responses')
      .withIndex('by_request_state', (q) => q.eq('requestId', request._id).eq('state', 'confirmed'))
      .collect();
    const state = slotFor(confirmedSoFar.length, request.unitsNeeded, settings);
    await ctx.db.patch(response._id, {
      state,
      acceptedAt: now,
      acceptClientId: clientId,
      callMode: args.callMode,
      ...(state === 'confirmed' ? { confirmedAt: now } : {}),
      ...(response.openedAt === undefined ? { openedAt: now } : {}),
    });
    await ctx.db.patch(donor._id, { selfCheckAt: now });
    const base = { isDemo: request.isDemo, requestId: request._id, actorRole: profile.role };
    await logEvent(ctx, { ...base, name: 'donor_accepted', props: { wave: response.wave } });
    if (state === 'standby') {
      await logEvent(ctx, { ...base, name: 'donor_standby' });
      return { state, contactsPaused: request.revealsFrozen };
    }

    const covered = unitsCovered(confirmedSoFar.length + 1, request.unitsNeeded);
    await ctx.db.patch(request._id, {
      unitsConfirmed: covered,
      // Covered: no further waves (P2); the request stays open until the family closes it.
      ...(covered >= request.unitsNeeded && request.status === 'live' ? { status: 'covered' as const } : {}),
    });
    await logEvent(ctx, { ...base, name: 'donor_confirmed' });

    const requester = await ctx.db.get(request.requesterId);
    if (!requester) return { state, contactsPaused: request.revealsFrozen };
    if (!request.revealsFrozen) {
      const reveal = { requestId: request._id, reason: 'confirmed_slot' as const };
      const expiresAt = contactExpiry(request, now, settings);
      await grantReveal(ctx, { ...reveal, viewer: profile, subject: requester, subjectRole: 'requester', expiresAt });
      if (args.callMode === 'mutual') {
        await grantReveal(ctx, { ...reveal, viewer: requester, subject: profile, subjectRole: 'donor', expiresAt });
      }
      await logEvent(ctx, { ...base, name: 'contact_shared', props: { mode: args.callMode } });
    }
    await sendAlert(ctx, {
      recipientId: requester._id,
      template: 'NTF-04',
      requestId: request._id,
      ...donorConfirmedText(profile.firstName, args.callMode, requester.language),
      url: `/request/${request._id}`,
      androidChannel: 'updates',
      isDemo: request.isDemo,
    });
    return { state, contactsPaused: request.revealsFrozen };
  },
});

const declineReason = v.union(
  v.literal('busy'),
  v.literal('far'),
  v.literal('donated'),
  v.literal('unwell'),
  v.literal('other'),
);

/**
 * `responses.decline` — "Can't this time" with an optional reason. "Donated recently" with a date updates the
 * donor's last donation (a date without a type counts as whole blood, the longer interval) and their eligibility.
 */
export const decline = donorMutation({
  args: { requestId: v.id('requests'), reason: v.optional(declineReason), donatedDate: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const { donor } = ctx;
    const response = await myResponse(ctx, args.requestId, donor._id);
    const request = await visibleRequest(ctx, args.requestId, ctx.caller.profile.isDemo);
    if (!canAnswer(response.state)) throw appError('ERR_ALREADY_RESPONDED');
    const now = Date.now();
    const donated =
      args.reason === 'donated' && args.donatedDate !== undefined
        ? must(checkLastDonation(false, args.donatedDate, dhakaDate(now)))
        : undefined;

    await ctx.db.patch(response._id, {
      state: 'declined',
      ...(args.reason !== undefined ? { declineReason: args.reason } : {}),
      ...(response.openedAt === undefined ? { openedAt: now } : {}),
    });
    if (donated !== undefined) {
      const lastDonationDate = laterDonation(donor.lastDonationDate, donated);
      const lastDonationType =
        lastDonationDate === donor.lastDonationDate ? (donor.lastDonationType ?? 'whole_blood') : 'whole_blood';
      const history: DonationHistory = {
        gender: donor.gender,
        neverDonated: false,
        lastDonationDate,
        lastDonationType,
      };
      await ctx.db.patch(donor._id, {
        neverDonated: false,
        lastDonationDate,
        lastDonationType,
        ...computeEligibility(history, await getSettings(ctx)),
      });
    }
    await logEvent(ctx, {
      name: 'donor_declined',
      isDemo: request.isDemo,
      requestId: request._id,
      actorRole: ctx.caller.profile.role,
      props: { reason: args.reason ?? null },
    });
    return null;
  },
});
