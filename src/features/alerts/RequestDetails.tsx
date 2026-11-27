/**
 * The request as a donor sees it on SCR-D04: group, component, bags, the place, area · distance, needed-by with the
 * time left, the badges (slip verified, or phone not yet verified), the requester's track record and their note.
 * A confirmed donor also gets **Directions** and the patient's name and ward.
 */
import type { api } from '@convex/_generated/api';
import type { FunctionReturnType } from 'convex/server';
import { Linking, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { Button, Chip, Text, useLanguage } from '@/components';
import { BadgeCheck, Droplet, Navigation, TriangleAlert } from '@/components/icons';

import { directionsUrl } from './links';
import { componentWords, deadlineWords, distanceWords, groupWords, trackRecordWords, unitsWords } from './words';

export type DonorView = FunctionReturnType<typeof api.responses.getForDonor>;

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

export function RequestDetails({ view, now }: { view: DonorView; now: number }) {
  const { t } = useTranslation();
  const language = useLanguage();
  const { request } = view;
  const confirmed = view.myResponse.state === 'confirmed';
  const place = request.place[language] || request.area[language];
  const where = [request.area[language], request.km !== null ? distanceWords(request.km, language, t) : null]
    .filter(Boolean)
    .join(' · ');

  return (
    <View className="gap-s4 rounded-md border border-line bg-app p-s4">
      <View className="flex-row flex-wrap items-center gap-s2">
        <Chip label={groupWords(request.bloodGroup, t)} tone="brand" />
        <Chip label={componentWords(request.component, t)} />
        <Chip label={unitsWords(request.unitsNeeded, language, t)} />
        {request.isDengue ? <Chip label={t('request.dengue')} tone="warning" icon={Droplet} /> : null}
      </View>
      <View className="gap-s1">
        <Text variant="heading">{place}</Text>
        {where ? <Text tone="muted">{where}</Text> : null}
        {request.closed ? null : <Text variant="bodyStrong">{deadlineWords(request.neededBy, now, language, t)}</Text>}
      </View>
      {request.verified || !request.phoneVerified ? (
        <View className="flex-row flex-wrap gap-s2">
          {request.verified ? <Chip label={t('alert.verified')} tone="success" icon={BadgeCheck} /> : null}
          {request.phoneVerified ? null : <Chip label={t('alert.unverified')} tone="warning" icon={TriangleAlert} />}
        </View>
      ) : null}
      {confirmed ? (
        <Button
          label={t('alert.directions')}
          icon={Navigation}
          variant="secondary"
          onPress={() => void Linking.openURL(directionsUrl(request.directionsTo, request.place.en, request.area.en))}
        />
      ) : null}
      {confirmed && view.patientName ? <Detail label={t('request.patientName')} value={view.patientName} /> : null}
      {confirmed && view.ward ? <Detail label={t('request.ward')} value={view.ward} /> : null}
      {request.note ? <Detail label={t('request.note')} value={request.note} /> : null}
      {view.trackRecord ? (
        <Text variant="small" tone="muted">
          {trackRecordWords(view.trackRecord, language, t)}
        </Text>
      ) : null}
    </View>
  );
}
