/**
 * Language choice — PRD F-104, specs §1.6 rule 2. Pure (no React Native imports) so it is unit-tested.
 *
 * Order:
 *   1. A shared link's `?lang=` (shared links keep their language). Not remembered — only the person's own pick is.
 *   2. The language the person picked (stored on the device; `profiles.language` when signed in).
 *   3. Bangla if the device or browser language is Bangla (`bn`, `bn-BD`, `bn-IN`).
 *   4. English.
 */
export const LANGUAGES = ['en', 'bn'] as const;
export type Language = (typeof LANGUAGES)[number];

export const isLanguage = (value: unknown): value is Language => value === 'en' || value === 'bn';

export function pickLanguage(input: {
  urlLang?: string | null;
  stored?: string | null;
  deviceLanguages?: readonly (string | null | undefined)[];
}): Language {
  const fromUrl = input.urlLang?.trim().toLowerCase();
  if (isLanguage(fromUrl)) return fromUrl;
  if (isLanguage(input.stored)) return input.stored;
  const bangla = (input.deviceLanguages ?? []).some((tag) => typeof tag === 'string' && /^bn(\b|[-_])/i.test(tag));
  return bangla ? 'bn' : 'en';
}

/** Locale for Intl number and date formatting (§1.6 rule 3). */
export const intlLocale = (language: Language) => (language === 'bn' ? 'bn-BD' : 'en-BD');
