/**
 * Campus-drive attribution (V07, roadmap F-102): a QR code or link carries `?c=<code>`; the code is remembered on the
 * device and sent once with `profiles.completeOnboarding`, which keeps it only if it names an active campaign.
 * Attribution only — the code never changes what anyone can do or see.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Linking from 'expo-linking';
import { useEffect } from 'react';

const KEY = 'udvasito.campaign';
/** Same shape the server accepts (profiles.ts); anything else is ignored. */
const CODE = /^[A-Za-z0-9_-]{1,32}$/;

/** The campaign code in a URL (`…?c=CU-DRIVE-1`), or null. */
export function campaignFromUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  const beforeHash = url.split('#')[0] ?? '';
  const query = beforeHash.indexOf('?');
  if (query === -1) return null;
  let code: string | null;
  try {
    code = new URLSearchParams(beforeHash.slice(query + 1)).get('c');
  } catch {
    return null;
  }
  const trimmed = code?.trim() ?? '';
  return CODE.test(trimmed) ? trimmed : null;
}

export async function rememberCampaign(code: string): Promise<void> {
  try {
    await AsyncStorage.setItem(KEY, code);
  } catch {
    // Private browsing: attribution is best effort.
  }
}

export async function readCampaign(): Promise<string | undefined> {
  try {
    const value = await AsyncStorage.getItem(KEY);
    return value && CODE.test(value) ? value : undefined;
  } catch {
    return undefined;
  }
}

export async function forgetCampaign(): Promise<void> {
  try {
    await AsyncStorage.removeItem(KEY);
  } catch {
    // Nothing to do.
  }
}

/** Remembers `?c=` from the link that opened the app (web URL, QR deep link). The latest scan wins. */
export function useCampaignCapture(): void {
  const url = Linking.useLinkingURL();
  useEffect(() => {
    const code = campaignFromUrl(url);
    if (code) void rememberCampaign(code);
  }, [url]);
}
