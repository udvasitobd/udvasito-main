/**
 * CMP-SafetyCard (specs §1.3.5): the fixed `safety.money` line with a shield, shown wherever a phone number is
 * revealed.
 */
import { View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { colors } from '@/theme/tokens';

import { ShieldAlert } from './icons';
import { Text } from './Text';

export function SafetyCard() {
  const { t } = useTranslation();
  return (
    <View className="flex-row items-start gap-s3 rounded-md border border-warning bg-warning-bg p-s4">
      <ShieldAlert size={22} color={colors.status.warning} aria-hidden />
      <Text variant="bodyStrong" tone="warning" className="flex-1">
        {t('safety.money')}
      </Text>
    </View>
  );
}
