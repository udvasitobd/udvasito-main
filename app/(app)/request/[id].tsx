/**
 * SCR-M03 · My request (`/request/[id]`) — specs §4, F-407, F-501. Live (`requests.getForOwner`, with the S-33
 * HTTPS fallback through `useLiveQuery`): status chips, the units bar, **Help is on the way** with a contact card
 * per confirmed donor (CMP-SafetyCard first), the search timeline with counts, the close actions and the details.
 *
 * Not in P1 (roadmap P1 scope): waves 2–3 and the next-search countdown, volunteers, "Donor not responding", Need
 * more bags, reopen, Request again, share, hospital slip. The helpline and "no donors yet" panel come in slice 14.
 */
import { api } from '@convex/_generated/api';
import type { Id } from '@convex/_generated/dataModel';
import { useMutation } from 'convex/react';
import { useLocalSearchParams, type ErrorBoundaryProps } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { Banner, Button, Dialog, ErrorState, Screen, SkeletonCard, Text, useLanguage } from '@/components';
import { MyRequestView } from '@/features/requests/MyRequestView';
import { errorMessage, errorText } from '@/lib/errors';
import { useLiveQuery } from '@/lib/useLiveQuery';
import { useNow } from '@/lib/useNow';
type CloseReason = 'fulfilled' | 'not_needed';
const MINUTE = 60 * 1000;

function CloseDialog({
  reason,
  requestId,
  onClose,
}: {
  reason: CloseReason | null;
  requestId: Id<'requests'>;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const language = useLanguage();
  const close = useMutation(api.requests.close);
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);
  const label = reason === 'not_needed' ? t('request.notNeeded') : t('request.markFulfilled');

  const confirm = async () => {
    if (!reason) return;
    setBusy(true);
    setFailure(null);
    try {
      await close({ requestId, reason });
      onClose();
    } catch (error) {
      setFailure(errorText(errorMessage(error), t, language));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog
      open={reason !== null}
      onClose={onClose}
      title={label}
      footer={
        <View className="gap-s2">
          <Button label={t('alert.confirm')} onPress={() => void confirm()} loading={busy} block />
          <Button label={t('common.cancel')} variant="ghost" onPress={onClose} block />
        </View>
      }
    >
      <View className="gap-s4">
        <Text>{t('request.closeConfirm')}</Text>
        {failure ? <Banner kind="error" text={failure} /> : null}
      </View>
    </Dialog>
  );
}

export default function MyRequest() {
  const { t } = useTranslation();
  const params = useLocalSearchParams<{ id: string }>();
  const requestId = params.id as Id<'requests'>;
  const view = useLiveQuery(api.requests.getForOwner, { requestId });
  const now = useNow(MINUTE);
  const [closing, setClosing] = useState<CloseReason | null>(null);

  if (view === undefined) {
    return (
      <Screen title={t('home.myRequest')}>
        <SkeletonCard />
        <SkeletonCard />
      </Screen>
    );
  }

  const closed = view.request.status === 'closed';
  const covered = view.request.status === 'covered';
  const footer = closed ? undefined : (
    <View className="gap-s2">
      <Button
        label={t('request.markFulfilled')}
        variant={covered ? 'primary' : 'secondary'}
        onPress={() => setClosing('fulfilled')}
        block
      />
      <Button label={t('request.notNeeded')} variant="ghost" onPress={() => setClosing('not_needed')} block />
    </View>
  );

  return (
    <Screen title={t('home.myRequest')} practice={view.practice} footer={footer}>
      <MyRequestView view={view} now={now} />
      {closed ? null : <CloseDialog reason={closing} requestId={requestId} onClose={() => setClosing(null)} />}
    </Screen>
  );
}

/** ERR_NOT_FOUND (not mine, removed, other area) and other failures stay inside this screen. */
export function ErrorBoundary({ error, retry }: ErrorBoundaryProps) {
  const { t } = useTranslation();
  return (
    <Screen title={t('home.myRequest')}>
      <ErrorState error={error} onRetry={() => void retry()} />
    </Screen>
  );
}
