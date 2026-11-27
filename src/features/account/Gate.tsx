/**
 * Gates G1, G3–G7 (src/lib/gates.ts) for one route group. The group's navigator always stays mounted (if it
 * disappears, the URL falls back to the group root and the gate loops); instead each *screen* is wrapped through
 * React Navigation's `screenLayout`, so the focused screen's content is replaced by a skeleton, a redirect or the
 * forbidden state. While a gate waits for data a skeleton is shown — never a blank screen (specs §1.5).
 */
import { api } from '@convex/_generated/api';
import { useConvexAuth, useQueries, type RequestForQueries } from 'convex/react';
import type { FunctionReturnType } from 'convex/server';
import Constants from 'expo-constants';
import { Redirect, router, Stack, usePathname, useSegments, type Href } from 'expo-router';
import { useMemo, type ReactElement } from 'react';
import { Platform, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button, ErrorState, SkeletonCard } from '@/components';
import { useAppConfig } from '@/lib/appConfig';
import { useLocalConsentVersion } from '@/lib/consent';
import { readMe, resolveGate } from '@/lib/gates';
import { colors } from '@/theme/tokens';

const APP_VERSION = Constants.expoConfig?.version ?? '0.0.0';

type Group = '(app)' | '(onboarding)';

export function LoadingScreen() {
  return (
    <SafeAreaView className="flex-1 bg-app">
      <View aria-busy className="w-full max-w-content gap-s4 self-center p-s4">
        <SkeletonCard />
        <SkeletonCard />
      </View>
    </SafeAreaView>
  );
}

type Me = FunctionReturnType<typeof api.profiles.me>;

/** `profiles.me` without throwing during render: a session that ended on the server reads as signed out. */
function useMe(isAuthenticated: boolean) {
  const queries = useMemo(() => {
    const request: RequestForQueries = {};
    if (isAuthenticated) request.me = { query: api.profiles.me, args: {} };
    return request;
  }, [isAuthenticated]);
  const results = useQueries(queries);
  return readMe(results.me as Me | Error | undefined);
}

function GateScreen({ group, focused, children }: { group: Group; focused: boolean; children: ReactElement }) {
  const { t } = useTranslation();
  const path = usePathname();
  const segments = useSegments();
  const { isLoading, isAuthenticated } = useConvexAuth();
  const config = useAppConfig();
  const { me, sessionEnded } = useMe(isAuthenticated);
  const localConsentVersion = useLocalConsentVersion();

  // Only the focused screen of the active group decides; screens below it in the stack (or a group that is being
  // replaced) keep their content.
  if (!focused || segments[0] !== group) return children;

  const result = resolveGate({
    native: Platform.OS !== 'web',
    appVersion: APP_VERSION,
    config,
    localConsentVersion,
    auth: isLoading ? 'loading' : isAuthenticated && !sessionEnded ? 'signedIn' : 'signedOut',
    me: me
      ? {
          needsOnboarding: me.flags.needsOnboarding,
          serverConsentCurrent: !me.needsConsent,
          status: me.profile?.status ?? null,
          role: me.profile?.role ?? null,
        }
      : undefined,
    path,
  });

  switch (result.kind) {
    case 'wait':
      return <LoadingScreen />;
    case 'redirect':
      return <Redirect href={result.to as Href} />;
    case 'forbidden':
      return (
        <SafeAreaView className="flex-1 items-center justify-center gap-s4 bg-app p-s4">
          <ErrorState code="ERR_FORBIDDEN" showHelp={false} />
          <Button label={t('common.back')} variant="secondary" onPress={() => router.replace('/home')} />
        </SafeAreaView>
      );
    case 'ok':
      return children;
  }
}

/** The Stack of a gated route group. */
export function GatedStack({ group }: { group: Group }) {
  return (
    <Stack
      screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bg.app } }}
      screenLayout={({ children, navigation }) => (
        <GateScreen group={group} focused={navigation.isFocused()}>
          {children}
        </GateScreen>
      )}
    />
  );
}
