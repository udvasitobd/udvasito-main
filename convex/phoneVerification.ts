/**
 * Phone verification — specs §6.1 `phoneVerification.*`, SCR-O04 and SCR-V06 (ADR-004, D-R1).
 *
 * In person: the member shows a 6-character code; an admin or approved volunteer types it and sees only the first
 * name and the last 4 digits; the member rings the verifier's phone (rejected, so ৳0) and the verifier confirms the
 * digits match. Audit-logged, limited per verifier per day (`inPersonVerificationsPerDay`). The full number never
 * leaves the server here.
 *
 * Telegram: `start` gives a deep link with a one-time token; the bot (`POST /telegram/webhook`, convex/telegram.ts)
 * asks the person to share their number and compares it with the one they typed — verified, or a mismatch the person
 * can accept (`acceptMismatch`). WhatsApp stays off until its webhook exists (specs §1.9).
 */
import { v } from 'convex/values';

import type { Doc, Id } from './_generated/dataModel';
import type { MutationCtx, QueryCtx } from './_generated/server';
import {
  assertSameArea,
  memberMutation,
  memberQuery,
  volunteerMutation,
  volunteerQuery,
  type Caller,
} from './_lib/auth';
import { writeAudit } from './_lib/audit';
import { appError } from './_lib/errors';
import { logEvent } from './_lib/events';
import { randomBytes } from './_lib/random';
import { rateLimitedError, rateLimiter } from './_lib/rateLimits';
import { getSetting } from './_lib/settings';
import { markPhoneVerified } from './_lib/verification';
import { ownPhone, ownVerifiedPhone, verifierHint } from './_lib/visibility';
import { DAY_MS, dhakaDayStart } from './rules/time';
import { checkVerificationCode } from './rules/validation';
import {
  codeFromBytes,
  effectiveStatus,
  isOpen,
  telegramDeepLink,
  tokenFromBytes,
  VERIFICATION_TTL_MS,
} from './rules/verification';

type Method = Doc<'phoneVerifications'>['method'];

/** Codes are 1 in ~10⁹; a few tries always find one that no open row uses. */
const CODE_ATTEMPTS = 5;

async function freshCode(ctx: QueryCtx, now: number): Promise<string> {
  for (let attempt = 0; attempt < CODE_ATTEMPTS; attempt++) {
    const code = codeFromBytes(randomBytes(6));
    const rows = await ctx.db
      .query('phoneVerifications')
      .withIndex('by_code', (q) => q.eq('code', code))
      .collect();
    if (!rows.some((row) => isOpen(row, now))) return code;
  }
  throw appError('ERR_INTERNAL');
}

/** 5 starts per hour per person and method (specs §6.1); then any earlier open row of that method stops working. */
async function beginAttempt(ctx: MutationCtx, profileId: Id<'profiles'>, method: Method): Promise<void> {
  const limit = await rateLimiter.limit(ctx, 'phoneVerificationStart', { key: `${profileId}:${method}` });
  if (!limit.ok) throw rateLimitedError(limit.retryAfter);
  const earlier = await ctx.db
    .query('phoneVerifications')
    .withIndex('by_profile', (q) => q.eq('profileId', profileId))
    .collect();
  for (const row of earlier) {
    if (row.method === method && row.status === 'pending') await ctx.db.patch(row._id, { status: 'expired' });
  }
}

/** The open in-person row for a typed code. A malformed, unknown, used or late code all read as expired. */
async function openRowForCode(ctx: QueryCtx, input: string, now: number): Promise<Doc<'phoneVerifications'>> {
  const checked = checkVerificationCode(input);
  if (!checked.ok) throw appError('ERR_VERIFICATION_EXPIRED');
  const rows = await ctx.db
    .query('phoneVerifications')
    .withIndex('by_code', (q) => q.eq('code', checked.value))
    .collect();
  const row = rows.find((candidate) => candidate.method === 'in_person' && isOpen(candidate, now));
  if (!row) throw appError('ERR_VERIFICATION_EXPIRED');
  return row;
}

/** The person being verified — never the verifier themself, never across the practice boundary. */
async function memberBeingVerified(
  ctx: QueryCtx,
  caller: Caller,
  row: Doc<'phoneVerifications'>,
): Promise<Doc<'profiles'>> {
  if (row.profileId === caller.profile._id) throw appError('ERR_SELF_VERIFICATION');
  const member = await ctx.db.get(row.profileId);
  if (!member) throw appError('ERR_VERIFICATION_EXPIRED');
  assertSameArea(caller, member);
  return member;
}

/** Successful in-person verifications by this verifier since 00:00 Dhaka time (the audit log is the record). */
async function verifiedToday(ctx: QueryCtx, verifierId: Id<'profiles'>, now: number): Promise<number> {
  const rows = await ctx.db
    .query('auditLog')
    .withIndex('by_actor', (q) => q.eq('actorId', verifierId).gte('_creationTime', dhakaDayStart(now)))
    .collect();
  return rows.filter((row) => row.action === 'phone_verified_in_person').length;
}

/** SCR-O04 "Verify in person": a new code for 10 minutes; any earlier open code of this person stops working. */
export const startInPerson = memberMutation({
  args: {},
  handler: async (ctx) => {
    const { profile, role, isDemo } = ctx.caller;
    const methods = await getSetting(ctx, 'verification');
    if (!methods.inPerson) throw appError('ERR_METHOD_DISABLED');
    await beginAttempt(ctx, profile._id, 'in_person');

    const now = Date.now();
    const code = await freshCode(ctx, now);
    const expiresAt = now + VERIFICATION_TTL_MS;
    const verificationId = await ctx.db.insert('phoneVerifications', {
      profileId: profile._id,
      method: 'in_person',
      token: tokenFromBytes(randomBytes(16)),
      code,
      expiresAt,
      status: 'pending',
    });
    await logEvent(ctx, { name: 'phone_verification_started', isDemo, actorRole: role, props: { method: 'in_person' } });
    return { verificationId, code, expiresAt };
  },
});

