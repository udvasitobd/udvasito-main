/**
 * SCR-D01 · Donate tab. No donor profile → the intro and "Become a donor". With a profile → the status card
 * (Available / Not available, eligibility, why requests are not arriving yet) and a way back into donor setup.
 * Sections whose features are not built yet stay hidden (specs §1.9): Paused, Requests for you, alert health,
 * alert & privacy settings, donation history and "Hide my donor profile" join with their screens.
 */
import { api } from '@convex/_generated/api';
import { useMutation, useQuery } from 'convex/react';
import { router } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { Banner, Button, ChoiceGroup, ListGroup, ListRow, Screen, SkeletonCard, Text, useToast } from '@/components';
import { Check, Droplet, Pencil } from '@/components/icons';
import { EligibilityLine, NotLiveBanner } from '@/features/donor/DonorStatus';
import { errorMessage } from '@/lib/errors';
import { colors } from '@/theme/tokens';

type Availability = 'available' | 'unavailable';

function Intro() {
  const { t } = useTranslation();
  return (
    <View className="gap-s6 py-s4">
      <View className="items-center">
        <View className="h-24 w-24 items-center justify-center rounded-pill bg-brand-primarySoft" aria-hidden>
          <Droplet size={48} color={colors.brand.primary} fill={colors.brand.primary} />
        </View>
      </View>
      <Text variant="title" accessibilityRole="header" className="text-center">
        {t('donor.intro.title')}
      </Text>
      <View className="gap-s4">
        {[t('donor.intro.b1'), t('donor.intro.b2'), t('donor.intro.b3')].map((text) => (
          <View key={text} className="flex-row items-start gap-s3">
            <Check size={22} color={colors.status.success} strokeWidth={3} aria-hidden style={{ marginTop: 2 }} />
            <Text className="flex-1">{text}</Text>
          </View>
        ))}
      </View>
      <Button label={t('donor.intro.cta')} block onPress={() => router.push('/donor/setup')} />
    </View>
  );
}

export default function DonateTab() {
  const { t } = useTranslation();
  const toast = useToast();
  const mine = useQuery(api.donors.getMine);
  const [failure, setFailure] = useState<string | null>(null);
  // Optimistic: the control moves at once and moves back if the server refuses (SCR-D01 states).
  const setAvailability = useMutation(api.donors.setAvailability).withOptimisticUpdate((store, { availability }) => {
    const current = store.getQuery(api.donors.getMine, {});
    if (current) {
      store.setQuery(
        api.donors.getMine,
        {},
        { ...current, donor: { ...current.donor, availability, pausedUntil: null } },
      );
    }
  });

  const change = async (availability: Availability) => {
    setFailure(null);
    try {
      await setAvailability({ availability });
    } catch (error) {
      const message = errorMessage(error);
      const text = t(message.key, message.params ?? {});
      setFailure(text);
      toast.show(text);
    }
  };

  if (mine === undefined) {
    return (
      <Screen root>
        <SkeletonCard />
        <SkeletonCard />
      </Screen>
    );
  }
  if (mine === null) {
    return (
      <Screen root>
        <Intro />
      </Screen>
    );
  }

  const availability = mine.donor.availability === 'paused' ? null : mine.donor.availability;
  return (
    <Screen root>
      <Text variant="title" accessibilityRole="header">
        {t('tabs.donate')}
      </Text>
      <NotLiveBanner reasons={mine.notLiveReasons} returnTo="/donor" />
      <View className="gap-s4 rounded-md border border-line bg-app p-s4">
        <ChoiceGroup<Availability>
          label={t('donor.availability')}
          value={availability}
          options={[
            { value: 'available', label: t('donor.available') },
            { value: 'unavailable', label: t('donor.unavailable') },
          ]}
          onChange={(value) => void change(value)}
        />
        {failure ? <Banner kind="error" text={failure} /> : null}
        <EligibilityLine eligibleFrom={mine.eligibleFrom} />
      </View>
      <ListGroup>
        <ListRow label={t('donor.edit')} icon={Pencil} onPress={() => router.push('/donor/setup')} />
      </ListGroup>
    </Screen>
  );
}
