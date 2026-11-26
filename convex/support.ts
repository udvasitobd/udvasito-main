/**
 * Helpline — specs §6.1 `support.helpline`. Called only when a signed-in person taps a helpline button (D-R3); the
 * number is never pre-rendered. Signed-out callers use `GET /public/helpline` (rate-limited per network).
 * Every signed-in person may ask — including people on the under-18, account-status and onboarding screens.
 */
import { signedInQuery } from './_lib/auth';
import { getSetting } from './_lib/settings';

export const helpline = signedInQuery({
  args: {},
  handler: async (ctx) => {
    const phone = await getSetting(ctx, 'fallbackContactPhone');
    // Empty until the super-admin sets it (go-live step 2) — the app then hides the call button.
    return { phone: phone === '' ? null : phone };
  },
});
