/**
 * SCR-M01 · Home. Sections appear only when their feature works (specs §1.9): the hero "Need blood?" with the
 * request form, "Become a donor" with donor setup, the verify banner with phone verification, and so on.
 */
import { View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { LogoMark, Screen, Text } from '@/components';

export default function Home() {
  const { t } = useTranslation();

  return (
    <Screen root>
      <View className="flex-1 items-center justify-center gap-s6 py-s8">
        <LogoMark size={88} />
        <View className="items-center gap-s2">
          <Text variant="title" tone="brand" className="text-center">
            {t('common.appName')}
          </Text>
          <Text tone="muted" className="text-center">
            {t('common.tagline')}
          </Text>
        </View>
      </View>
    </Screen>
  );
}
