/**
 * Rate limits from specs §6 (function rows and HTTP endpoints). Per-person limits that are product rules
 * (S-22…S-25) come from `settings`; these are the fixed abuse limits written in the API tables.
 */
import { HOUR, MINUTE, RateLimiter } from '@convex-dev/rate-limiter';

import { components } from '../_generated/api';
import { appError } from './errors';

export const rateLimiter = new RateLimiter(components.rateLimiter, {
  /** `GET /public/helpline`: 30 per hour per network (IP) — specs §6.5. */
  publicHelpline: { kind: 'fixed window', rate: 30, period: HOUR },
  /** `phoneVerification.start` / `startInPerson`: 5 per hour per person and method — specs §6.1. */
  phoneVerificationStart: { kind: 'fixed window', rate: 5, period: HOUR },
});

export type RateLimitName = 'publicHelpline' | 'phoneVerificationStart';

/** Minutes to wait, rounded up, at least 1 — the `{{minutes}}` of ERR_RATE_LIMITED. */
export function retryAfterMinutes(retryAfterMs: number | undefined): number {
  return Math.max(1, Math.ceil((retryAfterMs ?? MINUTE) / MINUTE));
}

export function rateLimitedError(retryAfterMs: number | undefined) {
  return appError('ERR_RATE_LIMITED', { minutes: retryAfterMinutes(retryAfterMs) });
}
