/**
 * S-25 (PRD §5.8, specs §6.1 `profiles.completeOnboarding` → `ERR_RATE_LIMITED`; build prompt P1 item 15): at most
 * `signupsPerDevicePerHour` new profiles per network per hour. The network is the one Better Auth stored on the
 * session at sign-in.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { api } from './_generated/api';
import { readAppError } from './_lib/errors';
import { dhakaMidnight } from './rules/time';
import { makeT, signIn, type T } from './test.setup';

const CONSENT = '2026-11-28-pilot';
/** 27 Nov 2026, 10:00 in Dhaka. */
const NOW = dhakaMidnight('2026-11-27') + 10 * 3_600_000;
const HOUR = 3_600_000;
const HOME_WIFI = '203.0.113.7';
const OTHER_NETWORK = '198.51.100.20';

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(NOW);
});
afterEach(() => {
  vi.useRealTimers();
});

async function errorOf(promise: Promise<unknown>) {
  try {
    await promise;
    return null;
  } catch (error) {
    return readAppError(error) ?? { code: `non-app error: ${String(error)}` };
  }
}

const form = (overrides: Record<string, unknown> = {}) => ({
  name: 'Nusrat Jahan',
  dateOfBirth: '2001-05-20',
  phone: '01712345678',
  language: 'en' as const,
  consentVersion: CONSENT,
  consentAcceptedAt: NOW - 60_000,
  ...overrides,
});

let people = 0;
/** A new Google account signing in from `ipAddress` and finishing onboarding. */
async function signUp(t: T, ipAddress: string | undefined, overrides: Record<string, unknown> = {}) {
  people += 1;
  const { as } = await signIn(t, `signup${people}@example.com`, ipAddress ? { ipAddress } : {});
  return { as, result: errorOf(as.mutation(api.profiles.completeOnboarding, form(overrides))) };
}

async function setPerHour(t: T, value: number) {
  await t.run(async (ctx) => {
    const row = await ctx.db
      .query('settings')
      .withIndex('by_key', (q) => q.eq('key', 'signupsPerDevicePerHour'))
      .unique();
    if (row) await ctx.db.patch(row._id, { value });
    else await ctx.db.insert('settings', { key: 'signupsPerDevicePerHour', value });
  });
}

describe('S-25 sign-ups per network per hour', () => {
  it('five from one network, then ERR_RATE_LIMITED with minutes; other networks are not affected; next hour is open', async () => {
    const t = makeT();
    for (let i = 0; i < 5; i += 1) expect(await (await signUp(t, HOME_WIFI)).result).toBeNull();

    const sixth = await (await signUp(t, HOME_WIFI)).result;
    expect(sixth?.code).toBe('ERR_RATE_LIMITED');
    const minutes = (sixth as { params?: { minutes?: number } }).params?.minutes;
    expect(minutes).toBeGreaterThanOrEqual(1);
    expect(minutes).toBeLessThanOrEqual(60);

    expect(await (await signUp(t, OTHER_NETWORK)).result).toBeNull();

    vi.setSystemTime(NOW + HOUR + 60_000);
    expect(await (await signUp(t, HOME_WIFI)).result).toBeNull();
  });

  it('the refused person can finish later; nothing of theirs was stored', async () => {
    const t = makeT();
    await setPerHour(t, 1);
    expect(await (await signUp(t, HOME_WIFI)).result).toBeNull();
    const { as, result } = await signUp(t, HOME_WIFI);
    expect((await result)?.code).toBe('ERR_RATE_LIMITED');
    expect((await as.query(api.profiles.me, {})).profile).toBeNull();

    vi.setSystemTime(NOW + HOUR + 60_000);
    expect(await as.mutation(api.profiles.completeOnboarding, form())).toEqual({ result: 'ok' });
  });

  it('the number comes from settings', async () => {
    const t = makeT();
    await setPerHour(t, 2);
    expect(await (await signUp(t, HOME_WIFI)).result).toBeNull();
    expect(await (await signUp(t, HOME_WIFI)).result).toBeNull();
    expect((await (await signUp(t, HOME_WIFI)).result)?.code).toBe('ERR_RATE_LIMITED');
  });

  it('form errors and repeat taps use nothing up; under-18 attempts count', async () => {
    const t = makeT();
    await setPerHour(t, 2);
    // Wrong phone and an old consent notice: refused before the limit is touched.
    expect((await (await signUp(t, HOME_WIFI, { phone: '12345' })).result)?.code).toBe('ERR_VALIDATION');
    expect((await (await signUp(t, HOME_WIFI, { consentVersion: 'old' })).result)?.code).toBe('ERR_CONSENT_REQUIRED');

    // A double tap: the second call returns the stored result without counting.
    const { as } = await signUp(t, HOME_WIFI);
    expect(await as.mutation(api.profiles.completeOnboarding, form())).toEqual({ result: 'ok' });

    // A 16-year-old's attempt is a sign-up too.
    expect(await (await signUp(t, HOME_WIFI, { dateOfBirth: '2010-01-01' })).result).toBeNull();
    expect((await (await signUp(t, HOME_WIFI)).result)?.code).toBe('ERR_RATE_LIMITED');
    expect((await (await signUp(t, HOME_WIFI, { dateOfBirth: '2010-01-01' })).result)?.code).toBe('ERR_RATE_LIMITED');
  });

  it('a session without a network address is not limited (never one shared bucket for everyone)', async () => {
    const t = makeT();
    await setPerHour(t, 1);
    for (let i = 0; i < 3; i += 1) expect(await (await signUp(t, undefined)).result).toBeNull();
  });
});