/** SCR-O04 "Verify with Telegram": a deep link with a one-time token, valid 10 minutes. */
export const start = memberMutation({
  args: { method: v.union(v.literal('telegram'), v.literal('whatsapp')) },
  handler: async (ctx, { method }) => {
    const { profile, role, isDemo } = ctx.caller;
    const methods = await getSetting(ctx, 'verification');
    // Telegram needs its bot; WhatsApp has no webhook yet, so it is never offered (specs §1.9).
    if (method !== 'telegram' || !methods.telegram || methods.telegramBot.trim() === '') {
      throw appError('ERR_METHOD_DISABLED');
    }
    await beginAttempt(ctx, profile._id, method);

    const token = tokenFromBytes(randomBytes(16));
    const expiresAt = Date.now() + VERIFICATION_TTL_MS;
    const verificationId = await ctx.db.insert('phoneVerifications', {
      profileId: profile._id,
      method,
      token,
      expiresAt,
      status: 'pending',
    });
    await logEvent(ctx, { name: 'phone_verification_started', isDemo, actorRole: role, props: { method } });
    return { verificationId, deepLink: telegramDeepLink(methods.telegramBot, token), expiresAt };
  },
});

/** SCR-O04 mismatch dialog "Yes, use {{verified}}": the shared number replaces the typed one and is verified. */
export const acceptMismatch = memberMutation({
  args: { verificationId: v.id('phoneVerifications') },
  handler: async (ctx, { verificationId }) => {
    const { profile, role, isDemo } = ctx.caller;
    const row = await ctx.db.get(verificationId);
    if (!row || row.profileId !== profile._id) throw appError('ERR_NOT_FOUND');
    const phone = ownVerifiedPhone(row);
    if (row.status !== 'mismatch' || phone === undefined || Date.now() >= row.expiresAt) {
      throw appError('ERR_VERIFICATION_EXPIRED');
    }
    await markPhoneVerified(ctx, profile, row.method, { phone });
    await ctx.db.patch(row._id, { status: 'verified' });
    await logEvent(ctx, { name: 'phone_verified', isDemo, actorRole: role, props: { method: row.method } });
    return null;
  },
});

/** SCR-O04 live status of the caller's own verification. */
export const status = memberQuery({
  args: { verificationId: v.id('phoneVerifications') },
  handler: async (ctx, { verificationId }) => {
    const row = await ctx.db.get(verificationId);
    if (!row || row.profileId !== ctx.caller.profile._id) throw appError('ERR_NOT_FOUND');
    const state = effectiveStatus(row, Date.now());
    const verifiedPhone = ownVerifiedPhone(row);
    return {
      status: state,
      enteredPhone: ownPhone(ctx.caller.profile),
      ...(verifiedPhone !== undefined ? { verifiedPhone } : {}),
    };
  },
});

/** SCR-V06 step 3: who the code belongs to — first name and last 4 digits only. */
export const lookupInPerson = volunteerQuery({
  args: { code: v.string() },
  handler: async (ctx, { code }) => {
    const row = await openRowForCode(ctx, code, Date.now());
    const member = await memberBeingVerified(ctx, ctx.caller, row);
    return { verificationId: row._id, firstName: member.firstName, phoneLast4: verifierHint(member) };
  },
});

/** SCR-V06 step 4: "It matches" verifies the number; "It doesn't match" closes the code. Both are audit-logged. */
export const confirmInPerson = volunteerMutation({
  args: { verificationId: v.id('phoneVerifications'), matches: v.boolean() },
  handler: async (ctx, { verificationId, matches }) => {
    const { caller } = ctx;
    const now = Date.now();
    const row = await ctx.db.get(verificationId);
    if (!row || row.method !== 'in_person' || !isOpen(row, now)) throw appError('ERR_VERIFICATION_EXPIRED');
    const member = await memberBeingVerified(ctx, caller, row);
    const actor = { profileId: caller.profile._id, role: caller.role };
    const audit = { actor, targetType: 'profile', targetId: member._id, meta: { verificationId: row._id } } as const;

    if (!matches) {
      await ctx.db.patch(row._id, { status: 'mismatch', verifierId: caller.profile._id });
      await writeAudit(ctx, { ...audit, action: 'phone_verification_failed_in_person' });
      return null;
    }

    const max = await getSetting(ctx, 'inPersonVerificationsPerDay');
    if ((await verifiedToday(ctx, caller.profile._id, now)) >= max) {
      throw rateLimitedError(dhakaDayStart(now) + DAY_MS - now);
    }
    await markPhoneVerified(ctx, member, 'in_person', { verifierId: caller.profile._id });
    await ctx.db.patch(row._id, { status: 'verified', verifierId: caller.profile._id });
    await writeAudit(ctx, { ...audit, action: 'phone_verified_in_person' });
    await logEvent(ctx, {
      name: 'phone_verified',
      isDemo: member.isDemo,
      actorRole: caller.role,
      props: { method: 'in_person' },
    });
    return null;
  },
});

/** SCR-V06 footer: "{{n}} of {{max}} verifications today". */
export const inPersonToday = volunteerQuery({
  args: {},
  handler: async (ctx) => ({
    count: await verifiedToday(ctx, ctx.caller.profile._id, Date.now()),
    max: await getSetting(ctx, 'inPersonVerificationsPerDay'),
  }),
});
