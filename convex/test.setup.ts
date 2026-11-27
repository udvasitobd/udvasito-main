/// <reference types="vite/client" />
/**
 * convex-test harness: our schema + functions + the components they use (Better Auth, rate limiter).
 * Helpers create a signed-in Better Auth user with a live session, like the real sign-in does.
 */
import { register as registerBetterAuth } from '@convex-dev/better-auth/test';
import { register as registerRateLimiter } from '@convex-dev/rate-limiter/test';
import { convexTest } from 'convex-test';

import { components } from './_generated/api';
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
