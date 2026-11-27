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
import type { FunctionReturnType } from 'convex/server';
import { useMutation } from 'convex/react';
import { useLocalSearchParams, type ErrorBoundaryProps } from 'expo-router';
import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import {
  Banner,
  Button,
  Chip,
  ContactCard,
  Dialog,
  ErrorState,
  SafetyCard,
  Screen,
  SkeletonCard,
  StatusTimeline,
  Text,
  UnitsBar,
  useLanguage,
} from '@/components';
import { BadgeCheck, ChevronDown, ChevronUp, Droplet, TriangleAlert } from '@/components/icons';
import { componentWords, deadlineWords, distanceWords, groupWords } from '@/features/alerts/words';
import { statusChip, timelineStates } from '@/features/requests/status';
import { toBanglaDigits } from '@/lib/dates';
import { errorMessage, errorText } from '@/lib/errors';
import { useLiveQuery } from '@/lib/useLiveQuery';
import { useNow } from '@/lib/useNow';
import { colors } from '@/theme/tokens';

type OwnerView = FunctionReturnType<typeof api.requests.getForOwner>;
type CloseReason = 'fulfilled' | 'not_needed';
const MINUTE = 60 * 1000;

function HelpComing({ view }: { view: OwnerView }) {
  const { t } = useTranslation();
  const language = useLanguage();
  if (view.confirmedDonors.length === 0) return null;
  return (
    <View className="gap-s3">
      <Text variant="heading" accessibilityRole="header">
        {t('request.helpComing')}
      </Text>
      {view.revealsFrozen ? (
        <Banner kind="warning" text={t('request.revealsFrozen')} />
      ) : (
        <>
          {view.confirmedDonors.some((d) => d.phone) ? <SafetyCard /> : null}
          {view.confirmedDonors.map((donor) => {
            const where = [
              donor.group === 'unknown' ? null : groupWords(donor.group, t),
              donor.area[language],
              donor.km !== null ? distanceWords(donor.km, language, t) : null,
            ]
              .filter(Boolean)
              .join(' · ');
            const willCall = !donor.phone && donor.callMode === 'donor_calls';
            return (
              <ContactCard
                key={donor.responseId}
                name={donor.firstName}
                role={t('contact.role.donor')}
                where={where}
                phone={donor.phone}
                {...(willCall ? { note: t('contact.donorWillCall', { name: donor.firstName }) } : {})}
              />
            );
          })}
        </>
      )}
    </View>
  );
}

function Progress({ view }: { view: OwnerView }) {
  const { t } = useTranslation();
  const language = useLanguage();
  const digits = (value: number) => (language === 'bn' ? toBanglaDigits(String(value)) : String(value));
  const states = timelineStates(view.request);
  const counts =
    view.progress.notified > 0
      ? t('request.progress', {
          notified: digits(view.progress.notified),
          opened: digits(view.progress.opened),
          accepted: digits(view.progress.accepted),
        })
      : null;
  return (
    <View className="rounded-md border border-line bg-app p-s4">
      <StatusTimeline
        steps={[
          { key: 'searching', label: t('requestStatus.live'), detail: counts, state: states.searching },
          { key: 'covered', label: t('requestStatus.covered'), state: states.covered },
          { key: 'closed', label: t('requestStatus.closed'), state: states.closed },
        ]}
      />
    </View>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <View className="gap-s1">
      <Text variant="small" tone="muted">
        {label}
      </Text>
      <Text variant="bodyStrong">{value}</Text>
    </View>
  );
}

function Details({ view }: { view: OwnerView }) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const { request } = view;
  const Chevron = open ? ChevronUp : ChevronDown;
  return (
    <View className="rounded-md border border-line bg-app">
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        onPress={() => setOpen((value) => !value)}
        className="min-h-touch flex-row items-center gap-s3 px-s4 py-s3 active:bg-surface web:hover:bg-surface"
      >
        <Text variant="bodyStrong" className="flex-1">
          {t('request.details')}
        </Text>
        <Chevron size={20} color={colors.text.muted} aria-hidden />
      </Pressable>
      {open ? (
        <View className="gap-s4 border-t border-line p-s4">
          {request.patientName ? <Detail label={t('request.patientName')} value={request.patientName} /> : null}
          {request.ward ? <Detail label={t('request.ward')} value={request.ward} /> : null}
          {request.note ? <Detail label={t('request.note')} value={request.note} /> : null}
        </View>
      ) : null}
    </View>
  );
}

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
  const language = useLanguage();
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

  const { request } = view;
  const closed = request.status === 'closed';
  const covered = request.status === 'covered';
  const status = statusChip(request, t);
  const place = request.place[language] || request.area[language];
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
      <View className="gap-s6">
        <View className="gap-s3">
          <View className="flex-row flex-wrap items-center gap-s2">
            <Chip label={groupWords(request.bloodGroup, t)} tone="brand" />
            <Chip label={componentWords(request.component, t)} />
            {request.isDengue ? <Chip label={t('request.dengue')} tone="warning" icon={Droplet} /> : null}
            <Chip label={status.label} tone={status.tone} />
            {request.verified ? <Chip label={t('alert.verified')} tone="success" icon={BadgeCheck} /> : null}
            {request.phoneVerified ? null : <Chip label={t('alert.unverified')} tone="warning" icon={TriangleAlert} />}
          </View>
          <View className="gap-s1">
            <Text variant="heading">{place}</Text>
            {request.place[language] && request.area[language] !== place ? (
              <Text tone="muted">{request.area[language]}</Text>
            ) : null}
            {closed ? null : <Text variant="bodyStrong">{deadlineWords(request.neededBy, now, language, t)}</Text>}
          </View>
          <UnitsBar confirmed={request.unitsConfirmed} needed={request.unitsNeeded} />
        </View>

        {closed && request.closeReason === 'fulfilled' ? (
          <Banner kind="success" text={t('request.closed.fulfilled')} />
        ) : null}
        {closed && request.closeReason !== 'fulfilled' ? (
          <Banner kind="info" title={t('requestStatus.closed')} text={t('request.notNeeded')} />
        ) : null}
        {covered ? <Banner kind="success" text={t('requestStatus.covered')} /> : null}

        <HelpComing view={view} />
        <Progress view={view} />
        <Details view={view} />
      </View>
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
