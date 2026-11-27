/**
 * phoneVerification — in person (SCR-O04 + SCR-V06, D-R1): access, own code, last 4 digits only, daily limit, audit,
 * one verified account per number (Q-015), practice-area isolation.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';

import { api } from './_generated/api';
import type { Id } from './_generated/dataModel';
import { readAppError } from './_lib/errors';
import { DAY_MS, dhakaMidnight } from './rules/time';
import { VERIFICATION_TTL_MS } from './rules/verification';
import { insertProfile, makeT, signIn, type ProfileOverrides, type T } from './test.setup';

/** 27 Nov 2026, 10:00 in Dhaka. convex-test moves the fake clock 1 ms per write, so times are compared loosely. */
const NOW = dhakaMidnight('2026-11-27') + 10 * 3_600_000;
const SOON = NOW + 1_000;
const MEMBER_PHONE = '+8801712345678';

async function codeOf(promise: Promise<unknown>): Promise<string | null> {
  try {
    await promise;
    return null;
  } catch (error) {
    return readAppError(error)?.code ?? `non-app error: ${String(error)}`;
  }
}

let people = 0;
async function person(t: T, overrides: ProfileOverrides = {}) {
  people += 1;
  const { as, userId } = await signIn(t, `person${people}@example.com`);
  const profileId = await insertProfile(t, userId, overrides);
  return { as, profileId };
}

const volunteer = (t: T, overrides: ProfileOverrides = {}) =>
  person(t, { name: 'Karim Ahmed', firstName: 'Karim', role: 'volunteer', phone: '+8801898765432', ...overrides });
const member = (t: T, overrides: ProfileOverrides = {}) =>
  person(t, { name: 'Nusrat Jahan', firstName: 'Nusrat', phone: MEMBER_PHONE, ...overrides });

async function setSetting(t: T, key: string, value: unknown) {
  await t.run((ctx) => ctx.db.insert('settings', { key, value }));
}

const getRow = (t: T, id: Id<'phoneVerifications'>) => t.run((ctx) => ctx.db.get(id));
const getProfile = (t: T, id: Id<'profiles'>) => t.run((ctx) => ctx.db.get(id));
const auditRows = (t: T) => t.run((ctx) => ctx.db.query('auditLog').collect());
const eventsNamed = (t: T, name: string) =>
  t.run((ctx) =>
    ctx.db
      .query('events')
      .withIndex('by_name', (q) => q.eq('name', name))
      .collect(),
  );

describe('phoneVerification.startInPerson', () => {
  afterEach(() => vi.useRealTimers());

  it('needs a signed-in member who finished onboarding', async () => {
    const t = makeT();
    expect(await codeOf(t.mutation(api.phoneVerification.startInPerson, {}))).toBe('ERR_UNAUTHENTICATED');
    const { as } = await signIn(t, 'new@example.com');
    expect(await codeOf(as.mutation(api.phoneVerification.startInPerson, {}))).toBe('ERR_CONSENT_REQUIRED');
  });

  it('gives a VAL-26 code for 10 minutes and logs the start without personal data', async () => {
    vi.useFakeTimers({ now: NOW, toFake: ['Date'] });
    const t = makeT();
    const { as, profileId } = await member(t);
    const started = await as.mutation(api.phoneVerification.startInPerson, {});

    expect(started.code).toMatch(/^[ABCDEFGHJKLMNPQRSTUVWXYZ2-9]{6}$/);
    const startedAt = started.expiresAt - VERIFICATION_TTL_MS;
    expect(startedAt).toBeGreaterThanOrEqual(NOW);
    expect(startedAt).toBeLessThan(SOON);
    expect(await getRow(t, started.verificationId)).toMatchObject({
      profileId,
      method: 'in_person',
      code: started.code,
      status: 'pending',
      expiresAt: started.expiresAt,
    });
    expect((await getRow(t, started.verificationId))?.token).toMatch(/^[0-9a-f]{32}$/);
    const [event] = await eventsNamed(t, 'phone_verification_started');
    expect(event).toMatchObject({ isDemo: false, actorRole: 'member', props: { method: 'in_person' } });
  });

  it('a new code replaces the earlier one', async () => {
    const t = makeT();
    const { as } = await member(t);
    const first = await as.mutation(api.phoneVerification.startInPerson, {});
    const second = await as.mutation(api.phoneVerification.startInPerson, {});
    expect((await getRow(t, first.verificationId))?.status).toBe('expired');
    expect((await getRow(t, second.verificationId))?.status).toBe('pending');
  });

  it('is refused when in-person verification is switched off', async () => {
    const t = makeT();
    await setSetting(t, 'verification', {
      telegram: true,
      whatsapp: false,
      inPerson: false,
      telegramBot: '',
      whatsappNumber: '',
    });
    const { as } = await member(t);
    expect(await codeOf(as.mutation(api.phoneVerification.startInPerson, {}))).toBe('ERR_METHOD_DISABLED');
  });

  it('allows 5 starts an hour', async () => {
    vi.useFakeTimers({ now: NOW, toFake: ['Date'] });
    const t = makeT();
    const { as } = await member(t);
    for (let i = 0; i < 5; i++) await as.mutation(api.phoneVerification.startInPerson, {});
    expect(await codeOf(as.mutation(api.phoneVerification.startInPerson, {}))).toBe('ERR_RATE_LIMITED');
  });
});

