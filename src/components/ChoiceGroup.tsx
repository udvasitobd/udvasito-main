/**
 * A set of choice chips that act as radio buttons (gender, travel range, donation type, availability). Label above,
 * error below (CMP-Input rules); the chosen chip shows a check mark as well as its colour. Each chip is ≥ 48 dp.
 * `column` stacks long labels full width.
 */
import { Pressable, View } from 'react-native';

import { cn } from '@/lib/cn';
import { colors } from '@/theme/tokens';

import { FieldError } from './Field';
import { Check } from './icons';
import { Text } from './Text';

export type ChoiceOption<T extends string> = { value: T; label: string };

type Props<T extends string> = {
  label: string;
  value: T | null;
  options: readonly ChoiceOption<T>[];
  onChange: (value: T) => void;
  layout?: 'row' | 'column';
  helper?: string;
  error?: string;
  disabled?: boolean;
};

export function ChoiceGroup<T extends string>({
  label,
  value,
  options,
  onChange,
  layout = 'row',
  helper,
  error,
  disabled = false,
}: Props<T>) {
  return (
    <View className="gap-s2">
      <Text variant="bodyStrong" aria-hidden>
        {label}
      </Text>
      <View
        accessibilityRole="radiogroup"
        aria-label={label}
        className={cn('gap-s2', layout === 'row' ? 'flex-row flex-wrap' : 'flex-col')}
      >
        {options.map((option) => {
          const selected = option.value === value;
          return (
            <Pressable
              key={option.value}
              accessibilityRole="radio"
              accessibilityState={{ checked: selected, disabled }}
              aria-checked={selected}
              accessibilityLabel={option.label}
              disabled={disabled}
              onPress={() => onChange(option.value)}
              className={cn(
                'min-h-touch flex-row items-center gap-s2 rounded-sm border px-s4 py-s2',
                layout === 'column' ? 'w-full' : 'grow justify-center',
                selected
                  ? 'border-2 border-brand-primary bg-brand-primarySoft'
                  : 'border-line-input bg-app active:bg-surface',
                disabled && 'opacity-40',
              )}
            >
              {selected ? <Check size={18} color={colors.brand.primary} strokeWidth={3} aria-hidden /> : null}
              <Text variant="bodyStrong" tone={selected ? 'brand' : 'default'} className="shrink" aria-hidden>
                {option.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
      {helper ? (
        <Text variant="small" tone="muted">
          {helper}
        </Text>
      ) : null}
      {error ? <FieldError text={error} /> : null}
    </View>
  );
}
