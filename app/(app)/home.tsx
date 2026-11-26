/**
 * SCR-H01 · Home — P0 version. Only things that work are shown (build-prompts P0, specs §1.9): the header language
 * toggle and Sign out. The Home sections arrive with the features they belong to (P1+).
 */
import { router } from 'expo-router';
import { LogOut } from 'lucide-react-native';
import { useState } from 'react';
import { View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { Banner, Button, LogoMark, Screen, Text } from '@/components';
import { authClient } from '@/lib/convex';

export default function Home() {
  const { t } = useTranslation();
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);

  const signOut = async () => {
    setBusy(true);
    setFailed(false);
    try {
      const result = await authClient.signOut();
      if (result.error) throw new Error(result.error.message);
      router.replace('/sign-in');
    } catch {
      setFailed(true);
      setBusy(false);
    }
  };

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
        <View className="w-full max-w-sm gap-s3">
          {failed ? <Banner kind="error" text={t('errors.ERR_INTERNAL')} /> : null}
          <Button label={t('settings.signOut')} variant="secondary" icon={LogOut} block loading={busy} onPress={() => void signOut()} />
        </View>
      </View>
    </Screen>
  );
}
