/**
 * SCR-O04 · Verify your phone (specs §3.1, ADR-004, D-R1). Never blocks: "Do this later" goes on to `next`.
 *
 * Methods appear only when they work (specs §1.9): in person when `settings.verification.inPerson` is on; Telegram once
 * its bot and webhook exist; WhatsApp is off in v1. In person: the member gets a 6-character code for 10 minutes, shows
 * it to a volunteer, and this screen follows `phoneVerification.status` live until the volunteer confirms.
 */
import { api } from '@convex/_generated/api';
import type { Id } from '@convex/_generated/dataModel';
import { useMutation, useQuery } from 'convex/react';
import { Redirect, router, useLocalSearchParams, type Href } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { Banner, Button, Screen, Text } from '@/components';
import { ShieldCheck } from '@/components/icons';
import { LoadingScreen } from '@/features/account/Gate';
import { useAppConfig } from '@/lib/appConfig';
import { errorMessage } from '@/lib/errors';
import { safeNext } from '@/lib/gates';
import { displayPhone } from '@/lib/phone';
import { aroundValue, availableMethods, splitSteps } from '@/lib/verification';
import { colors } from '@/theme/tokens';

/** After "verified", the screen shows the success banner this long before moving on (specs SCR-O04 states). */
const SUCCESS_PAUSE_MS = 2000;
const CODE_MARKER = '§CODE§';

type Started = { verificationId: Id<'phoneVerifications'>; code: string; expiresAt: number };

export default function VerifyPhone() {
  const { t } = useTranslation();
  const params = useLocalSearchParams<{ next?: string }>();
  const next = safeNext(params.next) as Href;
  const config = useAppConfig();
  const me = useQuery(api.profiles.me);
  const startInPerson = useMutation(api.phoneVerification.startInPerson);

  const [started, setStarted] = useState<Started | null>(null);
  /** The code whose 10 minutes ran out on this device. */
  const [lateId, setLateId] = useState<Id<'phoneVerifications'> | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const live = useQuery(api.phoneVerification.status, started ? { verificationId: started.verificationId } : 'skip');

  // A live query does not re-run when time passes, so the screen also flips to "expired" on its own at `expiresAt`.
  useEffect(() => {
    if (!started) return undefined;
    const { verificationId, expiresAt } = started;
    const timer = setTimeout(() => setLateId(verificationId), Math.max(0, expiresAt - Date.now()));
    return () => clearTimeout(timer);
  }, [started]);

  const late = started !== null && lateId === started.verificationId;
  const status = live?.status === 'pending' && late ? 'expired' : live?.status;

  useEffect(() => {
    if (status !== 'verified') return undefined;
    const timer = setTimeout(() => router.replace(next), SUCCESS_PAUSE_MS);
    return () => clearTimeout(timer);
  }, [status, next]);

  if (me === undefined || config === undefined) return <LoadingScreen />;
  if (!me.profile) return <Redirect href="/home" />;
  if (me.profile.phoneVerified && !started) return <Redirect href={next} />;

  const methods = availableMethods(config);

  const start = async () => {
    setError(null);
    setBusy(true);
    try {
      setStarted(await startInPerson({}));
    } catch (caught) {
      const message = errorMessage(caught);
      setError(t(message.key, message.params ?? {}));
    } finally {
      setBusy(false);
    }
  };

  // "It doesn't match" closes the code card and brings the button back (Q-016).
  const waiting = started !== null && (status === undefined || status === 'pending');
  const [beforeCode, afterCode] = aroundValue(t('verify.inPersonCode', { code: CODE_MARKER }), CODE_MARKER);

  return (
    <Screen root>
      <View className="gap-s2 pt-s2">
        <Text variant="title" accessibilityRole="header">
          {t('verify.title')}
        </Text>
        <Text tone="muted">{t('verify.body')}</Text>
      </View>

      {status === 'verified' && live ? (
        <Banner kind="success" text={t('verify.success', { phone: displayPhone(live.enteredPhone) })} />
      ) : null}
      {error ? <Banner kind="error" text={error} /> : null}
      {status === 'expired' ? <Banner kind="warning" text={t('verify.expired')} /> : null}

      {methods.inPerson && status !== 'verified' ? (
        <View className="gap-s4 rounded-md border border-line bg-app p-s4">
          {waiting && started ? (
            <>
              <View className="items-center gap-s2 rounded-md bg-surface p-s4">
                <Text tone="muted">{beforeCode}</Text>
                <Text
                  variant="display"
                  selectable
                  accessibilityLabel={started.code.split('').join(' ')}
                  style={{ letterSpacing: 6 }}
                >
                  {started.code}
                </Text>
                {afterCode ? <Text tone="muted">{afterCode}</Text> : null}
              </View>
              <View className="gap-s2">
                {splitSteps(t('verify.inPersonSteps')).map((step) => (
                  <Text key={step}>{step}</Text>
                ))}
              </View>
              <Banner kind="info" text={t('verify.inPersonNotice')} />
              <View className="flex-row items-center gap-s3" accessibilityLiveRegion="polite">
                <ActivityIndicator color={colors.brand.primary} />
                <Text tone="muted">{t('verify.waiting')}</Text>
              </View>
            </>
          ) : (
            <Button label={t('verify.inPerson')} icon={ShieldCheck} block loading={busy} onPress={() => void start()} />
          )}
        </View>
      ) : null}

      {status !== 'verified' ? (
        <View className="gap-s2">
          <Pressable
            accessibilityRole="link"
            onPress={() => router.replace(next)}
            className="min-h-touch justify-center self-start"
          >
            <Text variant="bodyStrong" tone="brand" className="underline">
              {t('verify.later')}
            </Text>
          </Pressable>
          <Text variant="small" tone="muted">
            {t('verify.laterNote')}
          </Text>
        </View>
      ) : null}
    </Screen>
  );
}
