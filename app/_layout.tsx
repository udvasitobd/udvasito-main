/**
 * Root layout — specs §1.2 / §1.5: providers (Convex + Better Auth, i18n, fonts, safe area, toasts), the G2 splash
 * (fonts + i18n, at most 2 s, then system fonts). Gates G1, G3–G7 run in the group layouts (src/features/account/Gate).
 */
import '../global.css';

import { ConvexBetterAuthProvider } from '@convex-dev/better-auth/react';
import { NotoSans_400Regular, NotoSans_600SemiBold, NotoSans_700Bold } from '@expo-google-fonts/noto-sans';
import {
  NotoSansBengali_400Regular,
  NotoSansBengali_600SemiBold,
  NotoSansBengali_700Bold,
} from '@expo-google-fonts/noto-sans-bengali';
import { useFonts } from 'expo-font';
import { Stack, type ErrorBoundaryProps } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { I18nextProvider } from 'react-i18next';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';

import { ErrorState, FontsLoadedContext, ToastProvider } from '@/components';
import { AppRoot } from '@/components/AppRoot';
import { useCampaignCapture } from '@/lib/campaign';
import { authClient, convex } from '@/lib/convex';
import { i18n, initI18n } from '@/lib/i18n';
import { initSentry, reportError } from '@/lib/sentry';
import { colors } from '@/theme/tokens';

initSentry();
void SplashScreen.preventAutoHideAsync().catch(() => undefined);

const FONT_TIMEOUT_MS = 2000;

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    NotoSans_400Regular,
    NotoSans_600SemiBold,
    NotoSans_700Bold,
    NotoSansBengali_400Regular,
    NotoSansBengali_600SemiBold,
    NotoSansBengali_700Bold,
  });
  const [i18nReady, setI18nReady] = useState(false);
  useCampaignCapture();
  const [fontWaitOver, setFontWaitOver] = useState(false);

  useEffect(() => {
    void initI18n().finally(() => setI18nReady(true));
    const timer = setTimeout(() => setFontWaitOver(true), FONT_TIMEOUT_MS);
    return () => clearTimeout(timer);
  }, []);

  const ready = i18nReady && (fontsLoaded || Boolean(fontError) || fontWaitOver);

  useEffect(() => {
    if (ready) void SplashScreen.hideAsync().catch(() => undefined);
  }, [ready]);

  if (!ready) return null;

  return (
    <AppRoot>
      <ConvexBetterAuthProvider client={convex} authClient={authClient}>
        <I18nextProvider i18n={i18n}>
          <FontsLoadedContext.Provider value={fontsLoaded}>
            <SafeAreaProvider>
              <ToastProvider>
                <StatusBar style="dark" />
                <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bg.app } }} />
              </ToastProvider>
            </SafeAreaProvider>
          </FontsLoadedContext.Provider>
        </I18nextProvider>
      </ConvexBetterAuthProvider>
    </AppRoot>
  );
}

/** Any render error lands here: CMP-ErrorState with Try again (and the helpline when it is set). */
export function ErrorBoundary({ error, retry }: ErrorBoundaryProps) {
  useEffect(() => reportError(error), [error]);
  return (
    <SafeAreaProvider>
      <SafeAreaView className="flex-1 items-center justify-center bg-app">
        <ErrorState error={error} onRetry={() => void retry()} showHelp={false} />
      </SafeAreaView>
    </SafeAreaProvider>
  );
}
