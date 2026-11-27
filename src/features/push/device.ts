/**
 * Push on web and iPhone: none in P1 (web push is P4; iPhone users use the web app). The Android app uses
 * `device.android.ts` instead — Metro picks the file by platform, TypeScript reads this one for the types.
 */
import type { ChannelNames, PermissionState } from './types';

export const pushAvailable = false;

export async function prepareChannels(_names: ChannelNames): Promise<void> {}

export async function permissionState(): Promise<PermissionState> {
  return 'unavailable';
}

export async function askPermission(): Promise<boolean> {
  return false;
}

export async function deviceToken(): Promise<string | null> {
  return null;
}

export function onTokenChange(_listener: () => void): () => void {
  return () => undefined;
}

/** The `data` of the alert the person last tapped (null when none). */
export function useTappedAlertData(): unknown {
  return null;
}