describe('phoneVerification.status', () => {
  afterEach(() => vi.useRealTimers());

  it('shows the caller their own code only, and expires it after 10 minutes', async () => {
    vi.useFakeTimers({ now: NOW, toFake: ['Date'] });
    const t = makeT();
    const { as } = await member(t);
    const other = await person(t, { phone: '+8801512345678' });
    const { verificationId, expiresAt } = await as.mutation(api.phoneVerification.startInPerson, {});

    expect(await as.query(api.phoneVerification.status, { verificationId })).toEqual({
      status: 'pending',
      enteredPhone: MEMBER_PHONE,
    });
    expect(await codeOf(other.as.query(api.phoneVerification.status, { verificationId }))).toBe('ERR_NOT_FOUND');

    vi.setSystemTime(expiresAt);
    expect((await as.query(api.phoneVerification.status, { verificationId })).status).toBe('expired');
  });
});

describe('phoneVerification.lookupInPerson', () => {
  afterEach(() => vi.useRealTimers());

  it('is for volunteers and admins only', async () => {
    const t = makeT();
    const { as } = await member(t);
    const { code } = await as.mutation(api.phoneVerification.startInPerson, {});
    const plain = await person(t, { phone: '+8801612345678' });
    expect(await codeOf(plain.as.query(api.phoneVerification.lookupInPerson, { code }))).toBe('ERR_FORBIDDEN');
    expect(await codeOf(t.query(api.phoneVerification.lookupInPerson, { code }))).toBe('ERR_UNAUTHENTICATED');
  });

  it('shows the first name and the last 4 digits — never the full number', async () => {
    const t = makeT();
    const { as } = await member(t);
    const { code, verificationId } = await as.mutation(api.phoneVerification.startInPerson, {});
    const verifier = await volunteer(t);

    const found = await verifier.as.query(api.phoneVerification.lookupInPerson, { code: ` ${code.toLowerCase()} ` });
    expect(found).toEqual({ verificationId, firstName: 'Nusrat', phoneLast4: '5678' });
    expect(JSON.stringify(found)).not.toContain('01712');
  });

  it('refuses the verifier\'s own code', async () => {
    const t = makeT();
    const verifier = await volunteer(t);
    const { code } = await verifier.as.mutation(api.phoneVerification.startInPerson, {});
    expect(await codeOf(verifier.as.query(api.phoneVerification.lookupInPerson, { code }))).toBe('ERR_SELF_VERIFICATION');
  });

  it('treats a malformed, unknown or late code as expired', async () => {
    vi.useFakeTimers({ now: NOW, toFake: ['Date'] });
    const t = makeT();
    const { as } = await member(t);
    const { code, expiresAt } = await as.mutation(api.phoneVerification.startInPerson, {});
    const verifier = await volunteer(t);
    const lookup = (input: string) => codeOf(verifier.as.query(api.phoneVerification.lookupInPerson, { code: input }));

    expect(await lookup('ABC')).toBe('ERR_VERIFICATION_EXPIRED');
    expect(await lookup('O0I1AB')).toBe('ERR_VERIFICATION_EXPIRED');
    expect(await lookup(code === 'AAAAAA' ? 'BBBBBB' : 'AAAAAA')).toBe('ERR_VERIFICATION_EXPIRED');
    expect(await lookup(code)).toBeNull();
    vi.setSystemTime(expiresAt);
    expect(await lookup(code)).toBe('ERR_VERIFICATION_EXPIRED');
  });

  it('keeps practice and real people apart', async () => {
    const t = makeT();
    const { as } = await member(t);
    const { code } = await as.mutation(api.phoneVerification.startInPerson, {});
    const practiceVolunteer = await volunteer(t, { isDemo: true, practiceId: 'P-01' });
    expect(await codeOf(practiceVolunteer.as.query(api.phoneVerification.lookupInPerson, { code }))).toBe(
      'ERR_DEMO_ISOLATION',
    );
  });
});

