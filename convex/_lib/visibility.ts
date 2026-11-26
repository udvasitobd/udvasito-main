/**
 * The only door to phone numbers (PRD §3.3, specs §6.0, CLAUDE.md rule 2).
 *
 * - `ownPhone` returns the caller's own number (profiles.me) — not a reveal.
 * - `revealPhone` returns another person's number and, in the same transaction, writes a `contactReveals` row (once
 *   per viewer + request + subject + reason) and an audit entry. Functions marked 📞 in specs §6 must use it.
 * The number never goes into the audit `meta`, events, logs or errors.
 */
import type { Doc, Id } from '../_generated/dataModel';
import type { MutationCtx } from '../_generated/server';
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
  if (REVEAL_NEEDS_REASON_TEXT.has(input.reason) && !input.reasonText) {
    throw appError('ERR_VALIDATION', undefined, 'reason', 'validation.VAL-18');
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
      ...(input.reasonText !== undefined ? { reasonText: input.reasonText } : {}),
      expiresAt: input.expiresAt,
      isDemo: viewer.isDemo,
    });
    await writeAudit(ctx, {
      actor: { profileId: viewer._id, role: viewer.role },
      action: REVEAL_AUDIT_ACTION[input.reason],
      targetType: 'profile',
      targetId: subject._id,
      ...(input.reasonText !== undefined ? { reason: input.reasonText } : {}),
      meta: { requestId: input.requestId, subjectRole: input.subjectRole, revealReason: input.reason },
    });
  }
  return subject.phone;
}
