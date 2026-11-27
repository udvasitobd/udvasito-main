/**
 * The only door to phone numbers (PRD §3.3, specs §6.0, CLAUDE.md rule 2).
 *
 * - `ownPhone` returns the caller's own number (profiles.me) — not a reveal.
 * - `ownVerifiedPhone` returns the number Telegram/WhatsApp shared for the caller's own verification row.
 * - `verifierHint` returns the last 4 digits only — all an in-person verifier ever sees (D-R1).
 * - `phoneVerifiedElsewhere` and `isOwnVerifiedPhone` compare numbers on the server and return only yes/no.
 * - `revealPhone` returns another person's number and, in the same transaction, writes a `contactReveals` row (once
 *   per viewer + request + subject + reason) and an audit entry. Functions marked 📞 in specs §6 must use it.
 * The number never goes into the audit `meta`, events, logs or errors.
 */
import type { Doc, Id } from '../_generated/dataModel';
import type { MutationCtx, QueryCtx } from '../_generated/server';
import { checkReason, phoneLast4 } from '../rules/validation';
import { writeAudit, type AuditAction } from './audit';
import { appError } from './errors';

export type RevealReason = Doc<'contactReveals'>['reason'];
export type RevealSubjectRole = Doc<'contactReveals'>['subjectRole'];

/** Audit action for each reveal reason (specs §6.9). */
export const REVEAL_AUDIT_ACTION: Record<RevealReason, AuditAction> = {
  confirmed_slot: 'contact_revealed',
  volunteer_hotline: 'contact_revealed',
  volunteer_case: 'volunteer_case_opened',
  volunteer_optin_call: 'volunteer_optin_revealed',
  admin_reveal: 'admin_phone_revealed',
};

/** Reasons that need a typed reason (VAL-18) from the viewer. */
export const REVEAL_NEEDS_REASON_TEXT: ReadonlySet<RevealReason> = new Set(['admin_reveal', 'volunteer_optin_call']);

export function ownPhone(profile: Doc<'profiles'>): string {
  return profile.phone;
}

/**
 * Whether a request's contact number is the caller's own verified number (`requests.contactPhoneVerified`). Compared
 * on the server; only yes/no leaves this file.
 */
export function isOwnVerifiedPhone(profile: Doc<'profiles'>, phone: string): boolean {
  return profile.phoneVerified && profile.phone === phone;
}

/** The number shared by Telegram/WhatsApp on the caller's own row (`phoneVerification.status`, SCR-O04 mismatch). */
export function ownVerifiedPhone(row: Doc<'phoneVerifications'>): string | undefined {
  return row.verifiedPhone;
}

/** Last 4 digits of a member's number — `phoneVerification.lookupInPerson` (D-R1). Never the full number. */
export function verifierHint(profile: Doc<'profiles'>): string {
  return phoneLast4(profile.phone);
}

/**
 * Whether `phone` is already verified on another account in the same area (real or practice). One verified account
 * per number (ERR_PHONE_IN_USE, Q-015).
 */
export async function phoneVerifiedElsewhere(
  ctx: QueryCtx,
  profile: Doc<'profiles'>,
  phone: string = profile.phone,
): Promise<boolean> {
  const owners = await ctx.db
    .query('profiles')
    .withIndex('by_phone', (q) => q.eq('phone', phone))
    .collect();
  return owners.some((other) => other._id !== profile._id && other.phoneVerified && other.isDemo === profile.isDemo);
}

export async function revealPhone(
  ctx: MutationCtx,
  input: {
    viewer: Doc<'profiles'>;
    subject: Doc<'profiles'>;
    subjectRole: RevealSubjectRole;
    requestId: Id<'requests'>;
    reason: RevealReason;
    reasonText?: string;
    expiresAt: number;
  },
): Promise<string> {
  const { viewer, subject } = input;
  if (viewer.isDemo !== subject.isDemo) throw appError('ERR_DEMO_ISOLATION');
  // VAL-18: a trimmed reason of 5–200 characters where one is required; the trimmed text is what gets stored.
  let reasonText = input.reasonText?.trim() || undefined;
  if (REVEAL_NEEDS_REASON_TEXT.has(input.reason)) {
    const checked = checkReason(input.reasonText ?? '');
    if (!checked.ok) throw appError('ERR_VALIDATION', undefined, checked.error.field, checked.error.messageKey);
    reasonText = checked.value;
  }

  const existing = await ctx.db
    .query('contactReveals')
    .withIndex('by_viewer_request', (q) => q.eq('viewerId', viewer._id).eq('requestId', input.requestId))
    .collect();
  const already = existing.find((r) => r.subjectId === subject._id && r.reason === input.reason);

  if (already) {
    if (already.expiresAt < input.expiresAt) await ctx.db.patch(already._id, { expiresAt: input.expiresAt });
  } else {
    await ctx.db.insert('contactReveals', {
      requestId: input.requestId,
      viewerId: viewer._id,
      subjectId: subject._id,
      subjectRole: input.subjectRole,
      reason: input.reason,
      ...(reasonText !== undefined ? { reasonText } : {}),
      expiresAt: input.expiresAt,
      isDemo: viewer.isDemo,
    });
    await writeAudit(ctx, {
      actor: { profileId: viewer._id, role: viewer.role },
      action: REVEAL_AUDIT_ACTION[input.reason],
      targetType: 'profile',
      targetId: subject._id,
      ...(reasonText !== undefined ? { reason: reasonText } : {}),
      meta: { requestId: input.requestId, subjectRole: input.subjectRole, revealReason: input.reason },
    });
  }
  return subject.phone;
}
