/**
 * Push on the Android app (expo-notifications, ADR-008). Channels per specs §1.2.1: `blood-requests` — importance
 * MAX, sound, vibration, shown on the lock screen (alert text never holds a name or a number, P-13) — and `updates`.
 * Android 13+ shows the permission dialog only once a channel exists, so channels are made at launch.
 */
import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';

import { colors } from '@/theme/tokens';

import type { ChannelNames, PermissionState } from './types';

// An alert that arrives while the app is open still shows: the person may be on another screen.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export const pushAvailable = true;

export async function prepareChannels(names: ChannelNames): Promise<void> {
  await Notifications.setNotificationChannelAsync('blood-requests', {
    name: names.bloodRequests,
    importance: Notifications.AndroidImportance.MAX,
    sound: 'default',
    enableVibrate: true,
    vibrationPattern: [0, 400, 200, 400],
    lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
    lightColor: colors.brand.primary,
  });
  await Notifications.setNotificationChannelAsync('updates', {
    name: names.updates,
    importance: Notifications.AndroidImportance.DEFAULT,
  });
}

export async function permissionState(): Promise<PermissionState> {
  if (!Device.isDevice) return 'unavailable';
  const permission = await Notifications.getPermissionsAsync();
  if (permission.granted) return 'granted';
  return permission.canAskAgain ? 'ask' : 'blocked';
}

/** Shows the Android dialog when it may still be shown. True when alerts are allowed afterwards. */
export async function askPermission(): Promise<boolean> {
  const state = await permissionState();
  if (state === 'granted') return true;
  if (state !== 'ask') return false;
  return (await Notifications.requestPermissionsAsync()).granted;
}

/** This device's Expo push token, or null while notifications are not allowed. */
export async function deviceToken(): Promise<string | null> {
  if ((await permissionState()) !== 'granted') return null;
  const extra = Constants.expoConfig?.extra as { eas?: { projectId?: string } } | undefined;
  const projectId = extra?.eas?.projectId;
  if (!projectId) return null;
  return (await Notifications.getExpoPushTokenAsync({ projectId })).data;
}

export function onTokenChange(listener: () => void): () => void {
  const subscription = Notifications.addPushTokenListener(() => listener());
  return () => subscription.remove();
}

/** The `data` of the alert the person last tapped (also when the tap started the app). */
export function useTappedAlertData(): unknown {
  return Notifications.useLastNotificationResponse()?.notification.request.content.data ?? null;
}
