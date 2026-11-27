/**
 * SCR-D03 · Requests for you (`/alerts`): requests where I was alerted, grouped Needs your answer / You said yes /
 * Earlier, newest first (`responses.inbox`). Live: a new alert appears without a refresh.
 */
import { api } from '@convex/_generated/api';
import { useQuery } from 'convex/react';
import { View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { Screen, SkeletonCard, Text } from '@/components';
import { Bell } from '@/components/icons';
import { InboxCard, type InboxItem } from '@/features/alerts/InboxCard';
import { useNow } from '@/lib/useNow';
import { colors } from '@/theme/tokens';

const MINUTE = 60 * 1000;

function Section({ title, items, now }: { title: string; items: InboxItem[]; now: number }) {
  if (items.length === 0) return null;
  return (
    <View className="gap-s3">
      <Text variant="heading" accessibilityRole="header">
        {title}
      </Text>
      {items.map((item) => (
        <InboxCard key={item.requestId} item={item} now={now} />
      ))}
    </View>
  );
}

export default function RequestsForYou() {
  const { t } = useTranslation();
  const inbox = useQuery(api.responses.inbox);
  // "in 2 hours" stays true while the list is open.
  const now = useNow(MINUTE);

  if (inbox === undefined) {
    return (
      <Screen title={t('alerts.title')}>
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
      </Screen>
    );
  }

  const empty = inbox.needsAnswer.length + inbox.saidYes.length + inbox.earlier.length === 0;
  return (
    <Screen title={t('alerts.title')}>
      {empty ? (
        <View className="items-center gap-s4 py-s12">
          <View className="h-20 w-20 items-center justify-center rounded-pill bg-surface" aria-hidden>
            <Bell size={36} color={colors.text.muted} />
          </View>
          <Text className="max-w-sm text-center" tone="muted">
            {t('alerts.empty')}
          </Text>
        </View>
      ) : (
        <View className="gap-s6">
          <Section title={t('alerts.needsAnswer')} items={inbox.needsAnswer} now={now} />
          <Section title={t('alerts.saidYes')} items={inbox.saidYes} now={now} />
          <Section title={t('alerts.earlier')} items={inbox.earlier} now={now} />
        </View>
      )}
    </Screen>
  );
}
