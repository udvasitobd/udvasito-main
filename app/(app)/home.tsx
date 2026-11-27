/**
 * SCR-H01 · Home — P0 version. Only things that work are shown (build-prompts P0, specs §1.9): the header language
 * toggle and Sign out. The Home sections arrive with the features they belong to (P1+).
 */
import { View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { Banner, Button, LogoMark, Screen, Text } from '@/components';
import { LogOut } from '@/components/icons';
import { useSignOut } from '@/features/account/useSignOut';

export default function Home() {
  const { t } = useTranslation();
  const { signOut, busy, failed } = useSignOut();

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
