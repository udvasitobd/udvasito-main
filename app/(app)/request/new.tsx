/**
 * SCR-M02 · Request blood · `/request/new` — P1 form path (specs §3.2, stories R01–R03). One scrolling screen:
 * request details (group, whole blood/platelets + dengue, bags, place, needed by, contact, more details) and a
 * "Check and post" summary. The voice / text helper (Part A) comes with the AI intake phase.
 *
 * The same `clientId` is sent if Post is tapped again after a dropped connection, so a request is never posted twice.
 * `?dengue=1` pre-selects Platelets + the dengue chip.
 */
import { api } from '@convex/_generated/api';
import type { Id } from '@convex/_generated/dataModel';
import { UNITS_MAX, UNITS_MIN } from '@convex/rules/request';
import { useMutation, useQuery } from 'convex/react';
import { router, useLocalSearchParams } from 'expo-router';
import { useState, type ReactNode } from 'react';
import { View } from 'react-native';
import { useTranslation } from 'react-i18next';

import {
  Banner,
  BloodGroupPicker,
  Button,
  Checkbox,
  ChoiceGroup,
  DateField,
  HelplineButton,
  Input,
  ListGroup,
  ListRow,
  Screen,
  Stepper,
  Text,
  TimeField,
  groupLabel,
  useLanguage,
  useToast,
} from '@/components';
import { LoadingScreen } from '@/features/account/Gate';
import { PlacePicker } from '@/features/request/PlacePicker';
import {
  NEEDED_BY_MODES,
  defaultPick,
  emptyRequestForm,
  errorCount,
  formErrors,
  neededByOf,
  toCreateArgs,
  type FormErrors,
  type FormField,
  type NeededByMode,
  type RequestForm,
} from '@/features/request/requestForm';
import { useAppConfig } from '@/lib/appConfig';
import { newClientId } from '@/lib/clientId';
import { formatDhakaDateTime, toBanglaDigits, todayInDhaka } from '@/lib/dates';
import { errorMessage, type ErrorMessage } from '@/lib/errors';
import { intlLocale } from '@/lib/language';
import { displayPhone, normalisePhone } from '@/lib/phone';
import { useNow } from '@/lib/useNow';
import { canVerify } from '@/lib/verification';

/** VAL-09 / VAL-10 / VAL-11 field limits (the counters under the fields). */
const PATIENT_NAME_MAX = 60;
const WARD_MAX = 40;
const NOTE_MAX = 300;
/** VAL-08: at most 30 days ahead (the last day the date picker offers). */
const PICK_DAYS = 30;
const DAY_MS = 24 * 60 * 60 * 1000;
/** The "needed by" line refreshes this often while the form is open. */
const CLOCK_MS = 30_000;

const URGENCY_KEY: Record<NeededByMode, string> = {
  now: 'urgency.now',
  today: 'urgency.today',
  tomorrow: 'urgency.tomorrow',
  pick: 'urgency.pick',
};

export default function NewRequest() {
  const me = useQuery(api.profiles.me);
  const { dengue } = useLocalSearchParams<{ dengue?: string }>();
  if (!me?.profile) return <LoadingScreen />;
  return (
    <RequestFormScreen
      initial={emptyRequestForm({ dengue: dengue === '1', myPhone: me.profile.phone })}
      phoneVerified={me.profile.phoneVerified}
    />
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <View className="gap-s1 border-b border-line py-s2">
      <Text variant="small" tone="muted">
        {label}
      </Text>
      <Text variant="bodyStrong">{value}</Text>
    </View>
  );
}

function Section({ children }: { children: ReactNode }) {
  return <View className="gap-s4">{children}</View>;
}

