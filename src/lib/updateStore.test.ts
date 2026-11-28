import { afterEach, describe, expect, it, vi } from 'vitest';

import bundled from '../../public/whats-new.json';
import { CURRENT_RELEASE_ID, dismissOffer, getUpdateState, loadRemoteReleases } from './updateStore';
import { latestReleaseId, parseWhatsNew } from './whatsNew';

const release = (id: number) => ({ id, date: '2026-11-29', en: ['A change'], bn: ['একটি পরিবর্তন'] });

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('updateStore', () => {
  it('knows the running version from the bundled whats-new.json', () => {
    expect(CURRENT_RELEASE_ID).toBe(latestReleaseId(parseWhatsNew(bundled)));
    expect(CURRENT_RELEASE_ID).toBeGreaterThan(0);
  });

  it('reads the live file without any cache', async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({ releases: [release(2), release(1)] })));
    vi.stubGlobal('fetch', fetchMock);
    await loadRemoteReleases('https://staging.udvasito.com/whats-new.json');
    expect(fetchMock).toHaveBeenCalledWith('https://staging.udvasito.com/whats-new.json', {
      cache: 'no-store',
      headers: { 'Cache-Control': 'no-cache' },
    });
    expect(getUpdateState().remote?.map((r) => r.id)).toEqual([2, 1]);
  });

  it('keeps what it had when offline, on an error or when the site answers with the app page', async () => {
    const before = getUpdateState().remote;
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response('<!doctype html><html></html>')),
    );
    await loadRemoteReleases('/whats-new.json');
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response('nope', { status: 500 })),
    );
    await loadRemoteReleases('/whats-new.json');
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        throw new TypeError('Network request failed');
      }),
    );
    await loadRemoteReleases('/whats-new.json');
    expect(getUpdateState().remote).toBe(before);
  });

  it('asks only once while a read is still running', async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({ releases: [release(3)] })));
    vi.stubGlobal('fetch', fetchMock);
    await Promise.all([loadRemoteReleases('/whats-new.json'), loadRemoteReleases('/whats-new.json')]);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('"Later" records an offer once', () => {
    dismissOffer('web:4');
    dismissOffer('web:4');
    expect(getUpdateState().dismissed).toEqual(['web:4']);
  });
});
