/** CMP-PracticeBadge — yellow "PRACTICE / অনুশীলন" pill on every practice screen (specs §1.9). */
import { View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { colors } from '@/theme/tokens';

import { FlaskConical } from './icons';
import { Text } from './Text';

export function PracticeBadge() {
  const { t } = useTranslation();
  return (
    <View
      accessibilityRole="text"
      accessibilityLabel={t('common.demo')}
      className="flex-row items-center gap-s1 self-start rounded-pill bg-practice-bg px-s3 py-s1"
    >
      <FlaskConical size={14} color={colors.practice.text} aria-hidden />
      <Text variant="small" style={{ color: colors.practice.text }} className="tracking-wide">
        {t('common.demo')}
      </Text>
    </View>
  );
}
