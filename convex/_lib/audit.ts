/**
 * Audit log (specs §6.9). Every sensitive action writes one row. `meta` never holds phone numbers or free text
 * typed by users — only ids, codes and short enums.
 */
import type { Id } from '../_generated/dataModel';
import type { MutationCtx } from '../_generated/server';

export const AUDIT_ACTIONS = [
  'consent_accepted',
  'contact_revealed',
  'volunteer_case_opened',
  'volunteer_optin_revealed',
  'admin_phone_revealed',
  'volunteer_donor_search',
  'slip_viewed',
  'slip_reviewed',
  'role_changed',
  'status_changed',
  'volunteer_reviewed',
  'moderation_decided',
  'setting_changed',
  'ai_feature_changed',
  'export_created',
  'data_imported',
  'demo_reset',
  'demo_account_created',
  'demo_pin_reset',
  'phone_verified_in_person',
  'phone_verification_failed_in_person',
  'phone_verification_revoked',
  'deletion_requested',
  'deletion_completed',
  'account_frozen_auto',
  'reveals_frozen_auto',
] as const;

export type AuditAction = (typeof AUDIT_ACTIONS)[number];

export type AuditActor = { profileId: Id<'profiles'>; role: string } | 'system';

export type AuditMeta = Record<string, string | number | boolean | null>;

export async function writeAudit(
  ctx: MutationCtx,
  entry: {
    actor: AuditActor;
    action: AuditAction;
    targetType: string;
    targetId: string;
    reason?: string;
    meta?: AuditMeta;
  },
): Promise<Id<'auditLog'>> {
  return ctx.db.insert('auditLog', {
    ...(entry.actor === 'system' ? { actorRole: 'system' } : { actorId: entry.actor.profileId, actorRole: entry.actor.role }),
    action: entry.action,
    targetType: entry.targetType,
    targetId: entry.targetId,
    ...(entry.reason !== undefined ? { reason: entry.reason } : {}),
    ...(entry.meta !== undefined ? { meta: entry.meta } : {}),
  });
}
