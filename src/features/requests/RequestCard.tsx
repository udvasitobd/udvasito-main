/**
 * One of my requests (SCR-M04 list items, the SCR-M01 "Your request" card): group, component and status chips, the
 * hospital, when it was posted, and the units bar. The whole card is one button that opens SCR-M03.
 */
import type { api } from '@convex/_generated/api';
import type { FunctionReturnType } from 'convex/server';
import { router } from 'expo-router';
import { Pressable, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { Chip, Text, UnitsBar, useLanguage } from '@/components';
import { ChevronRight } from '@/components/icons';
import { componentWords, groupWords } from '@/features/alerts/words';
import { cn } from '@/lib/cn';
import { formatDhakaDateTime } from '@/lib/dates';
import { colors } from '@/theme/tokens';

import { statusChip, unitsCoveredWords } from './status';

export type MyRequest = FunctionReturnType<typeof api.requests.listMine>['page'][number];

export function RequestCard({ item }: { item: MyRequest }) {
  const { t } = useTranslation();
  const language = useLanguage();
  const place = item.place[language] || item.area[language];
  const posted = formatDhakaDateTime(item.createdAt, language);
  const status = statusChip(item, t);
  const closed = item.status === 'closed';
  const label = [
    groupWords(item.bloodGroup, t),
    componentWords(item.component, t),
    status.label,
    place,
    posted,
    closed ? null : unitsCoveredWords(item.unitsConfirmed, item.unitsNeeded, language, t),
  ]
    .filter(Boolean)
    .join(', ');

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={() => router.push({ pathname: '/request/[id]', params: { id: item.requestId } })}
      className={cn(
        'gap-s3 rounded-md border border-line bg-app p-s4 active:bg-surface web:hover:bg-surface',
        closed && 'opacity-75',
      )}
    >
      <View className="flex-row flex-wrap items-center gap-s2" aria-hidden>
        <Chip label={groupWords(item.bloodGroup, t)} tone="brand" />
        <Chip label={componentWords(item.component, t)} />
        <View className="flex-1" />
        <Chip label={status.label} tone={status.tone} />
      </View>
      <View className="flex-row items-center gap-s3" aria-hidden>
        <View className="flex-1 gap-s1">
          <Text variant="bodyStrong">{place}</Text>
          <Text variant="small" tone="muted">
            {posted}
          </Text>
        </View>
        <ChevronRight size={20} color={colors.text.muted} />
      </View>
      {closed ? null : (
        <View aria-hidden>
          <UnitsBar confirmed={item.unitsConfirmed} needed={item.unitsNeeded} compact />
        </View>
      )}
    </Pressable>
  );
}
