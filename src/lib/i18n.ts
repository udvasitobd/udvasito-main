/**
 * i18next set-up — specs §1.6. Flat keys (`common.back`, `validation.VAL-03.invalid`), so `keySeparator` is off.
 * Every user-facing string comes from src/i18n/en.json and bn.json, generated from docs/specs.md
 * (`npm run copy:extract`).
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getLocales } from 'expo-localization';
import { createInstance } from 'i18next';
import { initReactI18next } from 'react-i18next';
import { Platform } from 'react-native';

import bn from '@/i18n/bn.json';
import en from '@/i18n/en.json';

import { isLanguage, pickLanguage, type Language } from './language';

export type { Language } from './language';

const STORAGE_KEY = 'udvasito.language';

/** The app’s one i18next instance (react-i18next picks it up through `initReactI18next`). */
const i18n = createInstance();

function urlLanguage(): string | null {
  if (Platform.OS !== 'web' || typeof window === 'undefined') return null;
  return new URLSearchParams(window.location.search).get('lang');
}

function deviceLanguages(): string[] {
  try {
    return getLocales().map((l) => l.languageTag);
  } catch {
    return [];
  }
}

async function storedLanguage(): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

/** Web: the `lang` attribute follows the language (§1.7), so screen readers pronounce Bangla correctly. */
function applyDocumentLanguage(language: Language) {
  if (Platform.OS === 'web' && typeof document !== 'undefined') document.documentElement.lang = language;
}

let ready: Promise<Language> | null = null;

/** Starts i18n once. Resolves with the chosen language; never rejects (falls back to English). */
export function initI18n(): Promise<Language> {
  ready ??= (async () => {
    const language = pickLanguage({
      urlLang: urlLanguage(),
      stored: await storedLanguage(),
      deviceLanguages: deviceLanguages(),
    });
    await i18n.use(initReactI18next).init({
      resources: { en: { translation: en }, bn: { translation: bn } },
      lng: language,
      fallbackLng: 'en',
      supportedLngs: ['en', 'bn'],
      keySeparator: false,
      nsSeparator: false,
      interpolation: { escapeValue: false }, // React already escapes
      returnNull: false,
    });
    applyDocumentLanguage(language);
    return language;
  })();
  return ready;
}

export function currentLanguage(): Language {
  return isLanguage(i18n.language) ? i18n.language : 'en';
}

/** The person picked a language: switch now and remember it on this device. */
export async function setLanguage(language: Language): Promise<void> {
  await i18n.changeLanguage(language);
  applyDocumentLanguage(language);
  try {
    await AsyncStorage.setItem(STORAGE_KEY, language);
  } catch {
    // Storage can fail in private browsing; the switch still works for this visit.
  }
}

type PickListener = (language: Language) => void;
const pickListeners = new Set<PickListener>();

/** Listen for a language the person chose (not the device default) — saved to the profile by `profiles.updateLanguage`. */
export function onLanguagePicked(listener: PickListener): () => void {
  pickListeners.add(listener);
  return () => {
    pickListeners.delete(listener);
  };
}

/** The language toggle: switch now and tell the listeners. */
export async function chooseLanguage(language: Language): Promise<void> {
  await setLanguage(language);
  pickListeners.forEach((listener) => listener(language));
}

export { i18n };
