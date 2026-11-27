/**
 * Accounts — specs §6.1. `profiles.me` (P0) and `profiles.completeOnboarding` (P1, SCR-O03); edits and deletion
 * come in P3.
 */
import { v } from 'convex/values';

import { memberMutationWith, signedInMutation, signedInQuery } from './_lib/auth';
import { writeAudit } from './_lib/audit';
import { appError, validationError } from './_lib/errors';
import { logEvent } from './_lib/events';
import { checkSignupLimit } from './_lib/rateLimits';
import { getSettings } from './_lib/settings';
import { ownPhone } from './_lib/visibility';
import { DAY_MS, dhakaDate } from './rules/time';
import { checkDateOfBirth, checkName, checkPhone, firstNameOf } from './rules/validation';
import { lang } from './schema';

export const me = signedInQuery({
  args: {},
  handler: async (ctx) => {
    const { profile } = ctx.signedIn;
    const { consentVersion, deletionDays } = await getSettings(ctx);
    if (!profile) {
      return {
        profile: null,
        donor: null,
        volunteer: null,
        needsConsent: true,
        flags: { needsOnboarding: true, isDemo: false, phoneVerified: false, isDonor: false, isVolunteer: false },
      };
    }

    const donor = await ctx.db
      .query('donorProfiles')
      .withIndex('by_profile', (q) => q.eq('profileId', profile._id))
      .unique();
    const volunteer = await ctx.db
      .query('volunteerProfiles')
      .withIndex('by_profile', (q) => q.eq('profileId', profile._id))
      .unique();

    return {
      profile: {
        _id: profile._id,
        name: profile.name,
        firstName: profile.firstName,
        dateOfBirth: profile.dateOfBirth,
        language: profile.language,
        role: profile.role,
        phone: ownPhone(profile),
        phoneVerified: profile.phoneVerified,
        status: profile.status,
        statusUntil: profile.statusUntil ?? null,
        // The person's own account: the admin's reason for a suspension or ban is shown to them (SCR-O06).
        statusReason: profile.statusReason ?? null,
        deletionRequestedAt: profile.deletionRequestedAt ?? null,
        // When personal data is removed (S-27), so SCR-O06 never computes rule numbers on the device.
        deletionDueAt: profile.deletionRequestedAt ? profile.deletionRequestedAt + deletionDays * DAY_MS : null,
        practiceId: profile.practiceId ?? null,
        isDemo: profile.isDemo,
      },
      donor: donor
        ? {
            _id: donor._id,
            bloodGroup: donor.bloodGroup,
            availability: donor.availability,
            pausedUntil: donor.pausedUntil ?? null,
            live: donor.live,
            hidden: donor.hidden,
            plateletOptIn: donor.plateletOptIn,
            eligibleFrom: donor.eligibleFrom,
            eligibleFromPlatelets: donor.eligibleFromPlatelets,
          }
        : null,
      volunteer: volunteer ? { _id: volunteer._id, status: volunteer.status, onDuty: volunteer.onDuty } : null,
      needsConsent: profile.consentVersion !== consentVersion,
      flags: {
        needsOnboarding: false,
        isDemo: profile.isDemo,
        phoneVerified: profile.phoneVerified,
        isDonor: donor !== null,
        isVolunteer: volunteer?.status === 'approved',
      },
    };
  },
});

/** Campaign codes are short ids from a QR/link (`?c=`); anything else is ignored, never an error (V07). */
const CAMPAIGN_CODE = /^[A-Za-z0-9_-]{1,32}$/;

/**
 * SCR-O03 → `{result: "ok" | "underage"}`. Re-runs VAL-01/02/03 on the server, stores the consent the person gave on
 * the welcome screen (`consents` row + audit `consent_accepted`), and blocks under-18s (G-13).
 *
 * - Already onboarded → the stored result, nothing changes (a double tap or a retry after a lost reply is harmless).
 * - Under 18 → `status: "underage_blocked"`. Only the date of birth is kept, as the reason for the block; the name and
 *   number of a child are not stored and no consent is recorded (a minor cannot give it) — Q-013.
 * - The campaign code is kept only when it names an active campaign.
 * - S-25: a network creates at most `signupsPerDevicePerHour` profiles an hour → `ERR_RATE_LIMITED {minutes}`.
 */
