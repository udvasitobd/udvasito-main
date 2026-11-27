/**
 * profiles.completeOnboarding (SCR-O03) and consents.accept — access, the 18+ gate, consent stored server-side.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';

import { api } from './_generated/api';
import { readAppError } from './_lib/errors';
import { dhakaMidnight } from './rules/time';
import { insertProfile, makeT, signIn, type T } from './test.setup';

const CONSENT = '2026-11-28-pilot';
/** 27 Nov 2026, 10:00 in Dhaka. */
const NOW = dhakaMidnight('2026-11-27') + 10 * 3_600_000;

async function codeOf(promise: Promise<unknown>): Promise<string | null> {
  try {
    await promise;
    return null;
  } catch (error) {
    return readAppError(error)?.code ?? `non-app error: ${String(error)}`;
  }
}

async function errorOf(promise: Promise<unknown>) {
  try {
    await promise;
    return null;
  } catch (error) {
    return readAppError(error);
  }
}

const form = (overrides: Partial<Parameters<typeof base>[0]> = {}) => base(overrides);
function base(overrides: {
  name?: string;
  dateOfBirth?: string;
  phone?: string;
  language?: 'en' | 'bn';
  consentVersion?: string;
  consentAcceptedAt?: number;
  campaignCode?: string;
}) {
  return {
    name: '  Nusrat   Jahan ',
    dateOfBirth: '2001-05-20',
    phone: '০১৭১২-৩৪৫৬৭৮',
    language: 'bn' as const,
    consentVersion: CONSENT,
    consentAcceptedAt: NOW - 60_000,
    ...overrides,
  };
}

async function profileOf(t: T, authUserId: string) {
  return t.run((ctx) =>
    ctx.db
      .query('profiles')
      .withIndex('by_authUserId', (q) => q.eq('authUserId', authUserId))
      .unique(),
  );
}

