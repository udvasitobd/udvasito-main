/**
 * Device registration for push alerts — specs §6.4. Android only in P1 (Expo push); web push arrives in P4.
 * The Expo push token is stored by the push component under the caller's profile id, never with a phone number.
 */
import { v } from 'convex/values';

import { memberMutation } from './_lib/auth';
import { appError } from './_lib/errors';
import { pushNotifications } from './_lib/push';

/** What `getExpoPushTokenAsync` returns: `ExponentPushToken[…]` (older SDKs: `ExpoPushToken[…]`). */
const EXPO_TOKEN = /^Expo(nent)?PushToken\[[A-Za-z0-9_-]{10,200}\]$/;

export const registerExpoToken = memberMutation({
  args: { token: v.string() },
  handler: async (ctx, { token }) => {
    if (!EXPO_TOKEN.test(token)) throw appError('ERR_VALIDATION', undefined, 'token');
    await pushNotifications.recordToken(ctx, { userId: ctx.caller.profile._id, pushToken: token });
    return null;
  },
});

/** On sign-out: this device stops receiving alerts for the account. */
export const unregister = memberMutation({
  args: { token: v.optional(v.string()), endpoint: v.optional(v.string()) },
  handler: async (ctx) => {
    await pushNotifications.removeToken(ctx, { userId: ctx.caller.profile._id });
    return null;
  },
});
