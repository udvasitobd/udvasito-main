/**
 * CMP-BloodGroupPicker (specs §1.3.5): a 4 × 2 grid of large tiles A+ … O−, then full-width rows for the extra
 * choices a screen offers ("I don't know my group" in donor setup; "Not sure" / "Any group" on the request form).
 * Selected = soft red background + check icon (never colour alone). Each tile is a radio ≥ 48 dp.
 */
import { BLOOD_GROUPS, type BloodGroup } from '@convex/rules/compatibility';
import { Pressable, View } from 'react-native';

import { cn } from '@/lib/cn';
import { colors } from '@/theme/tokens';

import { FieldError } from './Field';
import { Check } from './icons';
import { Text } from './Text';

/** "A-" → "A−" (a real minus sign reads better and screen readers say "minus"). */
export function groupLabel(group: BloodGroup): string {
  return group.replace('-', '−');
}

type Extra<T extends string> = { value: T; label: string };

type Props<T extends string> = {
  label: string;
  value: BloodGroup | T | null;
  onChange: (value: BloodGroup | T) => void;
  extras?: readonly Extra<T>[];
  error?: string;
  /** 'title' when the question is the screen's heading (donor setup step 1). */
  labelVariant?: 'bodyStrong' | 'title';
};

function Choice({
  selected,
  label,
  onPress,
  wide,
}: {
  selected: boolean;
  label: string;
  onPress: () => void;
  wide: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ checked: selected }}
      aria-checked={selected}
      accessibilityLabel={label}
      onPress={onPress}
      className={cn(
        'min-h-touch flex-row items-center justify-center gap-s2 rounded-md border px-s3 py-s3',
        wide ? 'w-full' : 'basis-[22%] grow',
        selected ? 'border-2 border-brand-primary bg-brand-primarySoft' : 'border-line-input bg-app active:bg-surface',
      )}
    >
      {selected ? <Check size={18} color={colors.brand.primary} strokeWidth={3} aria-hidden /> : null}
      <Text variant={wide ? 'bodyStrong' : 'heading'} tone={selected ? 'brand' : 'default'} aria-hidden>
        {label}
      </Text>
    </Pressable>
  );
}

export function BloodGroupPicker<T extends string = never>({
  label,
  value,
  onChange,
  extras = [],
  error,
  labelVariant = 'bodyStrong',
}: Props<T>) {
  return (
    <View className="gap-s3">
      <Text variant={labelVariant} accessibilityRole="header">
        {label}
      </Text>
      <View accessibilityRole="radiogroup" aria-label={label} className="gap-s3">
        <View className="flex-row flex-wrap gap-s3">
          {BLOOD_GROUPS.map((group) => (
            <Choice
              key={group}
              selected={value === group}
              label={groupLabel(group)}
              onPress={() => onChange(group)}
              wide={false}
            />
          ))}
        </View>
        {extras.map((extra) => (
          <Choice
            key={extra.value}
            selected={value === extra.value}
            label={extra.label}
            onPress={() => onChange(extra.value)}
            wide
          />
        ))}
      </View>
      {error ? <FieldError text={error} /> : null}
    </View>
  );
}
