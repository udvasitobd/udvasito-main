/**
 * Blood requests — specs §6.2. P1 slice 8: `requests.create` (SCR-M02 form path). Matching starts in slice 9.
 *
 * The contact number is checked (VAL-03) and stored; it is never put in events, logs or errors (CLAUDE.md rule 3)
 * and is read back only through `_lib/visibility.ts`.
 */
import { v } from 'convex/values';

import type { Doc, Id } from './_generated/dataModel';
import type { MutationCtx } from './_generated/server';
import { assertSameArea, memberMutation } from './_lib/auth';
import { appError, validationError } from './_lib/errors';
import { logEvent } from './_lib/events';
import { checkPlaceChain } from './_lib/places';
import { randomBytes } from './_lib/random';
import { getSettings } from './_lib/settings';
import { isOwnVerifiedPhone } from './_lib/visibility';
import { canCreateRequest } from './rules/limits';
import { insideBangladesh } from './rules/places';
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
    return { requestId, existing: false };
  },
});
