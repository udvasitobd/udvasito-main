/**
 * The one place a profile's phone becomes verified — Telegram, WhatsApp or in person (specs §6.1, ADR-004, D-R1).
 * Every path goes through `markPhoneVerified`, so the "one verified account per number" check (Q-015) and the donor
 * `live` recompute (specs §5.4) can never be skipped.
 */
import type { Doc, Id } from '../_generated/dataModel';
import type { MutationCtx } from '../_generated/server';
import { refreshDonorLive } from './donors';
import { appError } from './errors';
import { phoneVerifiedElsewhere } from './visibility';

export type VerificationMethod = Doc<'phoneVerifications'>['method'];

/**
 * `phone`: the number Telegram/WhatsApp shared when the person chose it over the one they typed (`acceptMismatch`).
 * `verifierId`: the admin or volunteer, for in-person checks.
 */
export async function markPhoneVerified(
  ctx: MutationCtx,
  profile: Doc<'profiles'>,
  via: VerificationMethod,
  options: { verifierId?: Id<'profiles'>; phone?: string } = {},
): Promise<void> {
  const { verifierId, phone } = options;
  if (await phoneVerifiedElsewhere(ctx, profile, phone)) throw appError('ERR_PHONE_IN_USE');
  await ctx.db.patch(profile._id, {
    ...(phone !== undefined ? { phone } : {}),
    phoneVerified: true,
    phoneVerifiedAt: Date.now(),
    phoneVerifiedVia: via,
    // Only in-person verification has a verifier; `undefined` clears an earlier one.
    phoneVerifiedBy: via === 'in_person' ? verifierId : undefined,
  });
  await refreshDonorLive(ctx, profile._id);
}
