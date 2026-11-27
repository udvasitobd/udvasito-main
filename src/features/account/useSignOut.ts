/**
 * Sign out (SCR-M06, SCR-O03 under-18 view, P0 Home): on Android this phone first stops receiving the account's
 * alerts, then the Better Auth session ends and the app goes to sign-in.
 */
import { api } from '@convex/_generated/api';
import { useMutation } from 'convex/react';
import { router } from 'expo-router';
import { useState } from 'react';

import { forgetAllDrafts } from '@/features/donor/draft';
import { pushAvailable } from '@/features/push/device';
import { authClient } from '@/lib/convex';

export function useSignOut() {
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const unregisterPush = useMutation(api.push.unregister);

  const signOut = async () => {
    setBusy(true);
    setFailed(false);
    try {
      // Best effort: signing out must work offline too. An account with no profile yet has no device registered.
      if (pushAvailable) await unregisterPush({}).catch(() => undefined);
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
