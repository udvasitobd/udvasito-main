/**
 * SCR-M01 · Home. Sections appear only when their feature works (specs §1.9): the verify banner once a verification
 * method is on; "Become a donor" (non-donors) and the donor status card (donors) with donor setup; the hero
 * "Need blood?" with the request form (P1 slice 8), and so on.
 */
import { api } from '@convex/_generated/api';
import { useQuery } from 'convex/react';
import { router } from 'expo-router';
import { Pressable, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { Banner, Button, ListGroup, ListRow, Screen, Text } from '@/components';
import { ChevronRight, Droplet } from '@/components/icons';
import { EligibilityLine } from '@/features/donor/DonorStatus';
import { useAppConfig } from '@/lib/appConfig';
import { canVerify } from '@/lib/verification';
import { colors } from '@/theme/tokens';

export default function Home() {
  const { t } = useTranslation();
  const config = useAppConfig();
  const me = useQuery(api.profiles.me);
  const mine = useQuery(api.donors.getMine);
  const showVerify = me?.profile?.phoneVerified === false && canVerify(config);

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
