/**
 * CMP-Button — specs §1.3.5. Variants primary / secondary (navy outline) / ghost / danger (primary outline +
 * warning icon). States: pressed, disabled (40 % + aria-disabled), loading (spinner; the label stays
 * for screen readers). Touch target ≥ 48 dp; primary 52 dp tall.
 */
import { cva, type VariantProps } from 'class-variance-authority';
import type { ReactNode } from 'react';
import { ActivityIndicator, Pressable, View, type PressableProps } from 'react-native';

import { cn } from '@/lib/cn';
import { colors } from '@/theme/tokens';

import { TriangleAlert, type LucideIcon } from './icons';
import { Text } from './Text';

const button = cva('flex-row items-center justify-center gap-s2 rounded-sm px-s4 web:focus-visible:outline-none', {
  variants: {
    variant: {
      primary: 'bg-brand-primary active:bg-brand-primaryPressed web:hover:bg-brand-primaryPressed min-h-btn-primary',
      secondary: 'border-2 border-brand-navy bg-app active:bg-surface web:hover:bg-surface min-h-touch',
      ghost: 'bg-transparent active:bg-surface web:hover:bg-surface min-h-touch',
      danger: 'border-2 border-brand-primary bg-app active:bg-brand-primarySoft web:hover:bg-brand-primarySoft min-h-touch',
      inverse: 'bg-app active:bg-brand-primarySoft web:hover:bg-brand-primarySoft min-h-btn-primary',
    },
    size: { md: '', sm: 'min-h-touch px-s3' },
    block: { true: 'w-full', false: 'self-start' },
  },
  defaultVariants: { variant: 'primary', size: 'md', block: false },
});

const labelTone = {
  primary: 'inverse',
  secondary: 'default',
  ghost: 'brand',
  danger: 'brand',
  inverse: 'brand',
} as const;

const spinnerColor = {
  primary: colors.text.inverse,
  secondary: colors.brand.navy,
  ghost: colors.brand.primary,
  danger: colors.brand.primary,
  inverse: colors.brand.primary,
} as const;

export type ButtonProps = Omit<PressableProps, 'children'> &
  VariantProps<typeof button> & {
    label: string;
    loading?: boolean;
    icon?: LucideIcon;
    /** Custom leading element (e.g. the Google "G" mark) instead of a lucide icon. */
    leading?: ReactNode;
    className?: string;
  };

export function Button({
  label,
  variant = 'primary',
  size,
  block,
  loading = false,
  disabled,
  icon,
  leading,
  className,
  accessibilityHint,
  ...rest
}: ButtonProps) {
  const v = variant ?? 'primary';
  const isDisabled = Boolean(disabled) || loading;
  const Icon = v === 'danger' && !icon ? TriangleAlert : icon;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={accessibilityHint}
      aria-disabled={isDisabled}
      aria-busy={loading}
      disabled={isDisabled}
      hitSlop={4}
      className={cn(button({ variant: v, size, block }), isDisabled && 'opacity-40', className)}
      {...rest}
    >
      {loading ? (
        <ActivityIndicator color={spinnerColor[v]} aria-hidden />
      ) : (
        (leading ?? (Icon ? <Icon size={20} color={spinnerColor[v]} aria-hidden /> : null))
      )}
      <View>
        <Text variant="bodyStrong" tone={labelTone[v]} maxFontSizeMultiplier={2} numberOfLines={2} className="text-center">
          {label}
        </Text>
      </View>
    </Pressable>
  );
}
