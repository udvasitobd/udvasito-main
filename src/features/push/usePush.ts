/**
 * Push alerts on this device (specs §1.2.1, §6.4, §6.8). Android only in P1; on web every hook is a quiet no-op.
 * - `usePushRegistration` — mounted once in the signed-in layout: names the Android channels in the app language,
 *   registers the push token whenever notifications are allowed (at launch, when the app comes back to the front —
 *   the person may have allowed them in Android Settings — and when the token changes), and opens what a tapped
 *   alert points to (marking that alert opened, `notifications.markOpened`).
 * - `useEnablePush` — the contextual permission prompt (after donor setup, SCR-D02; "Fix" on SCR-D01).
 * - `usePushPermission` — the current permission, for the "Alerts may not reach you" banner (SCR-D01).
 */
import { api } from '@convex/_generated/api';
import type { Id } from '@convex/_generated/dataModel';
import { useMutation } from 'convex/react';
import { router, type Href } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { useTranslation } from 'react-i18next';

import { tappedHref, tappedNotificationId } from './alertPath';
import {
  askPermission,
  deviceToken,
  onTokenChange,
  permissionState,
  prepareChannels,
  pushAvailable,
  useTappedAlertData,
} from './device';
import type { PermissionState } from './types';

const quietly = (work: Promise<unknown>) => void work.catch(() => undefined);

function onForeground(listener: () => void): () => void {
  const subscription = AppState.addEventListener('change', (state) => {
    if (state === 'active') listener();
  });
  return () => subscription.remove();
}

export function usePushRegistration(): void {
  const { t, i18n } = useTranslation();
  const register = useMutation(api.push.registerExpoToken);
  const registered = useRef<string | null>(null);

  useEffect(() => {
    if (!pushAvailable) return;
    quietly(
      prepareChannels({
        bloodRequests: t('notifications.channel.bloodRequests'),
        updates: t('notifications.channel.updates'),
      }),
    );
  }, [t, i18n.language]);

  useEffect(() => {
    if (!pushAvailable) return;
    const sync = async () => {
      const token = await deviceToken();
      if (!token || token === registered.current) return;
      await register({ token });
      registered.current = token;
    };
    quietly(sync());
    const stopToken = onTokenChange(() => quietly(sync()));
    const stopForeground = onForeground(() => quietly(sync()));
    return () => {
      stopToken();
      stopForeground();
    };
  }, [register]);

  const tapped = useTappedAlertData();
  const opened = useRef<unknown>(null);
  const markOpened = useMutation(api.notifications.markOpened);
  useEffect(() => {
    if (!tapped || tapped === opened.current) return;
    opened.current = tapped;
    const notificationId = tappedNotificationId(tapped);
    if (notificationId) quietly(markOpened({ notificationId: notificationId as Id<'notifications'> }));
    const href = tappedHref(tapped);
    if (href) router.push(href as Href);
  }, [tapped, markOpened]);
}

/** Shows the Android permission dialog (when it may still be shown) and registers this device. */
export function useEnablePush(): () => Promise<PermissionState> {
  const register = useMutation(api.push.registerExpoToken);
  return useCallback(async () => {
    if (!pushAvailable) return 'unavailable';
    const granted = await askPermission().catch(() => false);
    if (!granted) return permissionState().catch(() => 'unavailable' as const);
    const token = await deviceToken().catch(() => null);
    if (token) await register({ token }).catch(() => undefined);
    return 'granted';
  }, [register]);
}

/** null while checking. Re-checked whenever the app comes back to the front. */
export function usePushPermission(): [PermissionState | null, (state: PermissionState) => void] {
  const [state, setState] = useState<PermissionState | null>(pushAvailable ? null : 'unavailable');
  useEffect(() => {
    if (!pushAvailable) return;
    const check = () => quietly(permissionState().then(setState));
    check();
    return onForeground(check);
  }, []);
  return [state, setState];
}
