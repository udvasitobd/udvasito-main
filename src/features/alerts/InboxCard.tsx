/**
 * One request in "Requests for you" (SCR-D03): group and component chips, my state, the hospital, area · distance,
 * the deadline with the time left, and the verified badge. Closed requests are greyed and say "No longer needed".
 * The whole card is one button that opens the request (SCR-D04).
 */
import type { api } from '@convex/_generated/api';
import type { FunctionReturnType } from 'convex/server';
import { router } from 'expo-router';
import { Pressable, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { Chip, Text, useLanguage } from '@/components';
import { BadgeCheck } from '@/components/icons';
import { cn } from '@/lib/cn';

import { componentWords, deadlineWords, distanceWords, groupWords, requestTitle } from './words';

export type InboxItem = FunctionReturnType<typeof api.responses.inbox>['needsAnswer'][number];

type ChipState = { label: string; tone: 'brand' | 'success' | 'info' | 'neutral' };

function stateChip(item: InboxItem, t: (key: string) => string): ChipState | null {
  if (item.closed) return { label: t('alerts.closedItem'), tone: 'neutral' };
  if (item.state === 'notified') return { label: t('alerts.state.new'), tone: 'brand' };
  if (item.state === 'confirmed') return { label: t('alerts.state.confirmed'), tone: 'success' };
  if (item.state === 'standby') return { label: t('alerts.state.standby'), tone: 'info' };
  return null;
}

export function InboxCard({ item, now }: { item: InboxItem; now: number }) {
  const { t } = useTranslation();
  const language = useLanguage();
  const place = item.place[language] || item.area[language];
  const where = [item.area[language], item.km !== null ? distanceWords(item.km, language, t) : null]
    .filter(Boolean)
    .join(' · ');
  const deadline = item.closed ? null : deadlineWords(item.neededBy, now, language, t);
  const state = stateChip(item, t);
  const label = [
    requestTitle(item, t),
    place,
    where,
    deadline,
    state?.label,
    item.verified ? t('alert.verified') : null,
  ]
    .filter(Boolean)
    .join(', ');

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={() => router.push({ pathname: '/alerts/[requestId]', params: { requestId: item.requestId } })}
      className={cn(
        'gap-s2 rounded-md border border-line bg-app p-s4 active:bg-surface web:hover:bg-surface',
        item.closed && 'opacity-60',
      )}
    >
      <View className="flex-row flex-wrap items-center gap-s2" aria-hidden>
        <Chip label={groupWords(item.bloodGroup, t)} tone="brand" />
        <Chip label={componentWords(item.component, t)} />
        <View className="flex-1" />
        {state ? <Chip label={state.label} tone={state.tone} /> : null}
      </View>
      <Text variant="bodyStrong" aria-hidden>
        {place}
      </Text>
      {where ? (
        <Text variant="small" tone="muted" aria-hidden>
          {where}
        </Text>
      ) : null}
      {deadline ? (
        <Text variant="small" aria-hidden>
          {deadline}
        </Text>
      ) : null}
      {item.verified ? <Chip label={t('alert.verified')} tone="success" icon={BadgeCheck} /> : null}
    </Pressable>
  );
}
