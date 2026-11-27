/** Under 18 (SCR-O03, G-13): the under-age message, the helpline and sign out — after onboarding and on /account-status. */
import { View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { HelplineButton, Screen, Text } from '@/components';

import { SignOutButton } from './SignOutButton';

export function Underage() {
  const { t } = useTranslation();
  return (
    <Screen root>
      <View className="gap-s4 py-s6">
        <Text variant="title" accessibilityRole="header">
          {t('onboarding.underage.title')}
        </Text>
        <Text>{t('onboarding.underage.body')}</Text>
      </View>
      <HelplineButton labelKey="request.fallbackTitle" variant="primary" />
      <SignOutButton />
    </Screen>
  );
}
