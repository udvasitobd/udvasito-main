/**
 * SCR-O03 · About you (specs §3.1): full name, date of birth (18+), mobile number. The server re-checks everything
 * (`profiles.completeOnboarding`), stores the consent given on the welcome screen and decides under-18 (G-13).
 * Under 18 → the form is replaced by the under-age message, the helpline and sign out.
 */
import { api } from '@convex/_generated/api';
import { checkDateOfBirth, checkName, checkPhone, NAME_MAX_LENGTH } from '@convex/rules/validation';
import { useConvexAuth, useMutation, useQuery } from 'convex/react';
import { Redirect, router, useLocalSearchParams, type Href } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { Banner, Button, DateField, HelplineButton, Input, Screen, Text, useLanguage } from '@/components';
import { NotFound } from '@/components/NotFound';
import { LogOut } from '@/components/icons';
import { LoadingScreen } from '@/features/account/Gate';
import { useSignOut } from '@/features/account/useSignOut';
import { LEGAL_READY } from '@/features/legal/LegalDoc';
import { forgetCampaign, readCampaign } from '@/lib/campaign';
import { readLocalConsent } from '@/lib/consent';
import { addYears, todayInDhaka } from '@/lib/dates';
import { errorMessage } from '@/lib/errors';
import { safeNext } from '@/lib/gates';

type FieldName = 'name' | 'dateOfBirth' | 'phone';
type Errors = Partial<Record<FieldName, string>>;

const PHONE_PREFIX = '+88';
/** Where the calendar opens (a typical adult's birth year) — a convenience, not an age rule. */
const CALENDAR_OPENS_YEARS_BACK = 25;
const WELCOME_THEN_ONBOARDING = `/welcome?next=${encodeURIComponent('/onboarding')}`;

function Underage() {
  const { t } = useTranslation();
  const { signOut, busy, failed } = useSignOut();
  return (
    <Screen root>
      <View className="gap-s4 py-s6">
        <Text variant="title" accessibilityRole="header">
          {t('onboarding.underage.title')}
        </Text>
        <Text>{t('onboarding.underage.body')}</Text>
      </View>
      <HelplineButton labelKey="request.fallbackTitle" variant="primary" />
      {failed ? <Banner kind="error" text={t('errors.ERR_INTERNAL')} /> : null}
      <Button label={t('settings.signOut')} variant="secondary" icon={LogOut} block loading={busy} onPress={() => void signOut()} />
    </Screen>
  );
}

export default function Onboarding() {
  const { t } = useTranslation();
  const language = useLanguage();
  const params = useLocalSearchParams<{ next?: string }>();
  const { isAuthenticated } = useConvexAuth();
  const me = useQuery(api.profiles.me, isAuthenticated ? {} : 'skip');
  const complete = useMutation(api.profiles.completeOnboarding);

  const [name, setName] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [phone, setPhone] = useState('');
  const [errors, setErrors] = useState<Errors>({});
  const [banner, setBanner] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [underage, setUnderage] = useState(false);

  if (!LEGAL_READY) return <NotFound />;
  if (underage || me?.profile?.status === 'underage_blocked') return <Underage />;
  if (me === undefined) return <LoadingScreen />;
  // Already onboarded (another tab, or back navigation): carry on.
  if (me.profile) return <Redirect href={safeNext(params.next) as Href} />;

  const today = todayInDhaka();

  /** Editing a field clears its message; the next Continue checks again. */
  const edit = (field: FieldName, set: (value: string) => void) => (value: string) => {
    set(value);
    if (errors[field]) setErrors(({ [field]: _cleared, ...rest }) => rest);
  };

  /** VAL-01/02/03 on the device for instant messages; the server checks again. */
  const validate = (): Errors => {
    const found: Errors = {};
    const n = checkName(name);
    if (!n.ok) found.name = t(n.error.messageKey, n.error.params ?? {});
    // The minimum age is the server's decision (settings S-01); here only "is this a real date".
    const d = checkDateOfBirth(dateOfBirth, today, 0);
    if (!d.ok) found.dateOfBirth = t(d.error.messageKey, d.error.params ?? {});
    const p = checkPhone(phone);
    if (!p.ok) found.phone = t(p.error.messageKey, p.error.params ?? {});
    return found;
  };

  const submit = async () => {
    setBanner(null);
    const found = validate();
    setErrors(found);
    if (Object.keys(found).length > 0) return;

    const consent = await readLocalConsent();
    if (!consent) {
      router.replace(WELCOME_THEN_ONBOARDING as Href);
      return;
    }
    setBusy(true);
    try {
      const campaignCode = await readCampaign();
      const { result } = await complete({
        name,
        dateOfBirth,
        phone,
        language,
        consentVersion: consent.consentVersion,
        consentAcceptedAt: consent.acceptedAt,
        ...(campaignCode ? { campaignCode } : {}),
      });
      if (result === 'underage') {
        setUnderage(true);
        return;
      }
      void forgetCampaign();
      router.replace(safeNext(params.next) as Href);
    } catch (error) {
      const message = errorMessage(error);
      const field = (error as { data?: { field?: string } }).data?.field;
      if (message.code === 'ERR_CONSENT_REQUIRED') {
        router.replace(WELCOME_THEN_ONBOARDING as Href);
      } else if (message.code === 'ERR_VALIDATION' && (field === 'name' || field === 'dateOfBirth' || field === 'phone')) {
        setErrors({ [field]: t(message.key, message.params ?? {}) });
      } else {
        setBanner(t(message.key, message.params ?? {}));
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen root>
      <View className="gap-s2 pt-s2">
        <Text variant="title" accessibilityRole="header">
          {t('onboarding.title')}
        </Text>
        <Text tone="muted">{t('onboarding.body')}</Text>
      </View>

      {banner ? <Banner kind="error" text={banner} /> : null}

      <Input
        label={t('onboarding.name')}
        value={name}
        onChangeText={edit('name', setName)}
        error={errors.name}
        maxLength={NAME_MAX_LENGTH}
        counter
        autoComplete="name"
        textContentType="name"
        autoCapitalize="words"
        returnKeyType="next"
      />
      <DateField
        label={t('onboarding.dob')}
        value={dateOfBirth}
        onChange={edit('dateOfBirth', setDateOfBirth)}
        helper={t('onboarding.dobHelp')}
        error={errors.dateOfBirth}
        max={today}
        initial={addYears(today, -CALENDAR_OPENS_YEARS_BACK)}
      />
      <Input
        label={t('onboarding.phone')}
        value={phone}
        onChangeText={edit('phone', setPhone)}
        helper={t('onboarding.phoneHelp')}
        error={errors.phone}
        prefix={PHONE_PREFIX}
        keyboardType="phone-pad"
        inputMode="tel"
        autoComplete="tel"
        textContentType="telephoneNumber"
        returnKeyType="done"
        onSubmitEditing={() => void submit()}
      />

      <Button label={t('common.continue')} block loading={busy} onPress={() => void submit()} />
    </Screen>
  );
}
