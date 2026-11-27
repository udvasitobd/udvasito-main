/**
 * Access tests for the auth wrappers (CLAUDE.md rule 11) and the P0 public functions.
 */
import { describe, expect, it, vi } from 'vitest';

import { api, internal } from '../_generated/api';
import { insertProfile, makeT, signIn } from '../test.setup';
import { loadCaller } from './auth';
import { readAppError } from './errors';

async function codeOf(promise: Promise<unknown>): Promise<string | null> {
  try {
    await promise;
    return null;
  } catch (error) {
    return readAppError(error)?.code ?? `non-app error: ${String(error)}`;
  }
}

describe('profiles.me (signed in)', () => {
  it('rejects a caller without a session', async () => {
    const t = makeT();
    expect(await codeOf(t.query(api.profiles.me, {}))).toBe('ERR_UNAUTHENTICATED');
  });

  it('rejects an expired or unknown session', async () => {
    const t = makeT();
    const ghost = t.withIdentity({ subject: 'no-such-user', sessionId: 'no-such-session' });
    expect(await codeOf(ghost.query(api.profiles.me, {}))).toBe('ERR_UNAUTHENTICATED');
  });

  it('signed in without a profile → needs onboarding and consent', async () => {
    const t = makeT();
    const { as } = await signIn(t, 'new@example.com');
    const me = await as.query(api.profiles.me, {});
    expect(me.profile).toBeNull();
    expect(me.needsConsent).toBe(true);
    expect(me.flags.needsOnboarding).toBe(true);
  });

  it('returns the own profile including the own phone, and consent status', async () => {
    const t = makeT();
    const { as, userId } = await signIn(t, 'rahim@example.com');
    await insertProfile(t, userId);
    const me = await as.query(api.profiles.me, {});
    expect(me.profile?.phone).toBe('+8801712345678');
    expect(me.needsConsent).toBe(false);
    expect(me.flags).toMatchObject({ needsOnboarding: false, isDonor: false, isVolunteer: false });
  });

  it('reports stale consent when the consent version moved on', async () => {
    const t = makeT();
    const { as, userId } = await signIn(t, 'old@example.com');
    await insertProfile(t, userId, { consentVersion: 'older-version' });
    expect((await as.query(api.profiles.me, {})).needsConsent).toBe(true);
  });
});

describe('loadCaller', () => {
  async function callerCode(
    overrides: Parameters<typeof insertProfile>[2] | 'none',
    access: Parameters<typeof loadCaller>[1],
    kind: 'query' | 'mutation' = 'mutation',
  ) {
    const t = makeT();
    const { userId, as } = await signIn(t, 'caller@example.com');
    if (overrides !== 'none') await insertProfile(t, userId, overrides);
    return codeOf(as.run((ctx) => loadCaller(ctx, access, kind)));
  }

  it('member, active, consent current → allowed', async () => {
    expect(await callerCode({}, { role: 'member' })).toBeNull();
  });
  it('no profile → ERR_CONSENT_REQUIRED (onboarding)', async () => {
    expect(await callerCode('none', { role: 'member' })).toBe('ERR_CONSENT_REQUIRED');
  });
  it('stale consent → ERR_CONSENT_REQUIRED', async () => {
    expect(await callerCode({ consentVersion: 'old' }, { role: 'member' })).toBe('ERR_CONSENT_REQUIRED');
  });
  it('stale consent allowed for consent screens', async () => {
    expect(await callerCode({ consentVersion: 'old' }, { role: 'member', allowStaleConsent: true })).toBeNull();
  });
  it('frozen → ERR_FROZEN on mutations, readable on queries', async () => {
    expect(await callerCode({ status: 'frozen' }, { role: 'member' }, 'mutation')).toBe('ERR_FROZEN');
    expect(await callerCode({ status: 'frozen' }, { role: 'member' }, 'query')).toBeNull();
  });
  it('under 18 → ERR_UNDERAGE', async () => {
    expect(await callerCode({ status: 'underage_blocked' }, { role: 'member' })).toBe('ERR_UNDERAGE');
  });
  it.each(['suspended', 'banned', 'deletion_pending'] as const)('%s → ERR_FORBIDDEN', async (status) => {
    expect(await callerCode({ status }, { role: 'member' })).toBe('ERR_FORBIDDEN');
  });
  it('deletion_pending may call when the function allows it (cancelDeletion)', async () => {
    expect(await callerCode({ status: 'deletion_pending' }, { role: 'member', statuses: ['deletion_pending'] })).toBeNull();
  });
  it('roles are ranked: member < volunteer < admin < superadmin', async () => {
    expect(await callerCode({ role: 'member' }, { role: 'volunteer' })).toBe('ERR_FORBIDDEN');
    expect(await callerCode({ role: 'volunteer' }, { role: 'volunteer' })).toBeNull();
    expect(await callerCode({ role: 'volunteer' }, { role: 'admin' })).toBe('ERR_FORBIDDEN');
    expect(await callerCode({ role: 'admin' }, { role: 'volunteer' })).toBeNull();
    expect(await callerCode({ role: 'admin' }, { role: 'superadmin' })).toBe('ERR_FORBIDDEN');
    expect(await callerCode({ role: 'superadmin' }, { role: 'admin' })).toBeNull();
  });
});

