/** Saves the language the person picks to their profile (specs §1.6 rule 2), so alerts arrive in that language. */
import { api } from '@convex/_generated/api';
import { useConvexAuth, useMutation } from 'convex/react';
import { useEffect } from 'react';

import { onLanguagePicked } from '@/lib/i18n';

export function LanguageSync() {
  const { isAuthenticated } = useConvexAuth();
  const update = useMutation(api.profiles.updateLanguage);
  useEffect(
    () =>
      onLanguagePicked((language) => {
        // No profile yet (consent/onboarding) → onboarding stores the language instead; nothing to show.
        if (isAuthenticated) void update({ language }).catch(() => undefined);
      }),
    [isAuthenticated, update],
  );
  return null;
}
