/**
 * Pieces of the donor's status shared by the Donate tab (SCR-D01) and the Home donor card (SCR-M01 §5): the
 * eligibility line and the "not receiving requests yet" banner with the one action that fixes it.
 */
import { shownNotLiveReason, type NotLiveReason } from '@convex/rules/donor';
import { dhakaDate } from '@convex/rules/time';
import { router, type Href } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { Banner, Button, Text, useLanguage } from '@/components';
import { useAppConfig } from '@/lib/appConfig';
import { formatDhakaDate, todayInDhaka } from '@/lib/dates';
import { canVerify } from '@/lib/verification';

/** `donor.eligibleNow` once the waiting time is over, otherwise `donor.eligibleAgain` with the date. */
export function EligibilityLine({ eligibleFrom }: { eligibleFrom: number }) {
  const { t } = useTranslation();
  const language = useLanguage();
  // eligibleFrom is a Dhaka midnight (rules/eligibility.ts), so whole days are compared.
  if (dhakaDate(eligibleFrom) <= todayInDhaka()) {
    return <Text tone="success">{t('donor.eligibleNow')}</Text>;
  }
  return <Text>{t('donor.eligibleAgain', { date: formatDhakaDate(eligibleFrom, language) })}</Text>;
}

/** Shown while the profile is not live for a reason the donor can fix (specs §5.4); `returnTo` is this screen. */
export function NotLiveBanner({ reasons, returnTo }: { reasons: readonly NotLiveReason[]; returnTo: string }) {
  const { t } = useTranslation();
  const config = useAppConfig();
  const reason = shownNotLiveReason(reasons);
  if (!reason) return null;

  let action = null;
  if (reason === 'phone' && canVerify(config)) {
    action = (
      <Button
        label={t('home.verifyCta')}
        variant="secondary"
        size="sm"
        onPress={() => router.push(`/verify-phone?next=${encodeURIComponent(returnTo)}` as Href)}
      />
    );
  } else if (reason === 'group' || reason === 'consent') {
    action = (
      <Button label={t('donor.edit')} variant="secondary" size="sm" onPress={() => router.push('/donor/setup')} />
    );
  }
  return <Banner kind="warning" text={t(`donor.notLive.${reason}`)} action={action ?? undefined} />;
}
