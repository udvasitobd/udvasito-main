/**
 * SCR-M01 · Home. Sections appear only when their feature works (specs §1.9): the verify banner once a verification
 * method is on; the hero "Need blood?" with the request form, "Become a donor" with donor setup, and so on.
 */
import { api } from '@convex/_generated/api';
import { useQuery } from 'convex/react';
import { router } from 'expo-router';
import { View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { Banner, Button, LogoMark, Screen, Text } from '@/components';
import { useAppConfig } from '@/lib/appConfig';
import { canVerify } from '@/lib/verification';

export default function Home() {
  const { t } = useTranslation();
  const config = useAppConfig();
  const me = useQuery(api.profiles.me);
  const showVerify = me?.profile?.phoneVerified === false && canVerify(config);

  return (
    <Screen root>
      {showVerify ? (
        <Banner
          kind="warning"
          text={t('home.verifyBanner')}
          action={
            <Button label={t('home.verifyCta')} variant="secondary" size="sm" onPress={() => router.push('/verify-phone')} />
          }
        />
      ) : null}
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
