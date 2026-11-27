/// <reference types="vite/client" />
/**
 * convex-test harness: our schema + functions + the components they use (Better Auth, rate limiter, Expo push).
 * Helpers create a signed-in Better Auth user with a live session, like the real sign-in does.
 */
import { register as registerBetterAuth } from '@convex-dev/better-auth/test';
import { register as registerPush } from '@convex-dev/expo-push-notifications/test';
import { register as registerRateLimiter } from '@convex-dev/rate-limiter/test';
import { convexTest } from 'convex-test';

import { api, components } from './_generated/api';
import type { Doc, Id } from './_generated/dataModel';
import schema from './schema';

// Function modules + _generated, without *.config.ts, *.test.ts, type declarations or this file.
// (Convex's documented extglob `./**/!(*.*.*)*.*s` matches nothing with the Vite version used here.)
export const modules = import.meta.glob([
  './**/*.{ts,js}',
  '!./**/*.d.ts',
  '!./**/*.test.ts',
  '!./**/*.config.ts',
  '!./test.setup.ts',
]);

export function makeT() {
  const t = convexTest(schema, modules);
  registerBetterAuth(t);
  registerRateLimiter(t);
  registerPush(t);
  return t;
}

export type T = ReturnType<typeof makeT>;

const DAY = 24 * 60 * 60 * 1000;

/** Creates a Better Auth user + live session and returns a client acting as that user. */
export async function signIn(t: T, email: string) {
  const now = Date.now();
  const { userId, sessionId } = await t.run(async (ctx) => {
    const user = (await ctx.runMutation(components.betterAuth.adapter.create, {
      input: {
        model: 'user',
        data: { name: email.split('@')[0] ?? 'Test', email, emailVerified: true, createdAt: now, updatedAt: now },
      },
    })) as { _id: string };
    const session = (await ctx.runMutation(components.betterAuth.adapter.create, {
      input: {
        model: 'session',
        data: { userId: user._id, token: `token-${email}`, expiresAt: now + DAY, createdAt: now, updatedAt: now },
      },
    })) as { _id: string };
    return { userId: String(user._id), sessionId: String(session._id) };
  });
  return { userId, as: t.withIdentity({ subject: userId, sessionId }) };
}

export type ProfileOverrides = Partial<Omit<Doc<'profiles'>, '_id' | '_creationTime' | 'authUserId'>>;

/** Inserts a finished-onboarding profile for a Better Auth user (consent = current seed version). */
export async function insertProfile(
  t: T,
  authUserId: string,
  overrides: ProfileOverrides = {},
): Promise<Id<'profiles'>> {
  return t.run((ctx) =>
    ctx.db.insert('profiles', {
      authUserId,
      name: 'Rahim Uddin',
      firstName: 'Rahim',
      dateOfBirth: '1999-04-12',
      language: 'en',
      role: 'member',
      phone: '+8801712345678',
      phoneVerified: false,
      status: 'active',
      consentVersion: '2026-11-28-pilot',
      lastActiveAt: Date.now(),
      isDemo: false,
      ...overrides,
    }),
  );
}

/** Chattogram division → Chattogram district → Kotwali thana, and a second district. */
export async function insertPlaces(t: T) {
  return t.run(async (ctx) => {
    const base = {
      lat: 22.35,
      lng: 91.83,
      isMetroThana: false,
      neighbourIds: [],
    };
    const division = await ctx.db.insert('places', {
      ...base,
      level: 'division',
      code: '20',
      nameEn: 'Chattogram',
      nameBn: 'চট্টগ্রাম',
    });
    const district = await ctx.db.insert('places', {
      ...base,
      level: 'district',
      code: '2015',
      nameEn: 'Chattogram',
      nameBn: 'চট্টগ্রাম',
      parentId: division,
    });
    const upazila = await ctx.db.insert('places', {
      ...base,
      level: 'upazila',
      code: '201541',
      nameEn: 'Kotwali',
      nameBn: 'কোতোয়ালী',
      parentId: district,
      isMetroThana: true,
    });
    const otherDistrict = await ctx.db.insert('places', {
      ...base,
      level: 'district',
      code: '2022',
      nameEn: "Cox's Bazar",
      nameBn: 'কক্সবাজার',
      parentId: division,
    });
    return {
      divisionId: division,
      districtId: district,
      upazilaId: upazila,
      otherDistrict,
    };
  });
}

// ── Matching fixtures (matching, responses tests) ───────────────────────

const HOUR = 60 * 60 * 1000;