export const completeOnboarding = signedInMutation({
  args: {
    name: v.string(),
    dateOfBirth: v.string(),
    phone: v.string(),
    language: lang,
    consentVersion: v.string(),
    consentAcceptedAt: v.number(),
    campaignCode: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<{ result: 'ok' | 'underage' }> => {
    const { authUserId, profile: existing } = ctx.signedIn;
    if (existing) return { result: existing.status === 'underage_blocked' ? 'underage' : 'ok' };

    const settings = await getSettings(ctx);
    const now = Date.now();

    const dob = checkDateOfBirth(args.dateOfBirth, dhakaDate(now), settings.minAge);
    if (!dob.ok) throw validationError(dob.error);

    if (dob.value.underage) {
      await checkSignupLimit(ctx, settings.signupsPerDevicePerHour);
      await ctx.db.insert('profiles', {
        authUserId,
        name: '',
        firstName: '',
        dateOfBirth: dob.value.dateOfBirth,
        language: args.language,
        role: 'member',
        phone: '',
        phoneVerified: false,
        status: 'underage_blocked',
        consentVersion: '',
        lastActiveAt: now,
        isDemo: false,
      });
      await logEvent(ctx, { name: 'profile_completed', isDemo: false, props: { underage: true } });
      return { result: 'underage' };
    }

    const name = checkName(args.name);
    if (!name.ok) throw validationError(name.error);
    const phone = checkPhone(args.phone);
    if (!phone.ok) throw validationError(phone.error);
    // The welcome screen showed an older notice than the one in force → read and accept again.
    if (args.consentVersion !== settings.consentVersion) throw appError('ERR_CONSENT_REQUIRED');

    let campaignCode: string | undefined;
    const code = args.campaignCode?.trim();
    if (code && CAMPAIGN_CODE.test(code)) {
      const campaign = await ctx.db
        .query('campaigns')
        .withIndex('by_code', (q) => q.eq('code', code))
        .unique();
      if (campaign?.active) campaignCode = campaign.code;
    }

    // S-25 last: a form error never uses up one of the network's sign-ups.
    await checkSignupLimit(ctx, settings.signupsPerDevicePerHour);

    const profileId = await ctx.db.insert('profiles', {
      authUserId,
      name: name.value,
      firstName: firstNameOf(name.value),
      dateOfBirth: dob.value.dateOfBirth,
      language: args.language,
      role: 'member',
      phone: phone.value,
      phoneVerified: false,
      status: 'active',
      consentVersion: settings.consentVersion,
      lastActiveAt: now,
      ...(campaignCode !== undefined ? { campaignCode } : {}),
      isDemo: false,
    });
    // The device records when the box was ticked; a clock ahead of the server never stores a future time.
    const acceptedAt = Math.min(args.consentAcceptedAt, now);
    await ctx.db.insert('consents', {
      profileId,
      kind: 'terms_privacy',
      version: settings.consentVersion,
      lang: args.language,
      acceptedAt,
    });
    await writeAudit(ctx, {
      actor: { profileId, role: 'member' },
      action: 'consent_accepted',
      targetType: 'profile',
      targetId: profileId,
      meta: { kind: 'terms_privacy', version: settings.consentVersion },
    });
    await logEvent(ctx, {
      name: 'profile_completed',
      isDemo: false,
      actorRole: 'member',
      props: { underage: false, campaign: campaignCode !== undefined },
    });
    return { result: 'ok' };
  },
});

/**
 * The language chosen in the app (specs §1.6 rule 2) — kept on the profile so notifications and helpline texts use it.
 * A preference, not an action: allowed in every account state except the under-18 block, and with an older consent.
 */
export const updateLanguage = memberMutationWith({
  statuses: ['active', 'frozen', 'suspended', 'banned', 'deletion_pending'],
  allowStaleConsent: true,
})({
  args: { language: lang },
  handler: async (ctx, { language }) => {
    const { profile } = ctx.caller;
    if (profile.language !== language) await ctx.db.patch(profile._id, { language });
    return null;
  },
});
