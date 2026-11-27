/**
 * SCR-M10 · More. Rows for features that are not built yet stay hidden (specs §1.9): Can I donate?, Learn, Dengue &
 * platelets, Apply to volunteer, About and Download join when their screens exist.
 * "Verify someone in person" (SCR-V06) is here for admins (specs) and, until the Volunteer tab exists, for volunteers.
 */
import { api } from '@convex/_generated/api';
import { useQuery } from 'convex/react';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { HelplineButton, ListGroup, ListRow, Screen } from '@/components';
import { Settings, ShieldCheck } from '@/components/icons';
import { SignOutButton } from '@/features/account/SignOutButton';
import { useAppConfig } from '@/lib/appConfig';

export default function More() {
  const { t } = useTranslation();
  const me = useQuery(api.profiles.me);
  const config = useAppConfig();
  const role = me?.profile?.role;
  const verifier = role !== undefined && role !== 'member' && config?.verification.inPerson === true;

  return (
    <Screen root title={t('tabs.more')}>
      <ListGroup>
        {verifier ? (
          <ListRow
            label={t('verifyInPerson.title')}
            icon={ShieldCheck}
            onPress={() => router.push('/volunteer/verify')}
          />
        ) : null}
        <ListRow label={t('settings.title')} icon={Settings} onPress={() => router.push('/settings')} />
      </ListGroup>
      <HelplineButton labelKey="request.fallbackTitle" />
      <SignOutButton />
    </Screen>
  );
}
