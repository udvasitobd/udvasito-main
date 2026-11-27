/**
 * A small labelled pill — blood group, component, a response state, "Hospital slip verified". The words carry the
 * meaning; the colour only repeats it (never colour alone, specs §1.7).
 */
import { View } from 'react-native';

import { cn } from '@/lib/cn';
import { colors } from '@/theme/tokens';

import type { LucideIcon } from './icons';
import { Text } from './Text';

const tones = {
  brand: { bg: 'bg-brand-primarySoft', text: 'brand', icon: colors.brand.primary },
  neutral: { bg: 'bg-surface', text: 'default', icon: colors.text.muted },
  success: { bg: 'bg-success-bg', text: 'success', icon: colors.status.successText },
  info: { bg: 'bg-info-bg', text: 'info', icon: colors.status.info },
  warning: { bg: 'bg-warning-bg', text: 'warning', icon: colors.status.warning },
} as const;

type ChipProps = {
  label: string;
  tone?: keyof typeof tones;
  icon?: LucideIcon;
  /** Spoken instead of the label (e.g. a blood group's name). */
  accessibilityLabel?: string;
};

export function Chip({ label, tone = 'neutral', icon: Icon, accessibilityLabel }: ChipProps) {
  const style = tones[tone];
  return (
    <View
      className={cn('flex-row items-center gap-s1 self-start rounded-pill px-s3 py-s1', style.bg)}
      {...(accessibilityLabel ? { accessible: true, accessibilityLabel } : {})}
    >
      {Icon ? <Icon size={14} color={style.icon} strokeWidth={2.5} aria-hidden /> : null}
      <Text variant="small" tone={style.text} className="font-semibold">
        {label}
      </Text>
    </View>
  );
}
