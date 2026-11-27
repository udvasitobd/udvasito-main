/**
 * CMP-PlacePicker, P1 form path (SCR-M02, VAL-07): search hospitals by name or alias ("CMCH", "চমেক"), or "Use my
 * current location" → the nearest listed hospitals, or "My place isn't in the list" → district → thana → place name.
 * No map pin in P1. The location reading stays on this device: it only sorts hospitals or picks the thana.
 */
import { api } from '@convex/_generated/api';
import type { Id } from '@convex/_generated/dataModel';
import { distanceKm } from '@convex/rules/places';
import { useConvex, useQuery } from 'convex/react';
import { useMemo, useState } from 'react';
import { Pressable, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { Banner, Button, FieldError, Input, Select, Text, useLanguage, type SelectOption } from '@/components';
import { ChevronRight, Hospital, LocateFixed, MapPin, Search } from '@/components/icons';
import { useLocateArea } from '@/features/places/useLocateArea';
import { intlLocale } from '@/lib/language';
import { colors } from '@/theme/tokens';

import { chooseDistrict, chooseHospital, type ChosenHospital, type RequestForm } from './requestForm';

/** specs SCR-M02: "list 5 nearest hospitals". */
const NEAREST_COUNT = 5;
/** Search starts from this many characters (fewer match almost everything). */
const SEARCH_FROM = 2;
const PLACE_TEXT_MAX = 80;

type Update = (change: (form: RequestForm) => RequestForm) => void;
type Found = ChosenHospital & { lat: number; lng: number; km?: number };

function HospitalRow({ hospital, onPress }: { hospital: Found; onPress: () => void }) {
  const { t } = useTranslation();
  const language = useLanguage();
  const name = language === 'bn' ? hospital.nameBn : hospital.nameEn;
  const area = hospital.upazila ? (language === 'bn' ? hospital.upazila.nameBn : hospital.upazila.nameEn) : '';
  const km =
    hospital.km === undefined
      ? ''
      : t('request.distance', {
          km: new Intl.NumberFormat(intlLocale(language), { maximumFractionDigits: 1 }).format(hospital.km),
        });
  const detail = [area, km].filter(Boolean).join(' · ');
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={detail ? `${name}, ${detail}` : name}
      onPress={onPress}
      className="min-h-touch flex-row items-center gap-s3 border-b border-line px-s4 py-s3 active:bg-surface web:hover:bg-surface"
    >
      <Hospital size={22} color={colors.brand.primary} aria-hidden />
      <View className="flex-1 gap-s1" aria-hidden>
        <Text variant="bodyStrong">{name}</Text>
        {detail ? (
          <Text variant="small" tone="muted">
            {detail}
          </Text>
        ) : null}
      </View>
      <ChevronRight size={20} color={colors.text.muted} aria-hidden />
    </Pressable>
  );
}

function HospitalList({ hospitals, onChoose }: { hospitals: Found[]; onChoose: (h: Found) => void }) {
  return (
    <View className="overflow-hidden rounded-md border border-line bg-app">
      {hospitals.map((hospital) => (
        <HospitalRow key={hospital._id} hospital={hospital} onPress={() => onChoose(hospital)} />
      ))}
    </View>
  );
}

function usePlaceOptions(
  places: { _id: string; nameEn: string; nameBn: string }[] | undefined,
): SelectOption<string>[] {
  const language = useLanguage();
  return useMemo(() => {
    const locale = intlLocale(language);
    return (places ?? [])
      .map((p) => ({ value: p._id, label: language === 'bn' ? p.nameBn : p.nameEn, names: [p.nameEn, p.nameBn] }))
      .sort((a, b) => a.label.localeCompare(b.label, locale));
  }, [places, language]);
}

