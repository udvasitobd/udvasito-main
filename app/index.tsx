/**
 * `/` — sends people to Home when signed in, otherwise to sign-in. (The public landing page, SCR-P01, replaces this
 * on the web in a later phase.)
 */
import { useConvexAuth } from 'convex/react';
import { Redirect } from 'expo-router';

import { LoadingScreen } from '@/features/account/Gate';

export default function Index() {
  const { isLoading, isAuthenticated } = useConvexAuth();
  if (isLoading) return <LoadingScreen />;
  return <Redirect href={isAuthenticated ? '/home' : '/sign-in'} />;
}