describe('profiles.completeOnboarding', () => {
  afterEach(() => vi.useRealTimers());

  it('rejects a caller without a session', async () => {
    const t = makeT();
    expect(await codeOf(t.mutation(api.profiles.completeOnboarding, form()))).toBe('ERR_UNAUTHENTICATED');
  });

  it('creates the profile with the normalised name and number, and stores the consent server-side', async () => {
    vi.useFakeTimers({ now: NOW, toFake: ['Date'] });
    const t = makeT();
    const { as, userId } = await signIn(t, 'nusrat@example.com');
    expect(await as.mutation(api.profiles.completeOnboarding, form())).toEqual({ result: 'ok' });

    const profile = await profileOf(t, userId);
    expect(profile).toMatchObject({
      name: 'Nusrat Jahan',
      firstName: 'Nusrat',
      dateOfBirth: '2001-05-20',
      phone: '+8801712345678',
      phoneVerified: false,
      language: 'bn',
      role: 'member',
      status: 'active',
      consentVersion: CONSENT,
      isDemo: false,
    });
    const rows = await t.run(async (ctx) => ({
      consents: await ctx.db.query('consents').collect(),
      audit: await ctx.db.query('auditLog').collect(),
      events: await ctx.db.query('events').collect(),
    }));
    expect(rows.consents).toEqual([
      expect.objectContaining({ profileId: profile!._id, kind: 'terms_privacy', version: CONSENT, lang: 'bn', acceptedAt: NOW - 60_000 }),
    ]);
    expect(rows.audit).toEqual([expect.objectContaining({ action: 'consent_accepted', actorId: profile!._id, targetId: profile!._id })]);
    expect(rows.events).toEqual([expect.objectContaining({ name: 'profile_completed', isDemo: false })]);
    // Events and audit rows never carry the number or the name.
    expect(JSON.stringify([rows.audit, rows.events])).not.toMatch(/1712345678|Nusrat/);

    const me = await as.query(api.profiles.me, {});
    expect(me.flags.needsOnboarding).toBe(false);
    expect(me.needsConsent).toBe(false);
  });

  it('under 18 → underage_blocked, keeps only the date of birth, records no consent', async () => {
    vi.useFakeTimers({ now: NOW, toFake: ['Date'] });
    const t = makeT();
    const { as, userId } = await signIn(t, 'teen@example.com');
    const result = await as.mutation(api.profiles.completeOnboarding, form({ dateOfBirth: '2008-11-28' }));
    expect(result).toEqual({ result: 'underage' });

    const profile = await profileOf(t, userId);
    expect(profile).toMatchObject({ status: 'underage_blocked', dateOfBirth: '2008-11-28', name: '', phone: '' });
    expect(await t.run((ctx) => ctx.db.query('consents').collect())).toEqual([]);
    // Every member function now refuses this account.
    expect(await codeOf(as.mutation(api.consents.accept, { kind: 'terms_privacy', version: CONSENT, lang: 'en' }))).toBe('ERR_UNDERAGE');
    // Trying again with another date changes nothing.
    expect(await as.mutation(api.profiles.completeOnboarding, form())).toEqual({ result: 'underage' });
    expect((await profileOf(t, userId))?.status).toBe('underage_blocked');
  });

  it('18 today is allowed (Dhaka calendar date)', async () => {
    vi.useFakeTimers({ now: NOW, toFake: ['Date'] });
    const t = makeT();
    const { as } = await signIn(t, 'eighteen@example.com');
    expect(await as.mutation(api.profiles.completeOnboarding, form({ dateOfBirth: '2008-11-27' }))).toEqual({ result: 'ok' });
  });

  it('a second call (double tap, retry) changes nothing and returns ok', async () => {
    const t = makeT();
    const { as, userId } = await signIn(t, 'twice@example.com');
    await as.mutation(api.profiles.completeOnboarding, form());
    expect(await as.mutation(api.profiles.completeOnboarding, form({ name: 'Someone Else' }))).toEqual({ result: 'ok' });
    expect((await profileOf(t, userId))?.name).toBe('Nusrat Jahan');
    expect(await t.run((ctx) => ctx.db.query('consents').collect())).toHaveLength(1);
  });

  it.each([
    ['name', { name: 'A' }, 'validation.VAL-01.short'],
    ['name', { name: 'R2D2' }, 'validation.VAL-01.chars'],
    ['dateOfBirth', { dateOfBirth: '2001-02-30' }, 'validation.VAL-02.invalid'],
    ['dateOfBirth', { dateOfBirth: '2030-01-01' }, 'validation.VAL-02.invalid'],
    ['dateOfBirth', { dateOfBirth: '' }, 'validation.VAL-02.empty'],
    ['phone', { phone: '01212345678' }, 'validation.VAL-03.invalid'],
    ['phone', { phone: '' }, 'validation.VAL-03.empty'],
  ])('re-checks %s on the server → ERR_VALIDATION %s', async (field, overrides, messageKey) => {
    const t = makeT();
    const { as, userId } = await signIn(t, 'bad@example.com');
    const error = await errorOf(as.mutation(api.profiles.completeOnboarding, form(overrides)));
    expect(error).toMatchObject({ code: 'ERR_VALIDATION', field, messageKey });
    expect(await profileOf(t, userId)).toBeNull();
  });

  it('an outdated consent version → ERR_CONSENT_REQUIRED, nothing stored', async () => {
    const t = makeT();
    const { as, userId } = await signIn(t, 'stale@example.com');
    expect(await codeOf(as.mutation(api.profiles.completeOnboarding, form({ consentVersion: '2026-01-01-old' })))).toBe(
      'ERR_CONSENT_REQUIRED',
    );
    expect(await profileOf(t, userId)).toBeNull();
  });

  it('never stores a consent time in the future', async () => {
    vi.useFakeTimers({ now: NOW, toFake: ['Date'] });
    const t = makeT();
    const { as } = await signIn(t, 'clock@example.com');
    await as.mutation(api.profiles.completeOnboarding, form({ consentAcceptedAt: NOW + 86_400_000 }));
    const [consent] = await t.run((ctx) => ctx.db.query('consents').collect());
    expect(consent?.acceptedAt).toBe(NOW);
  });

  it('keeps a campaign code only when it names an active campaign', async () => {
    const t = makeT();
    await t.run(async (ctx) => {
      await ctx.db.insert('campaigns', { code: 'CU-DRIVE-1', name: 'Campus drive', active: true });
      await ctx.db.insert('campaigns', { code: 'OLD', name: 'Ended drive', active: false });
    });
    const cases: [string, string | undefined, string | undefined][] = [
      ['a@example.com', 'CU-DRIVE-1', 'CU-DRIVE-1'],
      ['b@example.com', 'OLD', undefined],
      ['c@example.com', 'NOPE', undefined],
      ['d@example.com', '<script>', undefined],
      ['e@example.com', undefined, undefined],
    ];
    for (const [email, code, kept] of cases) {
      const { as, userId } = await signIn(t, email);
      await as.mutation(api.profiles.completeOnboarding, form(code === undefined ? {} : { campaignCode: code }));
      expect((await profileOf(t, userId))?.campaignCode).toBe(kept);
    }
  });
});

