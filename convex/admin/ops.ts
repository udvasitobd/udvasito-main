/**
 * `internal.admin.ops.*` — specs §6.6. Run from the CLI by the super-admin until the admin screens exist (P3/P5).
 * Same rules and audit entries as the admin screens; a reason (VAL-18) is always required. The Convex dashboard's
 * data editor is never used to change live rows by hand (CLAUDE.md rule 16).
 *
 *   npx convex run admin/ops:setRole '{"profileId":"…","role":"admin","reason":"Runs in-person verification"}'
 *
 * `closeRequest` is added with the request lifecycle (P1), when requests exist.
 * `setSetting` covers the go-live steps that set `fallbackContactPhone`, `consentVersion`, `apkUrl`… before the
 * settings screen exists (roadmap P1 go-live steps 2 and 5); it audits `setting_changed` like `admin.settings.update`.
 */
import { v } from 'convex/values';

import type { Doc } from '../_generated/dataModel';
import { internalMutation, type MutationCtx } from '../_generated/server';
import { writeAudit } from '../_lib/audit';
import { isSettingKey, checkSetting } from '../rules/settings';
import { checkReason } from '../rules/validation';
import { role as roleValidator } from '../schema';

function requireReason(reason: string): string {
  const r = checkReason(reason);
  if (!r.ok) throw new Error('A reason of 5 to 200 characters is required (VAL-18).');
  return r.value;
}

async function loadProfile(ctx: MutationCtx, profileId: Doc<'profiles'>['_id']) {
  const profile = await ctx.db.get(profileId);
  if (!profile) throw new Error('Profile not found.');
  return profile;
}

const ADMIN_ROLES: readonly Doc<'profiles'>['role'][] = ['admin', 'superadmin'];

/** ERR_LAST_ADMIN: there must always be at least one admin (admin or super-admin) among real accounts. */
async function countRealAdmins(ctx: MutationCtx): Promise<number> {
  let count = 0;
  for (const role of ADMIN_ROLES) {
    const rows = await ctx.db
      .query('profiles')
      .withIndex('by_role', (q) => q.eq('role', role))
      .collect();
    count += rows.filter((p) => !p.isDemo && p.status === 'active').length;
  }
  return count;
}

export const setRole = internalMutation({
  args: { profileId: v.id('profiles'), role: roleValidator, reason: v.string() },
  handler: async (ctx, args) => {
    const reason = requireReason(args.reason);
    const profile = await loadProfile(ctx, args.profileId);
    if (profile.role === args.role) return null;
    if (profile.isDemo && args.role !== 'member') {
      throw new Error('Practice accounts get their roles from the practice area (admin.demo), not here.');
    }
    const losingAdmin = ADMIN_ROLES.includes(profile.role) && !ADMIN_ROLES.includes(args.role);
    if (losingAdmin && !profile.isDemo && (await countRealAdmins(ctx)) <= 1) {
      throw new Error('ERR_LAST_ADMIN: there must always be at least one admin.');
    }
    await ctx.db.patch(profile._id, { role: args.role });
    await writeAudit(ctx, {
      actor: 'system',
      action: 'role_changed',
      targetType: 'profile',
      targetId: profile._id,
      reason,
      meta: { from: profile.role, to: args.role, via: 'cli' },
    });
    return null;
  },
});

export const setStatus = internalMutation({
  args: {
    profileId: v.id('profiles'),
    status: v.union(v.literal('active'), v.literal('frozen'), v.literal('suspended'), v.literal('banned')),
    reason: v.string(),
    until: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const reason = requireReason(args.reason);
    const profile = await loadProfile(ctx, args.profileId);
    if (args.status === 'suspended' && (args.until === undefined || args.until <= Date.now())) {
      throw new Error('A suspension needs an end time in the future (`until`, ms since epoch).');
    }
    if (args.status !== 'active' && ADMIN_ROLES.includes(profile.role) && !profile.isDemo && (await countRealAdmins(ctx)) <= 1) {
      throw new Error('ERR_LAST_ADMIN: there must always be at least one admin.');
    }
    await ctx.db.patch(profile._id, {
      status: args.status,
      statusReason: reason,
      statusUntil: args.status === 'suspended' ? args.until : undefined,
    });
    await writeAudit(ctx, {
      actor: 'system',
      action: 'status_changed',
      targetType: 'profile',
      targetId: profile._id,
      reason,
      meta: { from: profile.status, to: args.status, via: 'cli' },
    });
    // NTF-14 to the person is sent by the admin screen version (P5) once notifications exist.
    return null;
  },
});

/**
 * Marks an account as a practice account (go-live step 6: smoke tests with practice accounts).
 * Refuses when the account already has requests or responses, so real and practice data never meet (rule 6).
 */
export const setDemo = internalMutation({
  args: { profileId: v.id('profiles'), reason: v.string() },
  handler: async (ctx, args) => {
    const reason = requireReason(args.reason);
    const profile = await loadProfile(ctx, args.profileId);
    if (profile.isDemo) return null;
    if (ADMIN_ROLES.includes(profile.role)) throw new Error('An admin account cannot become a practice account.');

    const hasRequest = await ctx.db
      .query('requests')
      .withIndex('by_requester_status', (q) => q.eq('requesterId', profile._id))
      .first();
    const hasResponse = await ctx.db
      .query('responses')
      .withIndex('by_donor_state', (q) => q.eq('donorId', profile._id))
      .first();
    if (hasRequest || hasResponse) {
      throw new Error('ERR_DEMO_ISOLATION: this account already has real requests or responses.');
    }

    await ctx.db.patch(profile._id, { isDemo: true });
    const donor = await ctx.db
      .query('donorProfiles')
      .withIndex('by_profile', (q) => q.eq('profileId', profile._id))
      .unique();
    if (donor) await ctx.db.patch(donor._id, { isDemo: true });
    const volunteer = await ctx.db
      .query('volunteerProfiles')
      .withIndex('by_profile', (q) => q.eq('profileId', profile._id))
      .unique();
    if (volunteer) await ctx.db.patch(volunteer._id, { isDemo: true });

    await writeAudit(ctx, {
      actor: 'system',
      action: 'demo_account_created',
      targetType: 'profile',
      targetId: profile._id,
      reason,
      meta: { via: 'cli' },
    });
    return null;
  },
});

/** Sets one settings row after checking its range (VAL-19). The value is not copied into the audit entry. */
export const setSetting = internalMutation({
  args: { key: v.string(), value: v.any(), reason: v.string() },
  handler: async (ctx, args) => {
    const reason = requireReason(args.reason);
    if (!isSettingKey(args.key)) throw new Error(`Unknown setting "${args.key}".`);
    const check = checkSetting(args.key, args.value);
    if (!check.ok) {
      throw new Error(
        check.range
          ? `Value must be between ${check.range.min} and ${check.range.max} (VAL-19).`
          : 'Value has the wrong format for this setting (VAL-19).',
      );
    }
    const row = await ctx.db
      .query('settings')
      .withIndex('by_key', (q) => q.eq('key', args.key))
      .unique();
    if (row) await ctx.db.patch(row._id, { value: check.value });
    else await ctx.db.insert('settings', { key: args.key, value: check.value });
    await writeAudit(ctx, {
      actor: 'system',
      action: 'setting_changed',
      targetType: 'setting',
      targetId: args.key,
      reason,
      meta: { key: args.key, via: 'cli' },
    });
    return null;
  },
});
