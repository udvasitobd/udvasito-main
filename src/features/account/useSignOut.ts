/** Sign out (SCR-M06, SCR-O03 under-18 view, P0 Home): ends the Better Auth session, then goes to sign-in. */
import { router } from 'expo-router';
import { useState } from 'react';

import { forgetAllDrafts } from '@/features/donor/draft';
import { authClient } from '@/lib/convex';

export function useSignOut() {
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);

  const signOut = async () => {
    setBusy(true);
    setFailed(false);
    try {
      const result = await authClient.signOut();
      if (result.error) throw new Error(result.error.message);
      await forgetAllDrafts();
      router.replace('/sign-in');
    } catch {
      setFailed(true);
      setBusy(false);
    }
  };

  return { signOut, busy, failed };
}
