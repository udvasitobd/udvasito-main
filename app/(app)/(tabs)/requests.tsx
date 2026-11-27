/**
 * SCR-M04 · My requests (`/requests`) — Active / Closed (`requests.listMine`, live, newest first), each item opens
 * SCR-M03. More rows load as the list scrolls. "Request again" is if-time (specs SCR-M04) and not built yet.
 */
import { api } from '@convex/_generated/api';
import { usePaginatedQuery } from 'convex/react';
import { router, type ErrorBoundaryProps } from 'expo-router';
import { useState } from 'react';
import { FlatList, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { Button, ErrorState, Screen, SegmentedTabs, SkeletonCard, Text } from '@/components';
import { ClipboardList, Droplet } from '@/components/icons';
import { RequestCard } from '@/features/requests/RequestCard';
import { colors } from '@/theme/tokens';

type Tab = 'active' | 'closed';
const PAGE = 20;

function Empty() {
  const { t } = useTranslation();
  return (
    <View className="items-center gap-s4 py-s12">
      <View className="h-20 w-20 items-center justify-center rounded-pill bg-surface" aria-hidden>
        <ClipboardList size={36} color={colors.text.muted} />
      </View>
      <Text className="max-w-sm text-center" tone="muted">
        {t('requests.empty')}
      </Text>
    </View>
  );
}

export default function MyRequests() {
  const { t } = useTranslation();
  const [tab, setTab] = useState<Tab>('active');
  const list = usePaginatedQuery(api.requests.listMine, { status: tab }, { initialNumItems: PAGE });
  const footer = (
    <Button label={t('request.new.title')} icon={Droplet} onPress={() => router.push('/request/new')} block />
  );

  return (
    <Screen root title={t('requests.title')} scroll={false} footer={footer} contentClassName="flex-1">
      <SegmentedTabs
        value={tab}
        onChange={setTab}
        options={[
          { value: 'active', label: t('requests.active') },
          { value: 'closed', label: t('requests.closed') },
        ]}
      />
      {list.status === 'LoadingFirstPage' ? (
        <View className="gap-s3">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </View>
      ) : (
        <FlatList
          className="flex-1"
          data={list.results}
          keyExtractor={(item) => item.requestId}
          renderItem={({ item }) => <RequestCard item={item} />}
          ItemSeparatorComponent={() => <View className="h-s3" />}
          ListEmptyComponent={Empty}
          onEndReached={() => {
            if (list.status === 'CanLoadMore') list.loadMore(PAGE);
          }}
          onEndReachedThreshold={0.5}
        />
      )}
    </Screen>
  );
}

export function ErrorBoundary({ error, retry }: ErrorBoundaryProps) {
  const { t } = useTranslation();
  return (
    <Screen root title={t('requests.title')}>
      <ErrorState error={error} onRetry={() => void retry()} />
    </Screen>
  );
}