function RequestFormScreen({ initial, phoneVerified }: { initial: RequestForm; phoneVerified: boolean }) {
  const { t } = useTranslation();
  const language = useLanguage();
  const toast = useToast();
  const config = useAppConfig();
  const create = useMutation(api.requests.create);
  const now = useNow(CLOCK_MS);
  const [clientId] = useState(newClientId);
  const [form, setForm] = useState<RequestForm>(initial);
  const [errors, setErrors] = useState<FormErrors>({});
  const [checked, setChecked] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [posting, setPosting] = useState(false);
  const [serverError, setServerError] = useState<ErrorMessage | null>(null);

  const upazilas = useQuery(
    api.places.list,
    form.districtId && !form.hospital ? { level: 'upazila', parentId: form.districtId as Id<'places'> } : 'skip',
  );

  /** Every change re-checks the form once Post has been tapped (errors disappear as they are fixed). */
  const update = (change: (f: RequestForm) => RequestForm) => {
    setForm((f) => change(f));
    setServerError(null);
  };
  const shownErrors = checked ? formErrors(form, now) : errors;
  const errorText = (field: FormField) => (shownErrors[field] ? t(shownErrors[field]) : undefined);
  const count = errorCount(shownErrors);

  const neededBy = neededByOf(form, now);
  // "{{count}} bags": the count picks the plural form; Bangla shows Bangla digits (specs §1.6 rule 3).
  const unitsLatin = t('request.unitsCount', { count: form.units });
  const unitsText = language === 'bn' ? toBanglaDigits(unitsLatin) : unitsLatin;

  const post = async () => {
    const at = Date.now();
    const found = formErrors(form, at);
    setChecked(true);
    setErrors(found);
    setServerError(null);
    if (errorCount(found) > 0) return;
    setPosting(true);
    try {
      const { hospitalId, divisionId, districtId, upazilaId, ...rest } = toCreateArgs(form, at, clientId, language);
      await create({
        ...rest,
        ...(hospitalId ? { hospitalId: hospitalId as Id<'hospitals'> } : {}),
        divisionId: divisionId as Id<'places'>,
        districtId: districtId as Id<'places'>,
        upazilaId: upazilaId as Id<'places'>,
      });
      toast.show(t('common.sent'));
      router.replace('/home');
    } catch (error) {
      const message = errorMessage(error);
      const field = (error as { data?: { field?: string } }).data?.field as FormField | undefined;
      if (message.code === 'ERR_VALIDATION' && field) {
        setChecked(false);
        setErrors({ [field]: message.key });
      } else {
        setServerError(message);
      }
    } finally {
      setPosting(false);
    }
  };

  const groupText =
    form.bloodGroup === 'any'
      ? t('blood.any')
      : form.bloodGroup === 'not_sure'
        ? t('blood.notSure')
        : form.bloodGroup
          ? groupLabel(form.bloodGroup)
          : '';
  const componentText = [
    form.component === 'platelets' ? t('blood.platelets') : t('blood.wholeBlood'),
    form.isDengue ? t('request.dengue') : '',
  ]
    .filter(Boolean)
    .join(' · ');
  const upazila = upazilas?.find((u) => u._id === form.upazilaId);
  const placeSummary = form.hospital
    ? language === 'bn'
      ? form.hospital.nameBn
      : form.hospital.nameEn
    : [form.placeText.trim(), upazila ? (language === 'bn' ? upazila.nameBn : upazila.nameEn) : '']
        .filter(Boolean)
        .join(', ');
  const phone = normalisePhone(form.contactPhone);

  const footer = (
    <View className="gap-s3">
      {count > 0 ? (
        <Banner
          kind="error"
          text={t('validation.summary', { count: new Intl.NumberFormat(intlLocale(language)).format(count) })}
        />
      ) : null}
      {serverError?.code === 'ERR_MONTHLY_REQUEST_LIMIT' ? (
        <Banner kind="error" text={t('request.monthlyLimit')} action={<HelplineButton labelKey="common.getHelp" />} />
      ) : serverError ? (
        <Banner
          kind="error"
          text={t(serverError.key, serverError.params ?? {})}
          action={
            serverError.code === 'ERR_OPEN_REQUEST_LIMIT' && !phoneVerified && canVerify(config) ? (
              <Button
                label={t('home.verifyCta')}
                variant="secondary"
                size="sm"
                onPress={() => router.push('/verify-phone?next=/request/new')}
              />
            ) : undefined
          }
        />
      ) : null}
      <Button
        label={posting ? t('request.posting') : t('request.post')}
        block
        loading={posting}
        disabled={posting}
        onPress={() => void post()}
      />
    </View>
  );

  return (
    <Screen title={t('request.new.title')} footer={footer}>
      <View className="gap-s8 py-s4">
        <Section>
          <BloodGroupPicker
            label={t('request.bloodGroup')}
            labelVariant="title"
            value={form.bloodGroup}
            extras={[
              { value: 'any', label: t('blood.any') },
              { value: 'not_sure', label: t('blood.notSure') },
            ]}
            onChange={(bloodGroup) => update((f) => ({ ...f, bloodGroup }))}
            error={errorText('bloodGroup')}
          />
          {form.bloodGroup === 'not_sure' ? <Banner kind="info" text={t('request.notSureNote')} /> : null}
        </Section>

        <Section>
          <ChoiceGroup
            label={t('request.whatNeeded')}
            value={form.component}
            options={[
              { value: 'whole_blood', label: t('blood.wholeBlood') },
              { value: 'platelets', label: t('blood.platelets') },
            ]}
            onChange={(component) => update((f) => ({ ...f, component }))}
            error={errorText('component')}
          />
          <Checkbox
            label={t('request.dengue')}
            checked={form.isDengue}
            onChange={(isDengue) => update((f) => ({ ...f, isDengue }))}
          />
        </Section>

        <Stepper
          label={t('request.units')}
          value={form.units}
          min={UNITS_MIN}
          max={UNITS_MAX}
          onStep={(delta) =>
            update((f) => ({ ...f, units: Math.min(UNITS_MAX, Math.max(UNITS_MIN, f.units + delta)) }))
          }
          valueText={unitsText}
          increaseLabel={t('request.unitsIncrease')}
          decreaseLabel={t('request.unitsDecrease')}
          error={errorText('unitsNeeded')}
        />

        <PlacePicker
          form={form}
          update={update}
          placeError={shownErrors.place}
          placeTextError={shownErrors.placeText}
        />

        <Section>
          <ChoiceGroup
            label={t('request.when')}
            value={form.neededBy}
            options={NEEDED_BY_MODES.map((mode) => ({ value: mode, label: t(URGENCY_KEY[mode]) }))}
            onChange={(mode) =>
              update((f) => ({
                ...f,
                neededBy: mode,
                ...(mode === 'pick' && !f.pickDate ? defaultPick(Date.now()) : {}),
              }))
            }
            error={errorText('neededBy')}
          />
          {form.neededBy === 'pick' ? (
            <View className="gap-s4">
              <DateField
                label={t('request.pickDate')}
                value={form.pickDate}
                onChange={(pickDate) => update((f) => ({ ...f, pickDate }))}
                min={todayInDhaka(now)}
                max={todayInDhaka(now + PICK_DAYS * DAY_MS)}
              />
              <TimeField
                label={t('request.pickTime')}
                value={form.pickTime}
                onChange={(pickTime) => update((f) => ({ ...f, pickTime }))}
              />
            </View>
          ) : null}
          {neededBy !== null ? (
            <Text tone="muted" accessibilityLiveRegion="polite">
              {t('request.neededByAt', { when: formatDhakaDateTime(neededBy, language) })}
            </Text>
          ) : null}
        </Section>

        <Input
          label={t('request.contact')}
          value={form.contactPhone}
          onChangeText={(contactPhone) => update((f) => ({ ...f, contactPhone }))}
          keyboardType="phone-pad"
          autoComplete="tel"
          helper={t('request.contactHelp')}
          error={errorText('contactPhone')}
        />

        <Section>
          <ListGroup>
            <ListRow
              label={t('request.more')}
              kind="expand"
              expanded={moreOpen}
              onPress={() => setMoreOpen((o) => !o)}
            />
          </ListGroup>
          {moreOpen || shownErrors.patientName || shownErrors.ward || shownErrors.note ? (
            <View className="gap-s4">
              <Input
                label={t('request.patientName')}
                value={form.patientName}
                onChangeText={(patientName) => update((f) => ({ ...f, patientName }))}
                helper={t('request.patientNameHelp')}
                maxLength={PATIENT_NAME_MAX}
                counter
                autoComplete="off"
                error={errorText('patientName')}
              />
              <Input
                label={t('request.ward')}
                value={form.ward}
                onChangeText={(ward) => update((f) => ({ ...f, ward }))}
                maxLength={WARD_MAX}
                counter
                error={errorText('ward')}
              />
              <Input
                label={t('request.note')}
                value={form.note}
                onChangeText={(note) => update((f) => ({ ...f, note }))}
                maxLength={NOTE_MAX}
                counter
                multiline
                error={errorText('note')}
              />
            </View>
          ) : null}
        </Section>

        <View className="gap-s3 rounded-md border border-line bg-surface p-s4">
          <Text variant="title" accessibilityRole="header">
            {t('request.review')}
          </Text>
          <View>
            {groupText ? <SummaryRow label={t('request.bloodGroup')} value={groupText} /> : null}
            <SummaryRow label={t('request.whatNeeded')} value={componentText} />
            <SummaryRow label={t('request.units')} value={unitsText} />
            {placeSummary ? <SummaryRow label={t('request.where')} value={placeSummary} /> : null}
            {neededBy !== null ? (
              <SummaryRow label={t('request.when')} value={formatDhakaDateTime(neededBy, language)} />
            ) : null}
            {phone.ok ? <SummaryRow label={t('request.contact')} value={displayPhone(phone.phone)} /> : null}
          </View>
          <Text variant="small" tone="muted">
            {t('common.notBloodBank')}
          </Text>
        </View>
      </View>
    </Screen>
  );
}
