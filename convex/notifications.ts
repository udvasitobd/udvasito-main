/** `notifications.markOpened` (specs §6.4): the recipient tapped an alert. Nobody else's row ever changes. */
import { v } from 'convex/values';

import { memberMutation } from './_lib/auth';

export const markOpened = memberMutation({
  args: { notificationId: v.id('notifications') },
  handler: async (ctx, { notificationId }) => {
    const alert = await ctx.db.get(notificationId);
    if (alert && alert.recipientId === ctx.caller.profile._id && alert.openedAt === undefined)
      await ctx.db.patch(notificationId, { openedAt: Date.now() });
    return null;
  },
});
