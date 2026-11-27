/**
 * SCR-D04 · Request for you (`/alerts/[requestId]`) — specs §4, F-401–F-405, D16. Live: the screen follows my answer
 * and the request (`responses.getForDonor`).
 * - Not answered yet: the request, the note, `common.notMedicalAdvice`, **I can help** / **Can't this time**.
 * - Confirmed: `alert.confirmed`, CMP-SafetyCard, the requester's CMP-ContactCard, Directions, patient and ward.
 * - Standby: `alert.standby`, no contact details. Declined: what I answered. Closed: `alerts.closedItem` + thanks.
 * Opening the screen marks the alert opened once (`responses.markOpened`; `?n=` is the tapped push notification).
 *
 * Not in P1 (build prompt): "Still coming?", "I can't make it anymore", Report, the offline outbox.
 */
import { api } from '@convex/_generated/api';
import type { Id } from '@convex/_generated/dataModel';
import { useMutation, useQuery } from 'convex/react';
import { useLocalSearchParams, type ErrorBoundaryProps } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { Banner, Button, ContactCard, ErrorState, SafetyCard, Screen, SkeletonCard, Text } from '@/components';
import { AcceptSheet, DeclineSheet } from '@/features/alerts/AnswerSheets';
import { RequestDetails, type DonorView } from '@/features/alerts/RequestDetails';
import { useNow } from '@/lib/useNow';

const MINUTE = 60 * 1000;
const NOTIFICATION_ID = /^[A-Za-z0-9]{8,64}$/;

function Confirmed({ view }: { view: DonorView }) {
  const { t } = useTranslation();
  const requester = view.requester;
  return (
    <View className="gap-s4">
      {view.request.closed ? null : <Banner kind="success" text={t('alert.confirmed')} />}
      {view.myResponse.callMode === 'donor_calls' ? <Banner kind="info" text={t('alert.confirmedCallMode')} /> : null}
      {requester?.phone ? <SafetyCard /> : null}
      {requester ? (
        <ContactCard
          name={requester.firstName}
          role={t('contact.role.requester')}
          phone={requester.phone}
          {...(view.contactsPaused ? { note: t('request.revealsFrozen') } : {})}
        />
      ) : null}
    </View>
  );
}

function Declined({ view }: { view: DonorView }) {
  const { t } = useTranslation();
  const reason = view.myResponse.declineReason;
  return (
    <View className="gap-s1 rounded-md bg-surface p-s4">
      <Text variant="bodyStrong">{t('alert.cantHelp')}</Text>
      {reason ? <Text tone="muted">{t(`alert.reason.${reason}`)}</Text> : null}
    </View>
  );
}

export default function RequestForYou() {
  const { t } = useTranslation();
  const params = useLocalSearchParams<{ requestId: string; n?: string }>();
  const requestId = params.requestId as Id<'requests'>;
  const view = useQuery(api.responses.getForDonor, { requestId });
  const markOpened = useMutation(api.responses.markOpened);
  const now = useNow(MINUTE);
  const [sheet, setSheet] = useState<'accept' | 'decline' | null>(null);

  const opened = useRef<string | null>(null);
  useEffect(() => {
    if (opened.current === requestId) return;
    opened.current = requestId;
    const fromPush =
      params.n && NOTIFICATION_ID.test(params.n) ? { notificationId: params.n as Id<'notifications'> } : {};
    void markOpened({ requestId, ...fromPush }).catch(() => undefined);
  }, [requestId, params.n, markOpened]);

  if (view === undefined) {
    return (
      <Screen title={t('alerts.title')}>
        <SkeletonCard />
        <SkeletonCard />
      </Screen>
    );
  }

  const { request, myResponse } = view;
  const answering = !request.closed && (myResponse.state === 'notified' || myResponse.state === 'opened');
  const footer = answering ? (
    <View className="gap-s2">
      <Button label={t('alert.canHelp')} onPress={() => setSheet('accept')} block />
      <Button label={t('alert.cantHelp')} variant="secondary" onPress={() => setSheet('decline')} block />
    </View>
  ) : undefined;

  return (
    <Screen title={t('alerts.title')} practice={view.practice} footer={footer}>
      <View className="gap-s4">
        {request.closed ? <Banner kind="info" title={t('alerts.closedItem')} text={t('publicRequest.closed')} /> : null}
        {myResponse.state === 'confirmed' ? <Confirmed view={view} /> : null}
        {myResponse.state === 'standby' && !request.closed ? <Banner kind="info" text={t('alert.standby')} /> : null}
        {myResponse.state === 'declined' ? <Declined view={view} /> : null}
        <RequestDetails view={view} now={now} />
        <Text variant="small" tone="muted">
          {t('common.notMedicalAdvice')}
        </Text>
      </View>
      {answering ? (
        <>
          <AcceptSheet
            open={sheet === 'accept'}
            onClose={() => setSheet(null)}
            requestId={requestId}
            defaultCallMode={view.defaultCallMode}
          />
          <DeclineSheet open={sheet === 'decline'} onClose={() => setSheet(null)} requestId={requestId} />
        </>
      ) : null}
    </Screen>
  );
}

/** ERR_NOT_FOUND (not alerted, removed, other area) and other failures stay inside this screen. */
export function ErrorBoundary({ error, retry }: ErrorBoundaryProps) {
  const { t } = useTranslation();
  return (
    <Screen title={t('alerts.title')}>
      <ErrorState error={error} onRetry={() => void retry()} />
    </Screen>
  );
}