export type MatchPlaces = Awaited<ReturnType<typeof insertPlaces>> & {
  panchlaish: Id<'places'>;
  farThana: Id<'places'>;
};

/**
 * Places for matching tests: the base chain plus Panchlaish (≈ 2 km north of Kotwali) and a far thana (≈ 11 km), and
 * small waves (S-08 = [3, 5, 8]) so the tests stay readable.
 */
export async function setupMatching() {
  const t = makeT();
  const base = await insertPlaces(t);
  const more = await t.run(async (ctx) => {
    const thana = {
      level: 'upazila' as const,
      parentId: base.districtId,
      lng: 91.83,
      isMetroThana: true,
      neighbourIds: [],
    };
    return {
      panchlaish: await ctx.db.insert('places', {
        ...thana,
        code: '201557',
        nameEn: 'Panchlaish',
        nameBn: 'পাঁচলাইশ',
        lat: 22.37,
      }),
      farThana: await ctx.db.insert('places', { ...thana, code: '201599', nameEn: 'Far', nameBn: 'দূর', lat: 22.45 }),
    };
  });
  await t.run((ctx) => ctx.db.insert('settings', { key: 'waveSizes', value: [3, 5, 8] }));
  return { t, where: { ...base, ...more } as MatchPlaces };
}

let people = 0;
export type DonorOptions = Partial<
  Pick<
    Doc<'donorProfiles'>,
    'bloodGroup' | 'upazilaId' | 'districtId' | 'live' | 'availability' | 'plateletOptIn' | 'isDemo'
  >
> & {
  profile?: ProfileOverrides;
  authUserId?: string;
};

/** A live, verified, available B+ donor in Kotwali unless the options say otherwise. */
export async function donor(t: T, where: MatchPlaces, options: DonorOptions = {}) {
  people += 1;
  const { profile = {}, authUserId = `auth-donor-${people}`, ...fields } = options;
  const isDemo = fields.isDemo ?? false;
  const profileId = await insertProfile(t, authUserId, {
    name: `Donor ${people}`,
    firstName: 'Donor',
    phone: `+88017${String(people).padStart(8, '0')}`,
    phoneVerified: true,
    isDemo,
    ...profile,
  });
  const donorProfileId = await t.run((ctx) =>
    ctx.db.insert('donorProfiles', {
      profileId,
      bloodGroup: 'B+',
      gender: 'male',
      divisionId: where.divisionId,
      districtId: where.districtId,
      upazilaId: where.upazilaId,
      travelRange: 'district',
      neverDonated: true,
      plateletOptIn: false,
      availability: 'available',
      availabilityConfirmedAt: Date.now(),
      eligibleFrom: 0,
      eligibleFromPlatelets: 0,
      callMode: 'mutual',
      volunteersMayCall: false,
      verifiedRequestsOnly: false,
      alertCapPerDay: 3,
      quietStart: '00:00',
      quietEnd: '07:00',
      urgentOverride: true,
      hidden: false,
      live: true,
      selfCheckAt: Date.now(),
      healthConsentVersion: '2026-11-28-pilot',
      noShowAt: [],
      isDemo,
      ...fields,
    }),
  );
  return { profileId, donorProfileId };
}

let clients = 0;
/** `requests.create` arguments for a B+ whole-blood request in Kotwali, needed in 2 hours. */
export function requestArgs(where: MatchPlaces, overrides: Record<string, unknown> = {}) {
  clients += 1;
  return {
    clientId: `match-${String(clients).padStart(4, '0')}`,
    bloodGroup: 'B+' as const,
    component: 'whole_blood' as const,
    isDengue: false,
    unitsNeeded: 2,
    divisionId: where.divisionId,
    districtId: where.districtId,
    upazilaId: where.upazilaId,
    placeText: 'Max Hospital, Mehedibag',
    neededBy: Date.now() + 2 * HOUR,
    contactPhone: '01812345678',
    patientName: 'Amina Begum',
    source: 'form' as const,
    aiAssisted: false,
    lang: 'en' as const,
    ...overrides,
  };
}

/** Posts a request as a new signed-in requester (Karim). */
export async function postRequest(
  t: T,
  where: MatchPlaces,
  overrides: Record<string, unknown> = {},
  profile: ProfileOverrides = {},
) {
  people += 1;
  const { as, userId } = await signIn(t, `requester${people}@example.com`);
  await insertProfile(t, userId, { name: 'Karim Hossain', firstName: 'Karim', ...profile });
  const { requestId } = await as.mutation(api.requests.create, requestArgs(where, overrides));
  return { requestId, as };
}
