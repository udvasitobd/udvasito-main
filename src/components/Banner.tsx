/** CMP-Banner — info / warning / success / error with icon + text + optional action (never colour alone). */
import type { ReactNode } from 'react';
import { View } from 'react-native';

import { cn } from '@/lib/cn';
import { colors } from '@/theme/tokens';

import { CircleAlert, CircleCheck, Info, TriangleAlert } from './icons';
import { Text } from './Text';

const kinds = {
  info: { Icon: Info, bg: 'bg-info-bg', color: colors.status.info, tone: 'info' },
  warning: { Icon: TriangleAlert, bg: 'bg-warning-bg', color: colors.status.warning, tone: 'warning' },
  success: { Icon: CircleCheck, bg: 'bg-success-bg', color: colors.status.successText, tone: 'success' },
  error: { Icon: CircleAlert, bg: 'bg-danger-bg', color: colors.status.error, tone: 'danger' },
} as const;

export type BannerProps = {
  kind: keyof typeof kinds;
  title?: string;
  text: string;
  action?: ReactNode;
  className?: string;
};

export function Banner({ kind, title, text, action, className }: BannerProps) {
  const k = kinds[kind];
  return (
    <View
      accessibilityRole={kind === 'error' ? 'alert' : undefined}
      accessibilityLiveRegion="polite"
      className={cn('flex-row gap-s3 rounded-md p-s4', k.bg, className)}
    >
      <k.Icon size={22} color={k.color} aria-hidden />
      <View className="flex-1 gap-s2">
        {title ? (
          <Text variant="bodyStrong" tone={k.tone}>
            {title}
          </Text>
        ) : null}
        <Text tone={title ? 'default' : k.tone}>{text}</Text>
        {action}
      </View>
    </View>
  );
}
