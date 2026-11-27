/**
 * Checkbox with the full sentence as its label (SCR-O01 a11y: "checkbox label is the full sentence"). The whole row
 * is the touch target (≥ 48 dp); the ticked state is shown by the check mark, not by colour alone.
 */
import { Pressable, View } from 'react-native';

import { cn } from '@/lib/cn';
import { colors } from '@/theme/tokens';

import { Check } from './icons';
import { Text } from './Text';

type Props = { label: string; checked: boolean; onChange: (checked: boolean) => void; disabled?: boolean };

export function Checkbox({ label, checked, onChange, disabled = false }: Props) {
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked, disabled }}
      aria-checked={checked}
      accessibilityLabel={label}
      disabled={disabled}
      onPress={() => onChange(!checked)}
      className="min-h-touch flex-row items-start gap-s3 rounded-sm py-s2 active:bg-surface web:hover:bg-surface"
    >
      <View
        className={cn(
          'mt-0.5 h-6 w-6 items-center justify-center rounded-sm border-2',
          checked ? 'border-brand-primary bg-brand-primary' : 'border-line-input bg-app',
        )}
      >
        {checked ? <Check size={18} color={colors.text.inverse} strokeWidth={3} aria-hidden /> : null}
      </View>
      <Text className="flex-1" aria-hidden>
        {label}
      </Text>
    </Pressable>
  );
}
