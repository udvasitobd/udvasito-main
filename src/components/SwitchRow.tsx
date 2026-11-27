/**
 * An on/off setting with its full sentence as the label (platelet opt-in, "I'll call them"). The whole row toggles;
 * the switch shows its state by position as well as colour.
 */
import { Pressable, Switch, View } from 'react-native';

import { colors } from '@/theme/tokens';

import { Text } from './Text';

type Props = { label: string; value: boolean; onChange: (value: boolean) => void; helper?: string };

export function SwitchRow({ label, value, onChange, helper }: Props) {
  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityState={{ checked: value }}
      aria-checked={value}
      accessibilityLabel={label}
      accessibilityHint={helper}
      onPress={() => onChange(!value)}
      className="min-h-touch flex-row items-center gap-s3 rounded-sm py-s2 active:bg-surface web:hover:bg-surface"
    >
      <View className="flex-1 gap-s1" aria-hidden>
        <Text>{label}</Text>
        {helper ? (
          <Text variant="small" tone="muted">
            {helper}
          </Text>
        ) : null}
      </View>
      <Switch
        value={value}
        onValueChange={onChange}
        trackColor={{ false: colors.border.input, true: colors.brand.primary }}
        thumbColor={colors.bg.app}
        aria-hidden
        importantForAccessibility="no-hide-descendants"
        accessibilityElementsHidden
      />
    </Pressable>
  );
}
