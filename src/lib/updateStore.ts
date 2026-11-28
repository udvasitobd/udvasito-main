/**
 * Shared state of the update bar (CMP-UpdateBanner, Q-028): the website's release notes and the offers closed with
 * "Later" in this run of the app. A tiny store on React's `useSyncExternalStore` — no store library in the web bundle.
 */
import { useSyncExternalStore } from 'react';

import bundled from '../../public/whats-new.json';
import { latestReleaseId, parseWhatsNew, type Release, type UpdateOffer } from './whatsNew';

/** The running version's release id: the highest id in the whats-new.json this version was built with. */
export const CURRENT_RELEASE_ID = latestReleaseId(parseWhatsNew(bundled));

export type UpdateState = { remote: Release[] | null; dismissed: readonly string[] };

/** What `useUpdateOffer` returns on every platform (src/lib/updates.ts and updates.native.ts). */
export type UpdateOfferState = { offer: UpdateOffer; notes: Release[] };

let state: UpdateState = { remote: null, dismissed: [] };
const listeners = new Set<() => void>();

function setState(next: Partial<UpdateState>) {
  state = { ...state, ...next };
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

const snapshot = () => state;

/** The current state outside React (tests). */
export const getUpdateState = snapshot;

export function useUpdateState(): UpdateState {
  return useSyncExternalStore(subscribe, snapshot, snapshot);
}

/** "Later": hide this offer until the app restarts or a newer one appears. */
export function dismissOffer(key: string): void {
  if (!state.dismissed.includes(key)) setState({ dismissed: [...state.dismissed, key] });
}

let reading: Promise<void> | null = null;

/** Reads the website's whats-new.json, never from a cache. Offline, or not there yet: keeps what it had. */
export function loadRemoteReleases(url: string): Promise<void> {
  reading ??= (async () => {
    try {
      const response = await fetch(url, { cache: 'no-store', headers: { 'Cache-Control': 'no-cache' } });
      if (!response.ok) return;
      const releases = parseWhatsNew(await response.json());
      if (releases) setState({ remote: releases });
    } catch {
      // Offline, or the address answered with the app page instead of the file: no bar, nothing to report.
    } finally {
      reading = null;
    }
  })();
  return reading;
}
