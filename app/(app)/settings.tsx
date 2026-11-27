/**
 * SCR-M06 · Settings — P1 shell: language, terms, privacy notice, sign out (build-prompts P1 slice 5). Profile,
 * phone verification, notifications and "Privacy & my data" join with their features (specs §1.9).
 */
import { router } from 'expo-router';
import { View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { LanguageToggle, ListGroup, ListRow, Screen, Text } from '@/components';
import { FileText, ShieldCheck } from '@/components/icons';
import { SignOutButton } from '@/features/account/SignOutButton';
import { LEGAL_READY } from '@/features/legal/LegalDoc';

export default function SettingsScreen() {
  const { t } = useTranslation();
  return (
    <Screen title={t('settings.title')}>
      <View className="gap-s2">
        <Text variant="bodyStrong" aria-hidden>
          {t('settings.language')}
        </Text>
        <LanguageToggle large />
      </View>
      {LEGAL_READY ? (
        <ListGroup>
          <ListRow label={t('welcome.terms')} icon={FileText} onPress={() => router.push('/terms')} />
          <ListRow label={t('settings.privacy')} icon={ShieldCheck} onPress={() => router.push('/privacy')} />
        </ListGroup>
      ) : null}
      <SignOutButton />
    </Screen>
  );
}
