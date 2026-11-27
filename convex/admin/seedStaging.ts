/**
 * Fake data for STAGING ONLY — `npm run seed:staging` (scripts/seed-staging.ts). Refuses to run unless the
 * deployment's SITE_URL is a staging or local address (convex/rules/environment.ts), so it can never touch
 * production (CLAUDE.md rule 17, specs §1.9).
 *
 * Donors across all 8 groups and every Chattogram upazila / metropolitan thana. Fake donors:
 * - phone numbers use the unallocated prefix +88010, so a tester who calls one can never reach a real person;
 * - names are "Test Donor <n>"; they have no sign-in (authUserId `staging-seed:…`);
 * - all are first-time donors (eligible now) until the P1 eligibility rules exist.
 * Idempotent: a donor that already exists is left as it is.
 */
import { v } from 'convex/values';

import { internalMutation } from '../_generated/server';
import { deploymentEnvironment } from '../_lib/environment';
import { getSettings } from '../_lib/settings';

export const STAGING_GROUPS = ['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'] as const;

/** Unallocated Bangladesh mobile prefix (operators use 013–019). */
export const FAKE_PHONE_PREFIX = '+88010';

const PILOT_DISTRICT_EN = 'Chattogram';

export const seedDonors = internalMutation({
  args: { perGroupPerPlace: v.optional(v.number()) },
  handler: async (ctx, { perGroupPerPlace = 1 }) => {
    if (deploymentEnvironment() !== 'staging') throw new Error('seed:staging refuses to run on production');
    if (!Number.isInteger(perGroupPerPlace) || perGroupPerPlace < 1 || perGroupPerPlace > 5) {
      throw new Error('perGroupPerPlace must be 1–5');
    }
    const settings = await getSettings(ctx);
    const district = (
      await ctx.db
        .query('places')
        .withIndex('by_level_parent', (q) => q.eq('level', 'district'))
        .collect()
    ).find((d) => d.nameEn === PILOT_DISTRICT_EN);
    if (!district?.parentId) throw new Error('Chattogram is not loaded — run `npm run seed:places` first');
    const upazilas = (
      await ctx.db
        .query('places')
        .withIndex('by_level_parent', (q) => q.eq('level', 'upazila').eq('parentId', district._id))
        .collect()
    ).sort((a, b) => a.code.localeCompare(b.code));

    const now = Date.now();
    let inserted = 0;
    let kept = 0;
    let n = 0;
    for (const upazila of upazilas) {
      for (const group of STAGING_GROUPS) {
        for (let i = 0; i < perGroupPerPlace; i++) {
          n++;
          const authUserId = `staging-seed:${upazila.code}:${group}:${i}`;
          const existing = await ctx.db
            .query('profiles')
            .withIndex('by_authUserId', (q) => q.eq('authUserId', authUserId))
            .unique();
          if (existing) {
            kept++;
            continue;
          }
          const profileId = await ctx.db.insert('profiles', {
            authUserId,
            name: `Test Donor ${n}`,
            firstName: 'Test',
            dateOfBirth: `${1966 + (n % 40)}-0${1 + (n % 9)}-15`,
            language: n % 2 === 0 ? 'bn' : 'en',
            role: 'member',
            phone: `${FAKE_PHONE_PREFIX}${String(n).padStart(8, '0')}`,
            phoneVerified: true,
            phoneVerifiedAt: now,
            phoneVerifiedVia: 'in_person',
            status: 'active',
            consentVersion: settings.consentVersion,
            lastActiveAt: now - (n % 30) * 24 * 60 * 60 * 1000,
            isDemo: false,
          });
          await ctx.db.insert('donorProfiles', {
            profileId,
            bloodGroup: group,
            gender: n % 3 === 0 ? 'female' : 'male',
            divisionId: district.parentId,
            districtId: district._id,
            upazilaId: upazila._id,
            travelRange: n % 4 === 0 ? 'district' : 'thana',
            neverDonated: true,
            plateletOptIn: n % 5 === 0,
            availability: 'available',
            availabilityConfirmedAt: now,
            eligibleFrom: 0,
            eligibleFromPlatelets: 0,
            callMode: n % 6 === 0 ? 'donor_calls' : 'mutual',
            volunteersMayCall: false,
            verifiedRequestsOnly: false,
            alertCapPerDay: settings.donorAlertCapPerDay,
            quietStart: settings.quietHours.start,
            quietEnd: settings.quietHours.end,
            urgentOverride: false,
            hidden: false,
            live: true,
            selfCheckAt: now,
            healthConsentVersion: settings.consentVersion,
            noShowAt: [],
            isDemo: false,
          });
          inserted++;
        }
      }
    }
    return { inserted, kept, places: upazilas.length, groups: STAGING_GROUPS.length };
  },
});
