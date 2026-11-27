/**
 * SCR-D02 · Become a donor (specs §3.2, story D01). Four steps with "Step x of 4"; Back keeps entries; the answers
 * are kept on the device between steps (`features/donor/draft.ts`). The same screen updates an existing donor
 * profile (to add the blood group later, move, or record a new donation). The server re-checks everything
 * (`donors.upsert`); the profile is live only with a verified phone (specs §5.4).
 */
import { api } from '@convex/_generated/api';
import type { Id } from '@convex/_generated/dataModel';
import { useMutation, useQuery } from 'convex/react';
import { router, type Href } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { View } from 'react-native';
import { useTranslation } from 'react-i18next';

import {
  Banner,
  BloodGroupPicker,
  Button,
  Checkbox,
  ChoiceGroup,
  DateField,
  FieldError,
  Input,
  Screen,
  Select,
  Sheet,
  SwitchRow,
  Text,
  useLanguage,
  useToast,
  type SelectOption,
} from '@/components';
import { MapPin } from '@/components/icons';
import { LoadingScreen } from '@/features/account/Gate';
import { forgetDraft, readDraft, saveDraft } from '@/features/donor/draft';
import {
  choosePlace,
  EMPTY_FORM,
  firstInvalidStep,
  formFromDonor,
  GENDERS,
  STEP_COUNT,
  stepErrors,
  toUpsertArgs,
  type SetupForm,
  type Step,
  type StepErrors,
  type StepField,
} from '@/features/donor/setupForm';
import { useLocateArea } from '@/features/places/useLocateArea';
import { useEnablePush } from '@/features/push/usePush';
import { useAppConfig } from '@/lib/appConfig';
import { todayInDhaka } from '@/lib/dates';
import { errorMessage } from '@/lib/errors';
import { intlLocale } from '@/lib/language';
import { canVerify } from '@/lib/verification';

const SHORT_TEXT_MAX = 80;
const SELF_HREF = '/donor/setup';

/** Which step shows a server validation error for a field. */
const FIELD_STEP: Record<StepField, Step> = {
  bloodGroup: 1,
  upazilaId: 2,
  areaText: 2,
  institution: 2,
  travelRange: 2,
  gender: 3,
  lastDonationDate: 3,
  checklist: 3,
  consent: 4,
};

type Place = { _id: Id<'places'>; nameEn: string; nameBn: string };

function usePlaceOptions(places: Place[] | undefined, language: 'en' | 'bn'): SelectOption<string>[] {
  return useMemo(() => {
    const locale = intlLocale(language);
    return (places ?? [])
      .map((p) => ({
        value: p._id as string,
        label: language === 'bn' ? p.nameBn : p.nameEn,
        names: [p.nameEn, p.nameBn],
      }))
      .sort((a, b) => a.label.localeCompare(b.label, locale));
  }, [places, language]);
}

function Progress({ step }: { step: Step }) {
  const { t } = useTranslation();
  const language = useLanguage();
  const n = new Intl.NumberFormat(intlLocale(language)).format(step);
  return (
    <View className="gap-s2">
      <Text variant="small" tone="muted">
        {t('donor.setup.step', { n })}
      </Text>
      <View className="flex-row gap-s1" aria-hidden>
        {Array.from({ length: STEP_COUNT }, (_, i) => (
          <View
            key={i}
            className={i < step ? 'h-1.5 flex-1 rounded-pill bg-brand-primary' : 'h-1.5 flex-1 rounded-pill bg-line'}
          />
        ))}
      </View>
    </View>
  );
}

export default function DonorSetup() {
  const me = useQuery(api.profiles.me);
  const mine = useQuery(api.donors.getMine);
  const profileId = me?.profile?._id;
  const [initial, setInitial] = useState<{ step: Step; form: SetupForm } | null>(null);

  useEffect(() => {
    if (!profileId || mine === undefined || initial) return;
    let alive = true;
    void readDraft(profileId).then((draft) => {
      if (!alive) return;
      setInitial(draft ?? { step: 1, form: mine ? formFromDonor(mine.donor) : EMPTY_FORM });
    });
    return () => {
      alive = false;
    };
  }, [profileId, mine, initial]);

  if (!profileId || !initial || !me?.profile) return <LoadingScreen />;
  return <SetupSteps profileId={profileId} initial={initial} phoneVerified={me.profile.phoneVerified} />;
}

