/**
 * The one place a profile's phone becomes verified — Telegram, WhatsApp or in person (specs §6.1, ADR-004, D-R1).
 * Every path goes through `markPhoneVerified`, so the "one verified account per number" check (Q-015) and the donor
 * `live` recompute (specs §5.4) can never be skipped.
 */
import type { Doc, Id } from '../_generated/dataModel';
import type { MutationCtx } from '../_generated/server';
import { appError } from './errors';
import { phoneVerifiedElsewhere } from './visibility';

export type VerificationMethod = Doc<'phoneVerifications'>['method'];

export async function markPhoneVerified(
  ctx: MutationCtx,
  profile: Doc<'profiles'>,
  via: VerificationMethod,
  verifierId?: Id<'profiles'>,
): Promise<void> {
  if (await phoneVerifiedElsewhere(ctx, profile)) throw appError('ERR_PHONE_IN_USE');
  await ctx.db.patch(profile._id, {
    phoneVerified: true,
    phoneVerifiedAt: Date.now(),
    phoneVerifiedVia: via,
    // Only in-person verification has a verifier; `undefined` clears an earlier one.
    phoneVerifiedBy: via === 'in_person' ? verifierId : undefined,
  });
  // Donor profiles arrive with donor setup (P1 slice 7); their `live` flag is recomputed here from then on.
}