describe('phoneVerification.confirmInPerson', () => {
  afterEach(() => vi.useRealTimers());

  it('"It matches" verifies the number, audits and logs — without the number', async () => {
    vi.useFakeTimers({ now: NOW, toFake: ['Date'] });
    const t = makeT();
    const { as, profileId } = await member(t);
    const { verificationId } = await as.mutation(api.phoneVerification.startInPerson, {});
    const verifier = await volunteer(t);

    expect(await verifier.as.mutation(api.phoneVerification.confirmInPerson, { verificationId, matches: true })).toBeNull();

    const verified = await getProfile(t, profileId);
    expect(verified).toMatchObject({
      phoneVerified: true,
      phoneVerifiedVia: 'in_person',
      phoneVerifiedBy: verifier.profileId,
    });
    expect(verified?.phoneVerifiedAt).toBeGreaterThanOrEqual(NOW);
    expect(verified?.phoneVerifiedAt).toBeLessThan(SOON);
    expect(await getRow(t, verificationId)).toMatchObject({ status: 'verified', verifierId: verifier.profileId });
    expect(await as.query(api.phoneVerification.status, { verificationId })).toEqual({
      status: 'verified',
      enteredPhone: MEMBER_PHONE,
    });

    const audit = await auditRows(t);
    expect(audit).toHaveLength(1);
    expect(audit[0]).toMatchObject({
      actorId: verifier.profileId,
      actorRole: 'volunteer',
      action: 'phone_verified_in_person',
      targetType: 'profile',
      targetId: profileId,
      meta: { verificationId },
    });
    const [event] = await eventsNamed(t, 'phone_verified');
    expect(event).toMatchObject({ isDemo: false, actorRole: 'volunteer', props: { method: 'in_person' } });
    expect(JSON.stringify([audit, event])).not.toContain('5678');

    // A used code cannot be used again.
    expect(
      await codeOf(verifier.as.mutation(api.phoneVerification.confirmInPerson, { verificationId, matches: true })),
    ).toBe('ERR_VERIFICATION_EXPIRED');
  });

  it('"It doesn\'t match" closes the code and audits the failure', async () => {
    const t = makeT();
    const { as, profileId } = await member(t);
    const { verificationId } = await as.mutation(api.phoneVerification.startInPerson, {});
    const verifier = await volunteer(t);

    await verifier.as.mutation(api.phoneVerification.confirmInPerson, { verificationId, matches: false });

    expect((await getProfile(t, profileId))?.phoneVerified).toBe(false);
    expect(await getRow(t, verificationId)).toMatchObject({ status: 'mismatch', verifierId: verifier.profileId });
    expect((await auditRows(t)).map((row) => row.action)).toEqual(['phone_verification_failed_in_person']);
    expect(await eventsNamed(t, 'phone_verified')).toHaveLength(0);
  });

  it('is refused for members, for the verifier\'s own code and across the practice boundary', async () => {
    const t = makeT();
    const { as } = await member(t);
    const { verificationId } = await as.mutation(api.phoneVerification.startInPerson, {});
    expect(await codeOf(as.mutation(api.phoneVerification.confirmInPerson, { verificationId, matches: true }))).toBe(
      'ERR_FORBIDDEN',
    );

    const verifier = await volunteer(t);
    const own = await verifier.as.mutation(api.phoneVerification.startInPerson, {});
    expect(
      await codeOf(
        verifier.as.mutation(api.phoneVerification.confirmInPerson, { verificationId: own.verificationId, matches: true }),
      ),
    ).toBe('ERR_SELF_VERIFICATION');

    const practice = await volunteer(t, { isDemo: true, practiceId: 'P-02', phone: '+8801998765432' });
    expect(
      await codeOf(practice.as.mutation(api.phoneVerification.confirmInPerson, { verificationId, matches: true })),
    ).toBe('ERR_DEMO_ISOLATION');
  });

  it('refuses a late code', async () => {
    vi.useFakeTimers({ now: NOW, toFake: ['Date'] });
    const t = makeT();
    const { as } = await member(t);
    const { verificationId, expiresAt } = await as.mutation(api.phoneVerification.startInPerson, {});
    const verifier = await volunteer(t);
    vi.setSystemTime(expiresAt);
    expect(
      await codeOf(verifier.as.mutation(api.phoneVerification.confirmInPerson, { verificationId, matches: true })),
    ).toBe('ERR_VERIFICATION_EXPIRED');
  });

  it('keeps one verified account per number in each area (Q-015)', async () => {
    const t = makeT();
    await member(t, { phoneVerified: true, phoneVerifiedVia: 'telegram' });
    await member(t, { isDemo: true, practiceId: 'P-03', phoneVerified: true, phoneVerifiedVia: 'in_person' });
    const second = await member(t);
    const { verificationId } = await second.as.mutation(api.phoneVerification.startInPerson, {});
    const verifier = await volunteer(t);

    expect(
      await codeOf(verifier.as.mutation(api.phoneVerification.confirmInPerson, { verificationId, matches: true })),
    ).toBe('ERR_PHONE_IN_USE');
    expect((await getProfile(t, second.profileId))?.phoneVerified).toBe(false);
    expect((await getRow(t, verificationId))?.status).toBe('pending');
    expect(await auditRows(t)).toHaveLength(0);
  });

  it('a practice number verified elsewhere does not block a real account', async () => {
    const t = makeT();
    await member(t, { isDemo: true, practiceId: 'P-04', phoneVerified: true, phoneVerifiedVia: 'in_person' });
    const real = await member(t);
    const { verificationId } = await real.as.mutation(api.phoneVerification.startInPerson, {});
    const verifier = await volunteer(t);
    await verifier.as.mutation(api.phoneVerification.confirmInPerson, { verificationId, matches: true });
    expect((await getProfile(t, real.profileId))?.phoneVerified).toBe(true);
  });

  it('limits each verifier to inPersonVerificationsPerDay successful checks per Dhaka day', async () => {
    vi.useFakeTimers({ now: NOW, toFake: ['Date'] });
    const t = makeT();
    await setSetting(t, 'inPersonVerificationsPerDay', 10);
    const verifier = await volunteer(t, { role: 'admin' });
    const verifyOne = async (index: number) => {
      const someone = await member(t, { phone: `+88017000000${String(index).padStart(2, '0')}` });
      const { verificationId } = await someone.as.mutation(api.phoneVerification.startInPerson, {});
      return codeOf(verifier.as.mutation(api.phoneVerification.confirmInPerson, { verificationId, matches: true }));
    };

    for (let i = 0; i < 10; i++) expect(await verifyOne(i)).toBeNull();
    expect(await verifier.as.query(api.phoneVerification.inPersonToday, {})).toEqual({ count: 10, max: 10 });
    expect(await verifyOne(10)).toBe('ERR_RATE_LIMITED');

    // A failed match is still recorded at the limit — it verifies nothing.
    const someone = await member(t, { phone: '+8801700000099' });
    const { verificationId } = await someone.as.mutation(api.phoneVerification.startInPerson, {});
    expect(
      await codeOf(verifier.as.mutation(api.phoneVerification.confirmInPerson, { verificationId, matches: false })),
    ).toBeNull();

    // The next Dhaka day starts a new count.
    vi.setSystemTime(dhakaMidnight('2026-11-28') + 60_000);
    expect(await verifier.as.query(api.phoneVerification.inPersonToday, {})).toEqual({ count: 0, max: 10 });
    expect(await verifyOne(11)).toBeNull();
  });

  it('the rate-limit error says how long until the next Dhaka day', async () => {
    vi.useFakeTimers({ now: NOW, toFake: ['Date'] });
    const t = makeT();
    await setSetting(t, 'inPersonVerificationsPerDay', 10);
    const verifier = await volunteer(t);
    for (let i = 0; i < 10; i++) {
      const someone = await member(t, { phone: `+88018000000${String(i).padStart(2, '0')}` });
      const { verificationId } = await someone.as.mutation(api.phoneVerification.startInPerson, {});
      await verifier.as.mutation(api.phoneVerification.confirmInPerson, { verificationId, matches: true });
    }
    const last = await member(t, { phone: '+8801800000077' });
    const { verificationId } = await last.as.mutation(api.phoneVerification.startInPerson, {});
    try {
      await verifier.as.mutation(api.phoneVerification.confirmInPerson, { verificationId, matches: true });
      expect.unreachable();
    } catch (error) {
      // About 10:00 → midnight: 14 hours, rounded up to whole minutes.
      expect(readAppError(error)).toMatchObject({
        code: 'ERR_RATE_LIMITED',
        params: { minutes: (DAY_MS - 10 * 3_600_000) / 60_000 },
      });
    }
  });
});
