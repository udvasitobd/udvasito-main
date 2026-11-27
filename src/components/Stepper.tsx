/**
 * A number stepper (SCR-M02 units, VAL-06): − value + with ≥ 48 dp buttons. The buttons carry their own labels
 * ("Increase bags" / "Decrease bags"); the value is announced when it changes.
 */
import { Pressable, View } from 'react-native';

import { colors } from '@/theme/tokens';

import { Field } from './Field';
import { Minus, Plus, type LucideIcon } from './icons';
import { Text } from './Text';

type Props = {
  label: string;
  value: number;
  min: number;
  max: number;
  /** +1 or −1; the owner applies it to its latest value (two quick taps both count). */
  onStep: (delta: 1 | -1) => void;
  /** The value as shown and announced, e.g. "2 bags". */
  valueText: string;
  increaseLabel: string;
  decreaseLabel: string;
  error?: string;
};

function StepButton({
  icon: Icon,
  label,
  disabled,
  onPress,
}: {
  icon: LucideIcon;
  label: string;
  disabled: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      hitSlop={4}
      className={`min-h-touch min-w-touch items-center justify-center rounded-sm border-2 border-brand-navy bg-app active:bg-surface web:hover:bg-surface ${disabled ? 'opacity-40' : ''}`}
    >
      <Icon size={22} color={colors.brand.navy} aria-hidden />
    </Pressable>
  );
}

export function Stepper({ label, value, min, max, onStep, valueText, increaseLabel, decreaseLabel, error }: Props) {
  return (
    <Field label={label} error={error}>
      <View className="flex-row items-center gap-s4">
        <StepButton icon={Minus} label={decreaseLabel} disabled={value <= min} onPress={() => onStep(-1)} />
        <Text
          variant="title"
          className="min-w-20 text-center"
          accessibilityLabel={`${label}: ${valueText}`}
          accessibilityLiveRegion="polite"
          aria-live="polite"
        >
          {valueText}
        </Text>
        <StepButton icon={Plus} label={increaseLabel} disabled={value >= max} onPress={() => onStep(1)} />
      </View>
    </Field>
  );
}