describe('public.appConfig (public)', () => {
  it('hides helpline buttons until a number is set', async () => {
    const t = makeT();
    expect((await t.query(api.public.appConfig, {})).helplineAvailable).toBe(false);
  });

  it('works signed out and never contains a phone number', async () => {
    const t = makeT();
    await t.run((ctx) => ctx.db.insert('settings', { key: 'fallbackContactPhone', value: '+8801812345678' }));
    const config = await t.query(api.public.appConfig, {});
    expect(config.consentVersion).toBe('2026-11-28-pilot');
    expect(config.helplineAvailable).toBe(true);
    expect(JSON.stringify(config)).not.toMatch(/\+?8801\d{9}|01[3-9]\d{8}/);
  });
});

describe('support.helpline (signed in)', () => {
  it('rejects signed-out callers', async () => {
    const t = makeT();
    expect(await codeOf(t.query(api.support.helpline, {}))).toBe('ERR_UNAUTHENTICATED');
  });
  it('returns null until the super-admin sets the number, then the number', async () => {
    const t = makeT();
    const { as } = await signIn(t, 'h@example.com');
    expect(await as.query(api.support.helpline, {})).toEqual({ phone: null });
    await t.run((ctx) => ctx.db.insert('settings', { key: 'fallbackContactPhone', value: '+8801812345678' }));
    expect(await as.query(api.support.helpline, {})).toEqual({ phone: '+8801812345678' });
  });
  it('is available to people who cannot use the app (under-18 / frozen screens)', async () => {
    const t = makeT();
    const { as, userId } = await signIn(t, 'u@example.com');
    await insertProfile(t, userId, { status: 'underage_blocked' });
    expect(await as.query(api.support.helpline, {})).toEqual({ phone: null });
  });
});

describe('admin bootstrap and ops (internal)', () => {
  it('bootstraps the first super-admin once, with an audit entry', async () => {
    const t = makeT();
    const { userId } = await signIn(t, 'team@example.com');
    const profileId = await insertProfile(t, userId);
    await t.mutation(internal.admin.bootstrap.bootstrapSuperAdmin, { email: 'team@example.com' });
    const after = await t.run((ctx) => ctx.db.get(profileId));
    expect(after?.role).toBe('superadmin');
    const audit = await t.run((ctx) =>
      ctx.db.query('auditLog').withIndex('by_action', (q) => q.eq('action', 'role_changed')).collect(),
    );
    expect(audit).toHaveLength(1);
    expect(audit[0]).toMatchObject({ actorRole: 'system', targetId: profileId });
    await expect(t.mutation(internal.admin.bootstrap.bootstrapSuperAdmin, { email: 'team@example.com' })).rejects.toThrow(
      /already exists/,
    );
  });

  it('refuses an account that has not finished onboarding', async () => {
    const t = makeT();
    await signIn(t, 'half@example.com');
    await expect(t.mutation(internal.admin.bootstrap.bootstrapSuperAdmin, { email: 'half@example.com' })).rejects.toThrow(
      /onboarding/,
    );
  });

  it('setRole needs a reason and keeps at least one admin', async () => {
    const t = makeT();
    const { userId } = await signIn(t, 'only-admin@example.com');
    const id = await insertProfile(t, userId, { role: 'superadmin' });
    await expect(t.mutation(internal.admin.ops.setRole, { profileId: id, role: 'member', reason: 'no' })).rejects.toThrow(
      /reason/,
    );
    await expect(
      t.mutation(internal.admin.ops.setRole, { profileId: id, role: 'member', reason: 'Stepping down' }),
    ).rejects.toThrow(/ERR_LAST_ADMIN/);
  });

  it('setSetting validates the range and audits without copying the value', async () => {
    const t = makeT();
    await expect(
      t.mutation(internal.admin.ops.setSetting, { key: 'maxDonorAge', value: 80, reason: 'Medical review' }),
    ).rejects.toThrow(/between 60 and 70/);
    await t.mutation(internal.admin.ops.setSetting, {
      key: 'fallbackContactPhone',
      value: '+8801812345678',
      reason: 'Go-live step 2',
    });
    const audit = await t.run((ctx) =>
      ctx.db.query('auditLog').withIndex('by_action', (q) => q.eq('action', 'setting_changed')).collect(),
    );
    expect(audit).toHaveLength(1);
    expect(JSON.stringify(audit[0])).not.toContain('8801812345678');
  });

  it('seedSettings is idempotent and never overwrites a set value', async () => {
    vi.stubEnv('SITE_URL', 'http://localhost:8081');
    const t = makeT();
    const first = await t.mutation(internal.admin.seed.seedSettings, {});
    expect(first.environment).toBe('staging');
    expect(first.inserted).toBe(61);
    await t.mutation(internal.admin.ops.setSetting, { key: 'waveCount', value: 2, reason: 'Pilot tuning' });
    const second = await t.mutation(internal.admin.seed.seedSettings, {});
    expect(second.inserted).toBe(0);
    expect(await t.query(api.public.appConfig, {})).toMatchObject({ practiceAreaEnabled: true });
    const waveCount = await t.run((ctx) =>
      ctx.db.query('settings').withIndex('by_key', (q) => q.eq('key', 'waveCount')).unique(),
    );
    expect(waveCount?.value).toBe(2);
    vi.unstubAllEnvs();
  });

  it('seedSettings takes production values from a production SITE_URL and refuses an unknown one', async () => {
    vi.stubEnv('SITE_URL', 'https://udvasito.com');
    const prod = makeT();
    expect(await prod.mutation(internal.admin.seed.seedSettings, {})).toMatchObject({ environment: 'production' });
    expect(await prod.query(api.public.appConfig, {})).toMatchObject({ practiceAreaEnabled: false });
    vi.stubEnv('SITE_URL', '');
    await expect(makeT().mutation(internal.admin.seed.seedSettings, {})).rejects.toThrow(/SITE_URL/);
    vi.unstubAllEnvs();
  });
});