export function PlacePicker({
  form,
  update,
  placeError,
  placeTextError,
}: {
  form: RequestForm;
  update: Update;
  placeError?: string;
  placeTextError?: string;
}) {
  const { t } = useTranslation();
  const language = useLanguage();
  const convex = useConvex();
  const locate = useLocateArea();
  const [query, setQuery] = useState('');
  const [nearby, setNearby] = useState<Found[] | null>(null);
  const [locating, setLocating] = useState(false);
  const [notice, setNotice] = useState<'failed' | 'noneNear' | null>(null);

  const text = query.trim();
  const results = useQuery(api.hospitals.search, text.length >= SEARCH_FROM ? { text } : 'skip');
  const districts = useQuery(api.places.list, form.notInList ? { level: 'district' } : 'skip');
  const upazilas = useQuery(
    api.places.list,
    form.notInList && form.districtId ? { level: 'upazila', parentId: form.districtId as Id<'places'> } : 'skip',
  );
  const districtOptions = usePlaceOptions(districts);
  const upazilaOptions = usePlaceOptions(upazilas);

  const choose = (hospital: Found) => {
    setNearby(null);
    setQuery('');
    setNotice(null);
    update((f) => chooseHospital(f, hospital));
  };

  const findByLocation = async () => {
    setLocating(true);
    setNotice(null);
    const area = await locate();
    if (!area) {
      setLocating(false);
      setNotice('failed');
      return;
    }
    const ids = { divisionId: area.divisionId, districtId: area.districtId, upazilaId: area.upazilaId };
    if (form.notInList) {
      setLocating(false);
      update((f) => ({ ...f, ...ids }));
      return;
    }
    const inDistrict = await convex
      .query(api.hospitals.search, { text: '', districtId: area.districtId as Id<'places'> })
      .catch(() => []);
    setLocating(false);
    const nearest = inDistrict
      .map((h) => ({ ...h, km: distanceKm(area.point, h) }))
      .sort((a, b) => a.km - b.km)
      .slice(0, NEAREST_COUNT);
    if (nearest.length > 0) {
      setNearby(nearest);
      return;
    }
    // No listed hospital nearby: go straight to the area pickers, already filled in.
    setNotice('noneNear');
    update((f) => ({ ...chooseHospital(f, null), notInList: true, ...ids }));
  };

  const locationButton = (
    <View className="gap-s2">
      <Button
        label={t('request.useLocation')}
        icon={LocateFixed}
        variant="secondary"
        block
        loading={locating}
        onPress={() => void findByLocation()}
      />
      <Text variant="small" tone="muted">
        {t('donor.setup.locationNote')}
      </Text>
    </View>
  );

  const banner =
    notice === 'failed' ? (
      <Banner kind="warning" text={t('donor.setup.locationFailed')} />
    ) : notice === 'noneNear' ? (
      <Banner kind="info" text={t('request.noHospitalsNear')} />
    ) : null;

  let body;
  if (form.hospital) {
    const h = form.hospital;
    const area = h.upazila ? (language === 'bn' ? h.upazila.nameBn : h.upazila.nameEn) : '';
    body = (
      <View className="flex-row items-center gap-s3 rounded-md border-2 border-brand-primary bg-brand-primarySoft p-s4">
        <Hospital size={24} color={colors.brand.primary} aria-hidden />
        <View className="flex-1 gap-s1">
          <Text variant="bodyStrong">{language === 'bn' ? h.nameBn : h.nameEn}</Text>
          {area ? (
            <Text variant="small" tone="muted">
              {area}
            </Text>
          ) : null}
        </View>
        <Button
          label={t('common.change')}
          variant="secondary"
          size="sm"
          onPress={() => update((f) => chooseHospital(f, null))}
        />
      </View>
    );
  } else if (form.notInList) {
    body = (
      <View className="gap-s4">
        {locationButton}
        {banner}
        <Select
          label={t('donor.setup.district')}
          value={form.districtId}
          options={districtOptions}
          onChange={(id) => {
            const district = districts?.find((d) => d._id === id) ?? null;
            update((f) => chooseDistrict(f, district));
          }}
          error={placeError && !form.districtId ? t(placeError) : undefined}
        />
        <Select
          label={t('donor.setup.upazila')}
          value={form.upazilaId}
          options={upazilaOptions}
          disabled={!form.districtId}
          onChange={(id) => update((f) => ({ ...f, upazilaId: id }))}
          error={placeError && form.districtId && !form.upazilaId ? t(placeError) : undefined}
        />
        <Input
          label={t('request.placeText')}
          value={form.placeText}
          onChangeText={(placeText) => update((f) => ({ ...f, placeText }))}
          maxLength={PLACE_TEXT_MAX}
          counter
          error={placeTextError ? t(placeTextError) : undefined}
        />
        <Button
          label={t('request.searchHospital')}
          icon={Search}
          variant="ghost"
          onPress={() => {
            setNotice(null);
            update((f) => ({ ...f, notInList: false }));
          }}
        />
      </View>
    );
  } else {
    body = (
      <View className="gap-s4">
        <Input
          label={t('request.searchHospital')}
          value={query}
          onChangeText={(value) => {
            setQuery(value);
            setNearby(null);
          }}
          autoCorrect={false}
          returnKeyType="search"
        />
        {text.length >= SEARCH_FROM && results !== undefined ? (
          results.length > 0 ? (
            <HospitalList hospitals={results} onChoose={choose} />
          ) : (
            <Text tone="muted" accessibilityLiveRegion="polite">
              {t('common.noMatches')}
            </Text>
          )
        ) : null}
        {locationButton}
        {banner}
        {nearby ? (
          <View className="gap-s2">
            <Text variant="bodyStrong">{t('request.nearestHospitals')}</Text>
            <HospitalList hospitals={nearby} onChoose={choose} />
          </View>
        ) : null}
        <Button
          label={t('request.notInList')}
          icon={MapPin}
          variant="ghost"
          onPress={() => {
            setNearby(null);
            setNotice(null);
            update((f) => ({ ...chooseHospital(f, null), notInList: true }));
          }}
        />
        {placeError ? <FieldError text={t(placeError)} /> : null}
      </View>
    );
  }

  return (
    <View className="gap-s3">
      <Text variant="title" accessibilityRole="header">
        {t('request.where')}
      </Text>
      {body}
    </View>
  );
}