describe('consents.accept', () => {
  it('rejects a caller without a session or without a profile', async () => {
    const t = makeT();
    const args = { kind: 'terms_privacy' as const, version: CONSENT, lang: 'en' as const };
    expect(await codeOf(t.mutation(api.consents.accept, args))).toBe('ERR_UNAUTHENTICATED');
    const { as } = await signIn(t, 'new@example.com');
    expect(await codeOf(as.mutation(api.consents.accept, args))).toBe('ERR_CONSENT_REQUIRED');
  });

  it('records the new version for a member whose consent is out of date (row + audit)', async () => {
    const t = makeT();
    const { as, userId } = await signIn(t, 'member@example.com');
    const profileId = await insertProfile(t, userId, { consentVersion: '2026-01-01-old' });
    await as.mutation(api.consents.accept, { kind: 'terms_privacy', version: CONSENT, lang: 'en' });

    expect((await profileOf(t, userId))?.consentVersion).toBe(CONSENT);
    const rows = await t.run(async (ctx) => ({
      consents: await ctx.db.query('consents').collect(),
      audit: await ctx.db.query('auditLog').collect(),
    }));
    expect(rows.consents).toEqual([expect.objectContaining({ profileId, kind: 'terms_privacy', version: CONSENT })]);
    expect(rows.audit).toEqual([expect.objectContaining({ action: 'consent_accepted', targetId: profileId })]);

    // Accepting the same version again writes nothing new.
    await as.mutation(api.consents.accept, { kind: 'terms_privacy', version: CONSENT, lang: 'en' });
    expect(await t.run((ctx) => ctx.db.query('consents').collect())).toHaveLength(1);
  });

  it('refuses an old version and the consents that belong to other forms', async () => {
    const t = makeT();
    const { as, userId } = await signIn(t, 'member@example.com');
    await insertProfile(t, userId, { consentVersion: '2026-01-01-old' });
    expect(await codeOf(as.mutation(api.consents.accept, { kind: 'terms_privacy', version: '2026-01-01-old', lang: 'en' }))).toBe(
      'ERR_CONSENT_REQUIRED',
    );
    expect(await codeOf(as.mutation(api.consents.accept, { kind: 'donor_health_contact', version: CONSENT, lang: 'en' }))).toBe(
      'ERR_VALIDATION',
    );
  });

  it('a frozen account cannot accept (mutations need an active account)', async () => {
    const t = makeT();
    const { as, userId } = await signIn(t, 'frozen@example.com');
    await insertProfile(t, userId, { status: 'frozen', consentVersion: 'old' });
    expect(await codeOf(as.mutation(api.consents.accept, { kind: 'terms_privacy', version: CONSENT, lang: 'en' }))).toBe('ERR_FROZEN');
  });
});
