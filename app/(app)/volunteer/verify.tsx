/**
 * SCR-V06 · Verify someone in person (specs §3.5, D-R1). Approved volunteers and admins (gate G7).
 *
 * Type the person's 6-character code → their first name and the last 4 digits only → they ring this phone, the
 * verifier rejects the call (৳0) and compares the digits → "It matches" / "It doesn't match". The full number is never
 * shown here. The server checks the code, the verifier's own code, the practice boundary and the daily limit.
 */
import { api } from '@convex/_generated/api';
import type { FunctionReturnType } from 'convex/server';
import { checkVerificationCode } from '@convex/rules/validation';
import { useConvex, useMutation, useQuery } from 'convex/react';
import { useRef, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { Banner, Button, Input, Screen, Text, useToast } from '@/components';
import { errorMessage } from '@/lib/errors';
import { colors } from '@/theme/tokens';

type Found = FunctionReturnType<typeof api.phoneVerification.lookupInPerson>;
type Outcome = { kind: 'done' } | { kind: 'failed' } | null;

/** How the hidden part of the number is drawn (specs SCR-V06: `•••• ••{{last4}}`). */
const HIDDEN_DIGITS = '•••• ••';
const CODE_LENGTH = 6;

export default function VerifyInPerson() {
  const { t } = useTranslation();
  const convex = useConvex();
  const toast = useToast();
  const confirm = useMutation(api.phoneVerification.confirmInPerson);
  const today = useQuery(api.phoneVerification.inPersonToday, {});

  const [code, setCode] = useState('');
  const [codeError, setCodeError] = useState<string | undefined>();
  const [found, setFound] = useState<Found | null>(null);
  const [looking, setLooking] = useState(false);
  const [deciding, setDeciding] = useState<'match' | 'noMatch' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [outcome, setOutcome] = useState<Outcome>(null);
  /** Only the latest lookup may update the screen (the code can change while one is running). */
  const latest = useRef(0);

  const show = (caught: unknown) => {
    const message = errorMessage(caught);
    setError(t(message.key, message.params ?? {}));
  };

  const lookup = async (value: string) => {
    const checked = checkVerificationCode(value);
    if (!checked.ok) {
      setCodeError(t(checked.error.messageKey));
      return;
    }
    const call = ++latest.current;
    setLooking(true);
    try {
      const result = await convex.query(api.phoneVerification.lookupInPerson, { code: checked.value });
      if (call === latest.current) setFound(result);
    } catch (caught) {
      if (call === latest.current) show(caught);
    } finally {
      if (call === latest.current) setLooking(false);
    }
  };

  const onCode = (value: string) => {
    const typed = value.toUpperCase().replace(/\s/g, '').slice(0, CODE_LENGTH);
    latest.current += 1;
    setCode(typed);
    setFound(null);
    setLooking(false);
    setError(null);
    setCodeError(undefined);
    if (typed.length > 0) setOutcome(null);
    if (typed.length === CODE_LENGTH) void lookup(typed);
  };

  const decide = async (matches: boolean) => {
    if (!found) return;
    setDeciding(matches ? 'match' : 'noMatch');
    setError(null);
    try {
      await confirm({ verificationId: found.verificationId, matches });
      if (matches) toast.show(t('verifyInPerson.done', { name: found.firstName }));
      setOutcome({ kind: matches ? 'done' : 'failed' });
      setFound(null);
      setCode('');
    } catch (caught) {
      show(caught);
    } finally {
      setDeciding(null);
    }
  };

  return (
    <Screen title={t('verifyInPerson.title')}>
      <Text tone="muted">{t('verifyInPerson.body')}</Text>

      {outcome?.kind === 'done' ? <Banner kind="info" text={t('verifyInPerson.deleteCall')} /> : null}
      {outcome?.kind === 'failed' ? <Banner kind="warning" text={t('verifyInPerson.failed')} /> : null}
      {error ? <Banner kind="error" text={error} /> : null}

      <Input
        label={t('verifyInPerson.code')}
        value={code}
        onChangeText={onCode}
        error={codeError}
        maxLength={CODE_LENGTH}
        autoCapitalize="characters"
        autoCorrect={false}
        autoComplete="off"
        spellCheck={false}
        textContentType="oneTimeCode"
      />

      {looking ? <ActivityIndicator color={colors.brand.primary} className="self-start" /> : null}

      {found ? (
        <View className="gap-s4 rounded-md border border-line bg-app p-s4">
          <View className="gap-s1">
            <Text variant="heading">{found.firstName}</Text>
            <Text variant="title" accessibilityLabel={found.phoneLast4.split('').join(' ')}>
              {HIDDEN_DIGITS}
              {found.phoneLast4}
            </Text>
          </View>
          <Text>{t('verifyInPerson.check', { name: found.firstName, last4: found.phoneLast4 })}</Text>
          <Button
            label={t('verifyInPerson.matches')}
            block
            loading={deciding === 'match'}
            disabled={deciding !== null}
            onPress={() => void decide(true)}
          />
          <Button
            label={t('verifyInPerson.noMatch')}
            variant="secondary"
            block
            loading={deciding === 'noMatch'}
            disabled={deciding !== null}
            onPress={() => void decide(false)}
          />
        </View>
      ) : null}

      {today ? (
        <Text variant="small" tone="muted">
          {t('verifyInPerson.count', { n: today.count, max: today.max })}
        </Text>
      ) : null}
    </Screen>
  );
}
