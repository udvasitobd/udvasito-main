/**
 * Text with the typography tokens of specs §1.3.2. Picks Noto Sans or Noto Sans Bengali and the matching line
 * height from the current language (Bangla needs more vertical room). `lang` overrides it for a single word in
 * the other script (e.g. "বাংলা" on the language toggle while the app is in English).
 */
import { createContext, useContext } from 'react';
import { Platform, Text as RNText, type TextProps } from 'react-native';
import { useTranslation } from 'react-i18next';

import { cn } from '@/lib/cn';
import { isLanguage, type Language } from '@/lib/language';
import { colors, fontFamily, typography, type TypeToken } from '@/theme/tokens';

/** True once the Noto fonts are loaded (gate G2); until then the system font is used. */
export const FontsLoadedContext = createContext(false);

export function useLanguage(): Language {
  const { i18n } = useTranslation();
  return isLanguage(i18n.language) ? i18n.language : 'en';
}

export function fontFor(language: Language, weight: 400 | 600 | 700, loaded: boolean) {
  if (!loaded) return { fontWeight: String(weight) as '400' | '600' | '700' };
  const primary = fontFamily[language][weight];
  if (Platform.OS === 'web') {
    // A CSS stack, so a word in the other script still finds its glyphs.
    const other = fontFamily[language === 'bn' ? 'en' : 'bn'][weight];
    return { fontFamily: `${primary}, ${other}, system-ui, sans-serif` };
  }
  return { fontFamily: primary };
}

export type AppTextProps = TextProps & {
  variant?: TypeToken;
  tone?: 'default' | 'muted' | 'inverse' | 'brand' | 'success' | 'warning' | 'danger' | 'info';
  lang?: Language;
  className?: string;
};

const toneColor: Record<NonNullable<AppTextProps['tone']>, string> = {
  default: colors.text.primary,
  muted: colors.text.muted,
  inverse: colors.text.inverse,
  brand: colors.brand.primary,
  success: colors.status.successText,
  warning: colors.status.warning,
  danger: colors.status.error,
  info: colors.status.info,
};

export function Text({ variant = 'body', tone = 'default', lang, style, className, ...rest }: AppTextProps) {
  const current = useLanguage();
  const language = lang ?? current;
  const loaded = useContext(FontsLoadedContext);
  const t = typography[variant];
  const heading = variant === 'display' || variant === 'title' || variant === 'heading';
  return (
    <RNText
      role={heading && Platform.OS === 'web' ? 'heading' : undefined}
      aria-level={heading && Platform.OS === 'web' ? (variant === 'heading' ? 2 : 1) : undefined}
      lang={Platform.OS === 'web' && lang ? lang : undefined}
      className={cn(className)}
      style={[
        {
          fontSize: t.size,
          lineHeight: language === 'bn' ? t.lineBn : t.lineEn,
          color: toneColor[tone],
        },
        fontFor(language, t.weight, loaded),
        style,
      ]}
      {...rest}
    />
  );
}
