/**
 * `/` — first open goes to the welcome screen (SCR-O01: "first screen on first open") once it exists; otherwise
 * Home when signed in, sign-in when not. (The public landing page, SCR-P01, replaces this on the web in P6.)
 */
import { useConvexAuth } from 'convex/react';
import { Redirect } from 'expo-router';

import { LoadingScreen } from '@/features/account/Gate';
import { LEGAL_READY } from '@/features/legal/LegalDoc';
import { useLocalConsentVersion } from '@/lib/consent';

export default function Index() {
  const { isLoading, isAuthenticated } = useConvexAuth();
  const localConsent = useLocalConsentVersion();
  if (isLoading || localConsent === undefined) return <LoadingScreen />;
  if (LEGAL_READY && localConsent === null && !isAuthenticated) return <Redirect href="/welcome" />;
  return <Redirect href={isAuthenticated ? '/home' : '/sign-in'} />;
}
