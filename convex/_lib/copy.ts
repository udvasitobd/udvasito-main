/**
 * Words Convex sends by itself (Telegram bot replies). They come from the same `src/i18n/*.json` as the app, which
 * `npm run copy:extract` builds from specs (CLAUDE.md rule 13). A reply carries both languages, English first.
 */
import bn from '../../src/i18n/bn.json';
import en from '../../src/i18n/en.json';

export type CopyKey = keyof typeof en & keyof typeof bn;

export function copyText(key: CopyKey, language: 'en' | 'bn'): string {
  return (language === 'bn' ? bn : en)[key];
}

/** "English\nবাংলা" — for a reader whose language we do not know. */
export function bilingual(key: CopyKey, separator = '\n'): string {
  return `${copyText(key, 'en')}${separator}${copyText(key, 'bn')}`;
}
