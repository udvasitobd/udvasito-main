/**
 * SCR-O02 · Sign in (specs §2, ADR-003) — Continue with Google; the helpline is fetched on tap (D-R3).
 * Email-code sign-in (T-5, off) and practice sign-in (D-R4, P5) are not built yet, so they are not shown (§1.9).
 */
import { useConvexAuth } from 'convex/react';
import { Redirect, useLocalSearchParams, type Href } from 'expo-router';
import { useState } from 'react';
import { Platform, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { Banner, Button, GoogleMark, HelplineButton, LogoMark, Screen, Text } from '@/components';
import { authClient } from '@/lib/convex';
import { safeNext } from '@/lib/gates';

/** Where Google sends the person back to. Web needs an absolute URL on this site; Android gets udvasito://<path>. */
function callbackFor(path: string): string {
  if (Platform.OS === 'web' && typeof window !== 'undefined') return new URL(path, window.location.origin).toString();
  return path;
}

export default function SignIn() {
  const { t } = useTranslation();
  const params = useLocalSearchParams<{ next?: string }>();
  const next = safeNext(params.next);
  const { isAuthenticated } = useConvexAuth();
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);

  // Success: the gates on the next route send an incomplete profile to onboarding (G5).
  if (isAuthenticated) return <Redirect href={next as Href} />;

  const signInWithGoogle = async () => {
    setFailed(false);
    setBusy(true);
    try {
      const result = await authClient.signIn.social({ provider: 'google', callbackURL: callbackFor(next) });
      if (result.error) setFailed(true);
    } catch {
      setFailed(true);
    } finally {
      // On web the page navigates to Google; on Android the browser sheet has closed by now.
      setBusy(false);
    }
  };

  return (
    <Screen root>
      <View className="flex-1 justify-center gap-s6 py-s6">
        <View className="items-center gap-s4">
          <LogoMark size={72} />
          <Text variant="title" className="text-center" accessibilityRole="header">
            {t('signin.title')}
          </Text>
          <Text tone="muted" className="max-w-sm text-center">
            {t('signin.body')}
          </Text>
        </View>

        <View className="w-full max-w-sm gap-s3 self-center">
          {failed ? <Banner kind="error" text={t('signin.error')} /> : null}
          <Button
            label={t('signin.google')}
            variant="secondary"
            block
            loading={busy}
            leading={<GoogleMark />}
            onPress={() => void signInWithGoogle()}
          />
          <Text variant="small" tone="muted" className="text-center">
            {t('signin.why')}
          </Text>
        </View>

        <View className="w-full max-w-sm self-center">
          <HelplineButton labelKey="signin.helpline" variant="ghost" />
        </View>
      </View>
    </Screen>
  );
}
