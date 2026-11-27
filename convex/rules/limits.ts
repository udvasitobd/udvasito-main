/**
 * Request limits — PRD §5.8, specs §6.10. Pure TypeScript, no Convex imports; every number comes from `Settings`.
 * The server counts (open requests; requests since `dhakaMonthStart(now)`) and passes the counts in.
 */
import type { Settings } from './settings';

export type LimitRules = Pick<
  Settings,
  'openRequestsUnverified' | 'openRequestsVerified' | 'requestsPerMonth' | 'volunteerRequestsPerMonth'
>;

export type CanCreateRequest =
  | { ok: true }
  | { ok: false; code: 'ERR_OPEN_REQUEST_LIMIT'; params: { count: number } }
  | { ok: false; code: 'ERR_MONTHLY_REQUEST_LIMIT' };

/**
 * May this account open one more request?
 * - open requests: S-22 unverified (1) / verified (2) phone;
 * - this calendar month: S-22 per account (5), or the volunteer allowance (20) when a volunteer posts.
 * `ERR_MONTHLY_REQUEST_LIMIT` shows the helpline, which the app fetches on tap (D-R3) — never sent in params.
 */
export function canCreateRequest(
  profile: { phoneVerified: boolean; volunteer: boolean },
  counts: { open: number; thisMonth: number },
  rules: LimitRules,
): CanCreateRequest {
  const openLimit = profile.phoneVerified ? rules.openRequestsVerified : rules.openRequestsUnverified;
  if (counts.open >= openLimit) return { ok: false, code: 'ERR_OPEN_REQUEST_LIMIT', params: { count: counts.open } };
  const monthlyLimit = profile.volunteer ? rules.volunteerRequestsPerMonth : rules.requestsPerMonth;
  if (counts.thisMonth >= monthlyLimit) return { ok: false, code: 'ERR_MONTHLY_REQUEST_LIMIT' };
  return { ok: true };
}
