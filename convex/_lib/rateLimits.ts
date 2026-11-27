/**
 * Rate limits from specs §6 (function rows and HTTP endpoints). The fixed abuse limits written in the API tables are
 * named below; limits that are product rules (S-22…S-25) take their number from `settings` at call time.
 */
import { HOUR, MINUTE, RateLimiter } from '@convex-dev/rate-limiter';

import { components } from '../_generated/api';
import type { MutationCtx } from '../_generated/server';
import { appError } from './errors';
import { addressKey, sessionAddress } from './network';

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

/**
 * S-25 (PRD §5.8): at most `signupsPerDevicePerHour` new profiles per network per hour, counted when
 * `profiles.completeOnboarding` creates one (under-18 attempts included). The network is the one stored on the
 * caller's session at sign-in, hashed. A session without an address is not limited: failing closed would put every
 * such person into one shared bucket and could lock out someone who needs blood now.
 */
export async function checkSignupLimit(ctx: MutationCtx, perHour: number): Promise<void> {
  const address = await sessionAddress(ctx);
  if (address === null) return;
  const limit = await rateLimiter.limit(ctx, 'signupsPerNetwork', {
    key: await addressKey('signup', address),
    config: { kind: 'fixed window', rate: perHour, period: HOUR },
  });
  if (!limit.ok) throw rateLimitedError(limit.retryAfter);
}
