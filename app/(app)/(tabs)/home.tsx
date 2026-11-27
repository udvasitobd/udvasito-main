/**
 * SCR-M01 · Home. Sections appear only when their feature works (specs §1.9): the verify banner once a verification
 * method is on; "Become a donor" (non-donors) and the donor status card (donors) with donor setup; the hero
 * "Need blood?" with the request form (P1 slice 8); "Your request" (up to 2 open requests → SCR-M03) and "Requests
 * for you" (donors: how many wait for an answer, the top 3 → SCR-D04), and so on.
 */
import { api } from '@convex/_generated/api';
import { useQuery } from 'convex/react';
import { router } from 'expo-router';
import { Pressable, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { Banner, Button, ListGroup, ListRow, Screen, Text, useLanguage } from '@/components';
import { Bell, ChevronRight, Droplet } from '@/components/icons';
import { InboxCard } from '@/features/alerts/InboxCard';
import { EligibilityLine } from '@/features/donor/DonorStatus';
import { RequestCard } from '@/features/requests/RequestCard';
import { useAppConfig } from '@/lib/appConfig';
import { toBanglaDigits } from '@/lib/dates';
import { useNow } from '@/lib/useNow';
import { canVerify } from '@/lib/verification';
import { colors } from '@/theme/tokens';

const MINUTE = 60 * 1000;
/** SCR-M01 §3: at most two open requests on Home; the rest are on the Requests tab. */
const FIRST_TWO = { numItems: 2, cursor: null };

export default function Home() {
  const { t } = useTranslation();
  const language = useLanguage();
  const config = useAppConfig();
  const me = useQuery(api.profiles.me);
  const mine = useQuery(api.donors.getMine);
  const active = useQuery(api.requests.listMine, { status: 'active', paginationOpts: FIRST_TWO });
  const inbox = useQuery(api.responses.inbox, mine ? {} : 'skip');
  const now = useNow(MINUTE);
  const showVerify = me?.profile?.phoneVerified === false && canVerify(config);
  const waiting = inbox?.needsAnswer ?? [];
  const waitingWords = t('home.requestsForMeCount', { count: waiting.length });

  return (
    <Screen root>
      {showVerify ? (
        <Banner
          kind="warning"
          text={t('home.verifyBanner')}
          action={
            <Button
              label={t('home.verifyCta')}
              variant="secondary"
              size="sm"
              onPress={() => router.push('/verify-phone')}
            />
          }
        />
      ) : null}
      <View className="gap-s4 rounded-md bg-brand-primary p-s6">
        <Text variant="display" tone="inverse" accessibilityRole="header">
          {t('home.needBlood')}
        </Text>
        <Button
          label={t('home.needBloodCta')}
          variant="inverse"
          block
          icon={Droplet}
          onPress={() => router.push('/request/new')}
        />
        <Pressable
          accessibilityRole="link"
          onPress={() => router.push('/request/new?dengue=1')}
          className="min-h-touch justify-center self-start"
          hitSlop={4}
        >
          <Text tone="inverse" className="underline">
            {t('home.dengueCta')}
          </Text>
        </Pressable>
      </View>
      {active && active.page.length > 0 ? (
        <View className="gap-s3">
          <Text variant="heading" accessibilityRole="header">
            {t('home.myRequest')}
          </Text>
          {active.page.map((item) => (
            <RequestCard key={item.requestId} item={item} />
          ))}
        </View>
      ) : null}
      {waiting.length > 0 ? (
        <View className="gap-s3">
          <Text variant="heading" accessibilityRole="header">
            {t('home.requestsForMe')}
          </Text>
          <ListGroup>
            <ListRow
              label={language === 'bn' ? toBanglaDigits(waitingWords) : waitingWords}
              icon={Bell}
              onPress={() => router.push('/alerts')}
            />
          </ListGroup>
          {waiting.slice(0, 3).map((item) => (
            <InboxCard key={item.requestId} item={item} now={now} />
          ))}
        </View>
      ) : null}
      {mine ? (
        <Pressable
          accessibilityRole="button"
          onPress={() => router.push('/donor')}
          className="min-h-touch flex-row items-center gap-s3 rounded-md border border-line bg-app p-s4 active:bg-surface web:hover:bg-surface"
        >
          <Droplet size={24} color={colors.brand.primary} aria-hidden />
          <View className="flex-1 gap-s1">
            <Text variant="bodyStrong">
              {mine.donor.availability === 'available' ? t('donor.available') : t('donor.unavailable')}
            </Text>
            <EligibilityLine eligibleFrom={mine.eligibleFrom} />
          </View>
          <ChevronRight size={22} color={colors.text.muted} aria-hidden />
        </Pressable>
      ) : null}
      {mine === null ? (
        <ListGroup>
          <ListRow label={t('home.becomeDonor')} icon={Droplet} onPress={() => router.push('/donor/setup')} />
        </ListGroup>
      ) : null}
    </Screen>
  );
}
