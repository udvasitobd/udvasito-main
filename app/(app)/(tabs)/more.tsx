/**
 * SCR-M10 · More. Rows for features that are not built yet stay hidden (specs §1.9): Can I donate?, Learn, Dengue &
 * platelets, Apply to volunteer, About and Download join when their screens exist.
 */
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { HelplineButton, ListGroup, ListRow, Screen } from '@/components';
import { Settings } from '@/components/icons';
import { SignOutButton } from '@/features/account/SignOutButton';

export default function More() {
  const { t } = useTranslation();
  return (
    <Screen root title={t('tabs.more')}>
      <ListGroup>
        <ListRow label={t('settings.title')} icon={Settings} onPress={() => router.push('/settings')} />
      </ListGroup>
      <HelplineButton labelKey="request.fallbackTitle" />
      <SignOutButton />
    </Screen>
  );
}
