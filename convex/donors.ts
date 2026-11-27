/**
 * Donors — specs §6.3 `donors.getMine`, `donors.upsert`, `donors.setAvailability` (SCR-D01, SCR-D02, story D01).
 *
 * A donor profile is saved even when it cannot be live yet ("I don't know my group", phone not verified); `live`
 * follows `convex/rules/donor.ts` and only live donors are ever matched. Setting up again (to add the group, move,
 * or record a new donation date) uses `upsert` too; availability and alert settings survive it.
 */
import { v } from 'convex/values';

import type { Doc } from './_generated/dataModel';
import { donorMutation, memberMutation, memberQuery } from './_lib/auth';
import { donorLive, donorProfileOf, refreshDonorLive } from './_lib/donors';
import { appError, validationError } from './_lib/errors';
import { logEvent } from './_lib/events';
import { checkPlaceChain } from './_lib/places';
import { getSettings } from './_lib/settings';
import { computeEligibility, type DonationHistory } from './rules/eligibility';
import { dhakaDate } from './rules/time';
import { checkDonorChecklist, checkLastDonation, checkShortText, type Checked } from './rules/validation';
import { bloodGroup, callMode, component } from './schema';

function valueOf<T>(checked: Checked<T>): T {
  if (!checked.ok) throw validationError(checked.error);
  return checked.value;
}

/** What SCR-D02 needs to fill the form again, and what SCR-D01 shows. Never a phone number. */
function ownDonor(donor: Doc<'donorProfiles'>) {
  return {
    bloodGroup: donor.bloodGroup,
    gender: donor.gender,
    divisionId: donor.divisionId,
    districtId: donor.districtId,
    upazilaId: donor.upazilaId,
    areaText: donor.areaText ?? null,
    institution: donor.institution ?? null,
    travelRange: donor.travelRange,
    neverDonated: donor.neverDonated,
    lastDonationDate: donor.lastDonationDate ?? null,
    lastDonationType: donor.lastDonationType ?? null,
    plateletOptIn: donor.plateletOptIn,
    callMode: donor.callMode,
    availability: donor.availability,
    pausedUntil: donor.pausedUntil ?? null,
    hidden: donor.hidden,
  };
}

/** SCR-D01: the caller's donor profile with eligibility and why it is not live; null before donor setup. */
export const getMine = memberQuery({
  args: {},
  handler: async (ctx) => {
    const donor = await donorProfileOf(ctx, ctx.caller.profile._id);
    if (!donor) return null;
    const state = await donorLive(ctx, ctx.caller.profile, donor);
    return {
      donor: ownDonor(donor),
      eligibleFrom: donor.eligibleFrom,
      eligibleFromPlatelets: donor.eligibleFromPlatelets,
      ...state,
    };
  },
});

/** SCR-D02 "Start receiving requests". */
export const upsert = memberMutation({
  args: {
    bloodGroup: v.union(bloodGroup, v.literal('unknown')),
    gender: v.union(v.literal('male'), v.literal('female'), v.literal('other'), v.literal('unspecified')),
    divisionId: v.id('places'),
    districtId: v.id('places'),
    upazilaId: v.id('places'),
    areaText: v.optional(v.string()),
    institution: v.optional(v.string()),
    travelRange: v.union(v.literal('thana'), v.literal('district')),
    neverDonated: v.boolean(),
    lastDonationDate: v.optional(v.string()),
    lastDonationType: v.optional(component),
    plateletOptIn: v.boolean(),
    callMode,
    checklist: v.object({
      weight: v.boolean(),
      health: v.boolean(),
      screening: v.boolean(),
    }),
    healthConsentVersion: v.string(),
  },
  handler: async (ctx, args) => {
    const { profile, isDemo } = ctx.caller;
    const settings = await getSettings(ctx);
    const now = Date.now();

    valueOf(checkDonorChecklist(args.checklist));
    const lastDonationDate = valueOf(checkLastDonation(args.neverDonated, args.lastDonationDate, dhakaDate(now)));
    const areaText = valueOf(checkShortText(args.areaText, 'areaText'));
    const institution = valueOf(checkShortText(args.institution, 'institution'));
    await checkPlaceChain(ctx, args, { field: 'upazilaId', messageKey: 'validation.VAL-14a.invalid' });
    // The health-data consent is part of the current legal version (X08); an old screen cannot accept an old text.
    if (args.healthConsentVersion !== settings.consentVersion) throw appError('ERR_CONSENT_REQUIRED');

    // A date without a type counts as whole blood — the longer, safer interval (rules/eligibility.ts).
    const lastDonationType = lastDonationDate !== undefined ? (args.lastDonationType ?? 'whole_blood') : undefined;
    const history: DonationHistory = {
      gender: args.gender,
      neverDonated: args.neverDonated,
      ...(lastDonationDate !== undefined ? { lastDonationDate, lastDonationType } : {}),
    };
    const fields = {
      bloodGroup: args.bloodGroup,
      gender: args.gender,
      divisionId: args.divisionId,
      districtId: args.districtId,
      upazilaId: args.upazilaId,
      travelRange: args.travelRange,
      neverDonated: args.neverDonated,
      plateletOptIn: args.plateletOptIn,
      callMode: args.callMode,
      ...computeEligibility(history, settings),
      selfCheckAt: now,
      healthConsentVersion: args.healthConsentVersion,
    };
    const optional = {
      areaText,
      institution,
      lastDonationDate,
      lastDonationType,
    };

    const existing = await donorProfileOf(ctx, profile._id);
    if (existing) {
      // `undefined` removes a field the person cleared.
      await ctx.db.patch(existing._id, { ...fields, ...optional });
    } else {
      await ctx.db.insert('donorProfiles', {
        profileId: profile._id,
        ...fields,
        ...Object.fromEntries(Object.entries(optional).filter(([, value]) => value !== undefined)),
        availability: 'available',
        availabilityConfirmedAt: now,
        volunteersMayCall: false,
        verifiedRequestsOnly: false,
        alertCapPerDay: settings.donorAlertCapPerDay,
        quietStart: settings.quietHours.start,
        quietEnd: settings.quietHours.end,
        urgentOverride: false,
        hidden: false,
        live: false,
        noShowAt: [],
        isDemo,
      });
    }

    const accepted = await ctx.db
      .query('consents')
      .withIndex('by_profile_kind', (q) => q.eq('profileId', profile._id).eq('kind', 'donor_health_contact'))
      .collect();
    if (!accepted.some((row) => row.version === args.healthConsentVersion)) {
      await ctx.db.insert('consents', {
        profileId: profile._id,
        kind: 'donor_health_contact',
        version: args.healthConsentVersion,
        lang: profile.language,
        acceptedAt: now,
      });
    }

    const state = await refreshDonorLive(ctx, profile._id);
    if (!state) throw appError('ERR_INTERNAL');
    return state;
  },
});

/**
 * SCR-D01 status card. P1 offers Available / Not available; "Paused until" (VAL-20) arrives with availability pause
 * (roadmap P1 out of scope).
 */
export const setAvailability = donorMutation({
  args: {
    availability: v.union(v.literal('available'), v.literal('unavailable')),
  },
  handler: async (ctx, { availability }) => {
    const { donor, caller } = ctx;
    if (donor.availability !== availability) {
      await ctx.db.patch(donor._id, {
        availability,
        pausedUntil: undefined,
        availabilityConfirmedAt: Date.now(),
      });
      await logEvent(ctx, {
        name: 'availability_changed',
        isDemo: donor.isDemo,
        actorRole: caller.role,
        props: { state: availability },
      });
    }
    return null;
  },
});
