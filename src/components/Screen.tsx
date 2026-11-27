/**
 * Screen frame — specs §1.4.2 header (back button when not a root · title · CMP-LanguageToggle · CMP-PracticeBadge)
 * + CMP-OfflineBanner + scrollable content (16 px padding on phones, 24 px from 768 px, max width 720).
 */
import { router } from 'expo-router';
import type { ReactNode } from 'react';
import { Pressable, ScrollView, useWindowDimensions, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';

import { cn } from '@/lib/cn';
import { breakpoints, colors } from '@/theme/tokens';

import { ChevronLeft } from './icons';
import { LanguageToggle } from './LanguageToggle';
import { OfflineBanner } from './OfflineBanner';
import { PracticeBadge } from './PracticeBadge';
import { Text } from './Text';

/** The UDVASITO symbol (assets/logo/udvasito-symbol-red.svg) — a mark only, never behind text (§1.3.1). */
export function LogoMark({ size = 32, color = colors.brand.logoRed }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={(size * 97.885) / 89.109} viewBox="0 0 89.109 97.885" aria-hidden>
      <Path
        fillRule="evenodd"
        fill={color}
        d="M 42.453 1.146 A 2.500 2.500 0 0 1 46.655 1.146 L 66.409 31.802 A 26.000 26.000 0 1 1 22.699 31.802 Z M 27.574 39.705 A 18.070 18.070 0 0 1 37.785 29.131 A 1.950 1.950 0 0 1 39.246 32.747 A 14.170 14.170 0 0 0 31.239 41.039 A 1.950 1.950 0 0 1 27.574 39.705 Z"
      />
      <Path
        fill={color}
        d="M 82.596 58.246 A 40.000 40.000 0 0 1 6.512 58.246 A 3.000 3.000 0 0 1 12.218 56.392 A 34.000 34.000 0 0 0 76.890 56.392 A 3.000 3.000 0 0 1 82.596 58.246 Z"
      />
      <Path
        fill={color}
        d="M 88.653 73.441 A 52.000 52.000 0 0 1 0.455 73.441 A 3.000 3.000 0 0 1 5.544 70.261 A 46.000 46.000 0 0 0 83.564 70.261 A 3.000 3.000 0 0 1 88.653 73.441 Z"
      />
    </Svg>
  );
}

type Props = {
  title?: string;
  /** Root screens show the logo instead of a back button. */
  root?: boolean;
  practice?: boolean;
  children: ReactNode;
  footer?: ReactNode;
  scroll?: boolean;
  contentClassName?: string;
};

const NARROW_HEADER = 420;

export function Screen({
  title,
  root = false,
  practice = false,
  children,
  footer,
  scroll = true,
  contentClassName,
}: Props) {
  const { t } = useTranslation();
  const { width } = useWindowDimensions();
  const pad = width >= breakpoints.md ? 'px-s6' : 'px-s4';
  // Below this width the practice pill would squeeze the title to nothing, so it gets its own row under the header.
  const narrow = width < NARROW_HEADER;

  const back = () => (router.canGoBack() ? router.back() : router.replace('/home'));

  const body = (
    <View className={cn('w-full max-w-content self-center gap-s4 py-s4', pad, contentClassName)}>{children}</View>
  );

  return (
    <SafeAreaView edges={['top', 'left', 'right']} className="flex-1 bg-app">
      <OfflineBanner />
      <View className={cn('flex-row items-center gap-s2 border-b border-line bg-app py-s2', pad)}>
        {root ? (
          <View className="min-h-touch flex-row items-center gap-s2">
            <LogoMark />
            <Text variant="heading" tone="brand" accessibilityRole="header">
              {title ?? t('common.appName')}
            </Text>
          </View>
        ) : (
          <>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t('common.back')}
              onPress={back}
              className="min-h-touch min-w-touch items-center justify-center rounded-pill active:bg-surface web:hover:bg-surface"
            >
              <ChevronLeft size={26} color={colors.text.primary} aria-hidden />
            </Pressable>
            {title ? (
              <Text variant="heading" accessibilityRole="header" numberOfLines={1} className="flex-1">
                {title}
              </Text>
            ) : null}
          </>
        )}
        {root || !title ? <View className="flex-1" /> : null}
        {practice && !narrow ? <PracticeBadge /> : null}
        <LanguageToggle />
      </View>
      {practice && narrow ? (
        <View className={cn('items-center border-b border-line bg-app py-s1', pad)}>
          <PracticeBadge />
        </View>
      ) : null}
      {scroll ? (
        <ScrollView className="flex-1 bg-app" contentContainerClassName="grow" keyboardShouldPersistTaps="handled">
          {body}
        </ScrollView>
      ) : (
        <View className="flex-1">{body}</View>
      )}
      {footer ? (
        <SafeAreaView edges={['bottom']} className={cn('border-t border-line bg-app py-s3', pad)}>
          {footer}
        </SafeAreaView>
      ) : null}
    </SafeAreaView>
  );
}
