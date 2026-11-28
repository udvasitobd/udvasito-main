/**
 * Update checks on the web (CMP-UpdateBanner, specs §1.3.5, Q-028). The page compares the whats-new.json it was built
 * with against the live `/whats-new.json` when it opens and each time the tab comes back into view — never on a
 * timer. Reloading gets the new site: index.html is revalidated on every visit (public/_headers).
 * Same exports as updates.native.ts, which Metro uses for the Android app.
 */
import { useEffect } from 'react';

import { CURRENT_RELEASE_ID, loadRemoteReleases, useUpdateState, type UpdateOfferState } from './updateStore';
import { newerReleases, resolveOffer, type UpdateOffer } from './whatsNew';

const NOTES_URL = '/whats-new.json';

export function useUpdateWatcher(): void {
  useEffect(() => {
    if (typeof document === 'undefined') return;
    const check = () => {
      if (document.visibilityState === 'visible') void loadRemoteReleases(NOTES_URL);
    };
    check();
    document.addEventListener('visibilitychange', check);
    window.addEventListener('focus', check);
    return () => {
      document.removeEventListener('visibilitychange', check);
      window.removeEventListener('focus', check);
    };
  }, []);
}

export function useUpdateOffer(): UpdateOfferState {
  const { remote, dismissed } = useUpdateState();
  const offer = resolveOffer({
    native: false,
    currentId: CURRENT_RELEASE_ID,
    remote,
    ota: { available: false, pending: false, updateId: undefined },
    appVersion: '',
    config: undefined,
    dismissed,
  });
  return { offer, notes: newerReleases(remote, CURRENT_RELEASE_ID) };
}

export async function applyUpdate(offer: UpdateOffer): Promise<void> {
  if (offer.kind === 'reload' && typeof window !== 'undefined') window.location.reload();
}
