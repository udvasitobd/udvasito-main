/**
 * Accounts — specs §6.1. P0 ships `profiles.me`; onboarding, edits and deletion come in P1/P3.
 */
import { signedInQuery } from './_lib/auth';
import { getSetting } from './_lib/settings';
import { ownPhone } from './_lib/visibility';

export const me = signedInQuery({
  args: {},
  handler: async (ctx) => {
    const { profile } = ctx.signedIn;
    const consentVersion = await getSetting(ctx, 'consentVersion');
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
        deletionRequestedAt: profile.deletionRequestedAt ?? null,
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