function SetupSteps({
  profileId,
  initial,
  phoneVerified,
}: {
  profileId: string;
  initial: { step: Step; form: SetupForm };
  phoneVerified: boolean;
}) {
  const { t } = useTranslation();
  const language = useLanguage();
  const toast = useToast();
  const config = useAppConfig();
  const upsert = useMutation(api.donors.upsert);
  const enablePush = useEnablePush();
  const locate = useLocateArea();

  const [step, setStep] = useState<Step>(initial.step);
  const [form, setForm] = useState<SetupForm>(initial.form);
  const [errors, setErrors] = useState<StepErrors>({});
  const [banner, setBanner] = useState<string | null>(null);
  const [unknownInfo, setUnknownInfo] = useState(false);
  const [locating, setLocating] = useState(false);
  const [locationFailed, setLocationFailed] = useState(false);
  const [busy, setBusy] = useState(false);
  const finished = useRef(false);
  const today = todayInDhaka();

  const divisions = useQuery(api.places.list, { level: 'division' });
  const districts = useQuery(
    api.places.list,
    form.divisionId ? { level: 'district', parentId: form.divisionId as Id<'places'> } : 'skip',
  );
  const upazilas = useQuery(
    api.places.list,
    form.districtId ? { level: 'upazila', parentId: form.districtId as Id<'places'> } : 'skip',
  );
  const divisionOptions = usePlaceOptions(divisions, language);
  const districtOptions = usePlaceOptions(districts, language);
  const upazilaOptions = usePlaceOptions(upazilas, language);

  // The draft follows every change, so leaving mid-step (or going to verify the phone) loses nothing.
  useEffect(() => {
    if (!finished.current) void saveDraft(profileId, step, form);
  }, [profileId, step, form]);

  /** Always from the latest form: two quick taps must both count. */
  const update = (patch: Partial<SetupForm> | ((f: SetupForm) => Partial<SetupForm>), clear: StepField[] = []) => {
    setForm((f) => ({ ...f, ...(typeof patch === 'function' ? patch(f) : patch) }));
    if (clear.length > 0) {
      setErrors((e) => {
        const next = { ...e };
        for (const field of clear) delete next[field];
        return next;
      });
    }
  };

  const errorText = (field: StepField) => (errors[field] ? t(errors[field]) : undefined);

  const goTo = (next: Step) => {
    setErrors({});
    setBanner(null);
    setStep(next);
  };

  const proceed = () => {
    const found = stepErrors(step, form, today);
    if (Object.keys(found).length > 0) {
      setErrors(found);
      return;
    }
    if (step < STEP_COUNT) goTo((step + 1) as Step);
    else void finish();
  };

  const locateMe = async () => {
    setLocating(true);
    setLocationFailed(false);
    const area = await locate();
    setLocating(false);
    if (!area) {
      setLocationFailed(true);
      return;
    }
    // Only the place ids: the location reading itself is never kept (not even in the draft).
    update({ divisionId: area.divisionId, districtId: area.districtId, upazilaId: area.upazilaId }, ['upazilaId']);
  };

  const verifyNow = async () => {
    await saveDraft(profileId, step, form);
    router.replace(`/verify-phone?next=${encodeURIComponent(SELF_HREF)}` as Href);
  };

  const finish = async () => {
    // A draft can bring back a later step; every step is checked again before sending.
    const invalid = firstInvalidStep(form, today);
    if (invalid !== null) {
      setStep(invalid);
      setErrors(stepErrors(invalid, form, today));
      return;
    }
    const consentVersion = config?.consentVersion;
    const args = consentVersion ? toUpsertArgs(form, today, consentVersion) : null;
    if (!args) {
      setBanner(t('errors.ERR_INTERNAL'));
      return;
    }
    setBusy(true);
    setBanner(null);
    try {
      await upsert({
        ...args,
        divisionId: args.divisionId as Id<'places'>,
        districtId: args.districtId as Id<'places'>,
        upazilaId: args.upazilaId as Id<'places'>,
      });
      finished.current = true;
      await forgetDraft(profileId);
      toast.show(t('donor.setup.done'));
      router.replace('/donor');
      // The first contextual moment to ask for notifications (SCR-D02 states). If refused, the Donate tab shows
      // "Alerts may not reach you" with Fix (the alert guide, SCR-D07, arrives in P4).
      void enablePush();
    } catch (error) {
      const message = errorMessage(error);
      const field = (error as { data?: { field?: string } }).data?.field as StepField | undefined;
      if (message.code === 'ERR_VALIDATION' && field && field in FIELD_STEP) {
        setStep(FIELD_STEP[field]);
        setErrors({ [field]: message.key });
      } else {
        setBanner(t(message.key, message.params ?? {}));
      }
    } finally {
      setBusy(false);
    }
  };

  const back = step > 1 ? () => goTo((step - 1) as Step) : undefined;
  const footer = (
    <View className="flex-row gap-s3">
      {back ? (
        <Button label={t('common.back')} variant="secondary" className="flex-1" onPress={back} disabled={busy} />
      ) : null}
      <Button
        label={step === STEP_COUNT ? t('donor.setup.finish') : t('common.continue')}
        className="flex-1"
        loading={busy}
        onPress={proceed}
      />
    </View>
  );

  return (
    <Screen title={t('donor.setup.title')} footer={footer}>
      <Progress step={step} />
      {banner ? <Banner kind="error" text={banner} /> : null}

      {step === 1 ? (
        <>
          <BloodGroupPicker
            label={t('donor.setup.groupTitle')}
            labelVariant="title"
            value={form.bloodGroup}
            extras={[{ value: 'unknown' as const, label: t('donor.setup.dontKnowGroup') }]}
            onChange={(bloodGroup) => {
              update({ bloodGroup }, ['bloodGroup']);
              if (bloodGroup === 'unknown') setUnknownInfo(true);
            }}
            error={errorText('bloodGroup')}
          />
          {form.bloodGroup === 'unknown' ? <Banner kind="info" text={t('donor.setup.unknownGroup')} /> : null}
          <Sheet
            open={unknownInfo}
            onClose={() => setUnknownInfo(false)}
            title={t('donor.setup.dontKnowGroup')}
            footer={<Button label={t('common.done')} block onPress={() => setUnknownInfo(false)} />}
          >
            <Text>{t('donor.setup.unknownGroup')}</Text>
          </Sheet>
        </>
      ) : null}

      {step === 2 ? (
        <>
          <Text variant="title" accessibilityRole="header">
            {t('donor.setup.whereTitle')}
          </Text>
          <View className="gap-s2">
            <Button
              label={t('donor.setup.locationOnce')}
              variant="secondary"
              icon={MapPin}
              loading={locating}
              onPress={() => void locateMe()}
            />
            <Text variant="small" tone="muted">
              {t('donor.setup.locationNote')}
            </Text>
          </View>
          {locationFailed ? <Banner kind="warning" text={t('donor.setup.locationFailed')} /> : null}
          <Select
            label={t('donor.setup.division')}
            value={form.divisionId}
            options={divisionOptions}
            onChange={(id) => setForm((f) => choosePlace(f, 'division', id))}
          />
          <Select
            label={t('donor.setup.district')}
            value={form.districtId}
            options={districtOptions}
            disabled={!form.divisionId}
            onChange={(id) => setForm((f) => choosePlace(f, 'district', id))}
          />
          <Select
            label={t('donor.setup.upazila')}
            value={form.upazilaId}
            options={upazilaOptions}
            disabled={!form.districtId}
            onChange={(id) => update((f) => choosePlace(f, 'upazila', id), ['upazilaId'])}
            error={errorText('upazilaId')}
          />
          <Input
            label={t('donor.setup.area')}
            value={form.areaText}
            onChangeText={(areaText) => update({ areaText }, ['areaText'])}
            maxLength={SHORT_TEXT_MAX}
            counter
            error={errorText('areaText')}
          />
          <Input
            label={t('donor.setup.institution')}
            value={form.institution}
            onChangeText={(institution) => update({ institution }, ['institution'])}
            maxLength={SHORT_TEXT_MAX}
            counter
            error={errorText('institution')}
          />
          <ChoiceGroup
            label={t('donor.setup.travel')}
            value={form.travelRange}
            layout="column"
            options={[
              { value: 'thana', label: t('donor.setup.travelThana') },
              { value: 'district', label: t('donor.setup.travelDistrict') },
            ]}
            onChange={(travelRange) => update({ travelRange }, ['travelRange'])}
            error={errorText('travelRange')}
          />
        </>
      ) : null}

      {step === 3 ? (
        <>
          <Text variant="title" accessibilityRole="header">
            {t('donor.setup.historyTitle')}
          </Text>
          <ChoiceGroup
            label={t('donor.setup.gender')}
            value={form.gender}
            options={GENDERS.map((g) => ({
              value: g,
              label: t(
                {
                  male: 'donor.setup.genderMale',
                  female: 'donor.setup.genderFemale',
                  other: 'donor.setup.genderOther',
                  unspecified: 'donor.setup.genderUnspecified',
                }[g],
              ),
            }))}
            helper={t('donor.setup.genderWhy')}
            onChange={(gender) => update({ gender }, ['gender'])}
            error={errorText('gender')}
          />
          <Checkbox
            label={t('donor.setup.never')}
            checked={form.neverDonated}
            onChange={(neverDonated) => update({ neverDonated }, ['lastDonationDate'])}
          />
          {form.neverDonated ? (
            errors.lastDonationDate ? (
              <FieldError text={t(errors.lastDonationDate)} />
            ) : null
          ) : (
            <>
              <DateField
                label={t('donor.setup.lastDate')}
                value={form.lastDonationDate}
                onChange={(lastDonationDate) => update({ lastDonationDate }, ['lastDonationDate'])}
                min="1970-01-01"
                max={today}
                error={errorText('lastDonationDate')}
              />
              <ChoiceGroup
                label={t('donor.setup.lastType')}
                value={form.lastDonationType}
                options={[
                  { value: 'whole_blood', label: t('blood.wholeBlood') },
                  { value: 'platelets', label: t('blood.platelets') },
                ]}
                onChange={(lastDonationType) => update({ lastDonationType })}
              />
            </>
          )}
          <View className="gap-s1">
            <Checkbox
              label={t('donor.setup.check50kg')}
              checked={form.checklist.weight}
              onChange={(weight) => update((f) => ({ checklist: { ...f.checklist, weight } }), ['checklist'])}
            />
            <Checkbox
              label={t('donor.setup.checkHealth')}
              checked={form.checklist.health}
              onChange={(health) => update((f) => ({ checklist: { ...f.checklist, health } }), ['checklist'])}
            />
            <Checkbox
              label={t('donor.setup.checkScreening')}
              checked={form.checklist.screening}
              onChange={(screening) => update((f) => ({ checklist: { ...f.checklist, screening } }), ['checklist'])}
            />
            {errors.checklist ? <FieldError text={t(errors.checklist)} /> : null}
          </View>
          <Text variant="small" tone="muted">
            {t('common.notMedicalAdvice')}
          </Text>
          <SwitchRow
            label={t('donor.setup.platelets')}
            helper={t('donor.setup.plateletsInfo')}
            value={form.plateletOptIn}
            onChange={(plateletOptIn) => update({ plateletOptIn })}
          />
        </>
      ) : null}

      {step === 4 ? (
        <>
          <Text variant="title" accessibilityRole="header">
            {t('donor.setup.privacyTitle')}
          </Text>
          <Text>{t('donor.setup.privacyBody')}</Text>
          <SwitchRow
            label={t('donor.setup.callMode')}
            value={form.callMode === 'donor_calls'}
            onChange={(on) => update({ callMode: on ? 'donor_calls' : 'mutual' })}
          />
          <View className="gap-s1">
            <Checkbox
              label={t('donor.setup.consentHealth')}
              checked={form.consent}
              onChange={(consent) => update({ consent }, ['consent'])}
            />
            {errors.consent ? <FieldError text={t(errors.consent)} /> : null}
          </View>
          {!phoneVerified ? (
            <Banner
              kind="warning"
              text={t('donor.notLive.phone')}
              action={
                canVerify(config) ? (
                  <Button label={t('home.verifyCta')} variant="secondary" size="sm" onPress={() => void verifyNow()} />
                ) : undefined
              }
            />
          ) : null}
        </>
      ) : null}
    </Screen>
  );
}
