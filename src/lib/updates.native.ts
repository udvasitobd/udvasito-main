/**
 * Update checks in the Android app (CMP-UpdateBanner, specs §1.3.5, Q-028).
 * - expo-updates checks when the app starts (app.config.ts `checkAutomatically: 'ON_LOAD'`) and downloads in the
 *   background; this also checks each time the app comes back to the screen — Expo's advice, never a timer.
 * - A newer app build (`settings.latestAppVersion` + `apkUrl`, ADR-007) is offered once no JavaScript update is.
 * - The website's release notes are read only once an update is offered, to save mobile data.
 * Same exports as updates.ts (web).
 */
import Constants from 'expo-constants';
import * as Updates from 'expo-updates';
import { useEffect } from 'react';
import { AppState, Linking } from 'react-native';

import { colors } from '@/theme/tokens';

import { useAppConfig } from './appConfig';
import { SITE_URL } from './links';
import { CURRENT_RELEASE_ID, loadRemoteReleases, useUpdateState, type UpdateOfferState } from './updateStore';
import { newerReleases, resolveOffer, type UpdateOffer } from './whatsNew';

const APP_VERSION = Constants.expoConfig?.version ?? '0.0.0';
const NOTES_URL = `${SITE_URL}/whats-new.json`;

export function useUpdateWatcher(): void {
  useEffect(() => {
    // Off in development builds and Expo Go, where expo-updates cannot check.
    if (!Updates.isEnabled) return;
    const subscription = AppState.addEventListener('change', (next) => {
      if (next === 'active') void Updates.checkForUpdateAsync().catch(() => undefined);
    });
    return () => subscription.remove();
  }, []);
}

export function useUpdateOffer(): UpdateOfferState {
  const updates = Updates.useUpdates();
  const config = useAppConfig();
  const { remote, dismissed } = useUpdateState();
  // A check while the app was open can find an update newer than the one already downloaded at start: then it is
  // not ready yet — "Update now" downloads the newest instead of restarting into the older one.
  const found = updates.isUpdateAvailable ? updates.availableUpdate?.updateId : undefined;
  const downloaded = updates.isUpdatePending ? updates.downloadedUpdate?.updateId : undefined;
  const offer = resolveOffer({
    native: true,
    currentId: CURRENT_RELEASE_ID,
    remote,
    ota: {
      available: updates.isUpdateAvailable,
      pending: updates.isUpdatePending && (found === undefined || found === downloaded),
      updateId: found ?? downloaded,
    },
    appVersion: APP_VERSION,
    config,
    dismissed,
  });
  const offered = offer.kind !== 'none';
  useEffect(() => {
    if (offered) void loadRemoteReleases(NOTES_URL);
  }, [offered]);
  return { offer, notes: newerReleases(remote, CURRENT_RELEASE_ID) };
}

/** Download the update if needed, then restart into it (white screen + spinner); or open the new APK's address. */
export async function applyUpdate(offer: UpdateOffer): Promise<void> {
  if (offer.kind === 'apk') {
    await Linking.openURL(offer.url);
    return;
  }
  if (offer.kind !== 'ota') return;
  if (!offer.ready) await Updates.fetchUpdateAsync();
  await Updates.reloadAsync({
    reloadScreenOptions: { backgroundColor: colors.bg.app, spinner: { color: colors.brand.primary, size: 'large' } },
  });
}
