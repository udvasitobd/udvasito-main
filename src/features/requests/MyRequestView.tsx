/**
 * The body of SCR-M03 (specs §4): status chips, the units bar, **Help is on the way** with a contact card per
 * confirmed donor (CMP-SafetyCard first), the search timeline with counts and the collapsible details. Pure: the
 * route (`app/(app)/request/[id].tsx`) loads the data and owns the close actions.
 */
import type { api } from '@convex/_generated/api';
import type { FunctionReturnType } from 'convex/server';
import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { Banner, Chip, ContactCard, SafetyCard, StatusTimeline, Text, UnitsBar, useLanguage } from '@/components';
import { BadgeCheck, ChevronDown, ChevronUp, Droplet, TriangleAlert } from '@/components/icons';
import { componentWords, deadlineWords, distanceWords, groupWords } from '@/features/alerts/words';
import { toBanglaDigits } from '@/lib/dates';
import { colors } from '@/theme/tokens';

import { statusChip, timelineStates } from './status';

export type OwnerView = FunctionReturnType<typeof api.requests.getForOwner>;

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
  if (!request.patientName && !request.ward && !request.note) return null;
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

export function MyRequestView({ view, now }: { view: OwnerView; now: number }) {
  const { t } = useTranslation();
  const language = useLanguage();
  const { request } = view;
  const closed = request.status === 'closed';
  const covered = request.status === 'covered';
  const status = statusChip(request, t);
  const place = request.place[language] || request.area[language];
  return (
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
  );
}
