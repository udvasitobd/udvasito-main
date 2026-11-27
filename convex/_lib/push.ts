/**
 * Expo push (Android, ADR-008) through `@convex-dev/expo-push-notifications`; the component stores one token per
 * profile and batches delivery to Expo. Every alert also gets a `notifications` row and a `notification_sent` event.
 * Web push is P4 (out of scope in P1): a member without an Android token still finds the alert in the app.
 */
import { PushNotifications } from '@convex-dev/expo-push-notifications';

import { components } from '../_generated/api';
import type { Id } from '../_generated/dataModel';
import type { MutationCtx } from '../_generated/server';
import { logEvent } from './events';

export const pushNotifications = new PushNotifications<Id<'profiles'>>(components.pushNotifications);

/** specs §1.2.1 / §6.8: `blood-requests` (importance MAX) for NTF-01/02/07/08/16, `updates` for the rest. */
export type AndroidChannel = 'blood-requests' | 'updates';

export type Alert = {
  recipientId: Id<'profiles'>;
  template: string;
  requestId?: Id<'requests'>;
  title: string;
  body: string;
  /** In-app path the tap opens, e.g. `/alerts/<requestId>`. */
  url: string;
  androidChannel: AndroidChannel;
  isDemo: boolean;
};

/**
 * Records the alert and hands it to Expo when the recipient has a device registered; otherwise it waits in the app
 * (channel `inapp`). Either way the row is `sent` once handed over, the same moment `notification_sent` is logged
 * (delivery receipts from Expo, which would set `failed`, are not read yet). Returns the `notifications` id, which
 * travels in the push data so the tap can mark it opened.
 */
export async function sendAlert(ctx: MutationCtx, alert: Alert): Promise<Id<'notifications'>> {
  const notificationId = await ctx.db.insert('notifications', {
    recipientId: alert.recipientId,
    template: alert.template,
    ...(alert.requestId ? { requestId: alert.requestId } : {}),
    channel: 'expo',
    status: 'queued',
    isDemo: alert.isDemo,
  });
  const device = await pushNotifications.getStatusForUser(ctx, { userId: alert.recipientId });
  const pushed =
    device.hasToken && !device.paused
      ? await pushNotifications.sendPushNotification(ctx, {
          userId: alert.recipientId,
          notification: {
            title: alert.title,
            body: alert.body,
            data: { url: alert.url, notificationId },
            channelId: alert.androidChannel,
            priority: alert.androidChannel === 'blood-requests' ? 'high' : 'default',
            sound: 'default',
          },
          allowUnregisteredTokens: true,
        })
      : null;
  const channel = pushed === null ? 'inapp' : 'expo';
  await ctx.db.patch(notificationId, { channel, status: 'sent' });
  await logEvent(ctx, {
    name: 'notification_sent',
    isDemo: alert.isDemo,
    ...(alert.requestId ? { requestId: alert.requestId } : {}),
    props: { template: alert.template, channel },
  });
  return notificationId;
}
