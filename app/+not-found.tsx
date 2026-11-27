/** Not found (specs §1.2) — `notFound.body` and a way back. The helpline was removed from this page (D-R3). */
import { router } from 'expo-router';
import { View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { Button, Screen, Text } from '@/components';
import { SearchX } from '@/components/icons';
import { colors } from '@/theme/tokens';

export default function NotFound() {
  const { t } = useTranslation();
  return (
    <Screen root>
      <View className="flex-1 items-center justify-center gap-s4 py-s8">
        <SearchX size={56} color={colors.text.muted} aria-hidden />
        <Text variant="heading" className="text-center" accessibilityRole="header">
          {t('notFound.body')}
        </Text>
        <Button label={t('common.back')} variant="primary" onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))} />
      </View>
    </Screen>
  );
}
