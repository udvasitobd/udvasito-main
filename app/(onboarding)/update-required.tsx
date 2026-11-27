/**
 * SCR-O05 · Update required (gate G1, Android app only): this version is older than `settings.minimumAppVersion`.
 * "Download update" opens `settings.apkUrl` (shown only once a release exists); "Use the web app" always works.
 */
import { Linking, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { Button, Screen, Text } from '@/components';
import { Download, Smartphone } from '@/components/icons';
import { useAppConfig } from '@/lib/appConfig';
import { WEB_APP_URL } from '@/lib/links';

export default function UpdateRequired() {
  const { t } = useTranslation();
  const config = useAppConfig();
  const apkUrl = config?.apkUrl ?? '';

  return (
    <Screen root>
      <View className="gap-s4 py-s6">
        <Text variant="title" accessibilityRole="header">
          {t('update.title')}
        </Text>
        <Text>{t('update.body')}</Text>
      </View>
      {apkUrl !== '' ? (
        <Button label={t('update.download')} icon={Download} block onPress={() => void Linking.openURL(apkUrl)} />
      ) : null}
      <Button
        label={t('update.useWeb')}
        icon={Smartphone}
        variant={apkUrl !== '' ? 'secondary' : 'primary'}
        block
        onPress={() => void Linking.openURL(WEB_APP_URL)}
      />
    </Screen>
  );
}
