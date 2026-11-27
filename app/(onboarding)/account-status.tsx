/**
 * SCR-O06 · Account status (gate G6). Title and body per status; actions: helpline (frozen, suspended), email the
 * team (banned), sign out (everyone, so a shared phone can be handed on). "View my request" (frozen) and "Cancel
 * deletion" (deletion_pending) join when requests (P1 slice 13) and account deletion (P3) exist — never before (§1.9).
 */
import { api } from '@convex/_generated/api';
import { useQuery } from 'convex/react';
import { Redirect } from 'expo-router';
import { Linking, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { Button, HelplineButton, Screen, Text, useLanguage } from '@/components';
import { Mail } from '@/components/icons';
import { LoadingScreen } from '@/features/account/Gate';
import { SignOutButton } from '@/features/account/SignOutButton';
import { Underage } from '@/features/account/Underage';
import { useAppConfig } from '@/lib/appConfig';
import { formatDhakaDate } from '@/lib/dates';

export default function AccountStatus() {
  const { t } = useTranslation();
  const language = useLanguage();
  const config = useAppConfig();
  const me = useQuery(api.profiles.me);

  if (me === undefined) return <LoadingScreen />;
  const profile = me.profile;
  if (!profile || profile.status === 'active') return <Redirect href="/home" />;
  if (profile.status === 'underage_blocked') return <Underage />;

  const status = profile.status;
  const date = (timestamp: number | null) => (timestamp === null ? '' : formatDhakaDate(timestamp, language));
  const body = t(`accountStatus.${status}.body`, {
    reason: profile.statusReason ?? '',
    date: date(status === 'deletion_pending' ? profile.deletionDueAt : profile.statusUntil),
  });

  return (
    <Screen root>
      <View className="gap-s4 py-s6">
        <Text variant="title" accessibilityRole="header">
          {t(`accountStatus.${status}.title`)}
        </Text>
        <Text>{body}</Text>
      </View>
      {status === 'frozen' || status === 'suspended' ? (
        <HelplineButton labelKey="request.fallbackTitle" variant="primary" />
      ) : null}
      {status === 'banned' && config?.contactEmail ? (
        <Button
          label={t('accountStatus.contactUs')}
          icon={Mail}
          block
          onPress={() => void Linking.openURL(`mailto:${config.contactEmail}`)}
        />
      ) : null}
      <SignOutButton />
    </Screen>
  );
}
