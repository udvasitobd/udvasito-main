/** "Sign out" with its failure message — More, Settings, account status and the under-18 screen. */
import { View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { Banner, Button } from '@/components';
import { LogOut } from '@/components/icons';

import { useSignOut } from './useSignOut';

export function SignOutButton() {
  const { t } = useTranslation();
  const { signOut, busy, failed } = useSignOut();
  return (
    <View className="gap-s2">
      {failed ? <Banner kind="error" text={t('errors.ERR_INTERNAL')} /> : null}
      <Button label={t('settings.signOut')} variant="secondary" icon={LogOut} block loading={busy} onPress={() => void signOut()} />
    </View>
  );
}
