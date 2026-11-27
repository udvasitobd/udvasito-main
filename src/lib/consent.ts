/**
 * The device's consent record (gate G3, SCR-O01): `{consentVersion, acceptedAt, lang}` in AsyncStorage.
 * The welcome screen writes it; a server `consents` row for the current version also counts (then the local record
 * is written from it, so a new device or reinstall does not ask again).
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState } from 'react';

import type { Language } from './language';

const KEY = 'udvasito.consent';

export type LocalConsent = { consentVersion: string; acceptedAt: number; lang: Language };

let cached: LocalConsent | null | undefined;
const listeners = new Set<(c: LocalConsent | null) => void>();

export async function readLocalConsent(): Promise<LocalConsent | null> {
  if (cached !== undefined) return cached;
  try {
    const raw = await AsyncStorage.getItem(KEY);
    const parsed = raw ? (JSON.parse(raw) as Partial<LocalConsent>) : null;
    cached = parsed && typeof parsed.consentVersion === 'string' ? (parsed as LocalConsent) : null;
  } catch {
    cached = null;
  }
  return cached;
}

export async function writeLocalConsent(record: LocalConsent): Promise<void> {
  cached = record;
  for (const l of listeners) l(record);
  try {
    await AsyncStorage.setItem(KEY, JSON.stringify(record));
  } catch {
    // Private browsing: consent still counts for this visit.
  }
}

/** The stored consent version; `undefined` while reading, `null` when there is none. */
export function useLocalConsentVersion(): string | null | undefined {
  const [value, setValue] = useState<string | null | undefined>(cached === undefined ? undefined : (cached?.consentVersion ?? null));
  useEffect(() => {
    let alive = true;
    void readLocalConsent().then((c) => alive && setValue(c?.consentVersion ?? null));
    const listener = (c: LocalConsent | null) => setValue(c?.consentVersion ?? null);
    listeners.add(listener);
    return () => {
      alive = false;
      listeners.delete(listener);
    };
  }, []);
  return value;
}
