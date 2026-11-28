import { describe, expect, it } from 'vitest';

import file from '../../public/whats-new.json';
import { findPhoneNumbers } from './scrub';
import { latestReleaseId, newerReleases, parseWhatsNew, resolveOffer, type OfferInput, type Release } from './whatsNew';

const r = (id: number, date = '2026-11-28'): Release => ({ id, date, en: [`change ${id}`], bn: [`পরিবর্তন ${id}`] });

describe('parseWhatsNew', () => {
  it('reads a valid file, newest first', () => {
    expect(parseWhatsNew({ releases: [r(1), r(3), r(2)] })?.map((x) => x.id)).toEqual([3, 2, 1]);
  });

  it('rejects anything that is not a valid file (the app page, a broken release)', () => {
    expect(parseWhatsNew(null)).toBeNull();
    expect(parseWhatsNew('<!doctype html>')).toBeNull();
    expect(parseWhatsNew({ releases: [] })).toBeNull();
    expect(parseWhatsNew({ releases: [{ ...r(1), id: 0 }] })).toBeNull();
    expect(parseWhatsNew({ releases: [{ ...r(1), id: 1.5 }] })).toBeNull();
    expect(parseWhatsNew({ releases: [{ ...r(1), date: '28 Nov' }] })).toBeNull();
    expect(parseWhatsNew({ releases: [{ ...r(1), bn: [] }] })).toBeNull();
    expect(parseWhatsNew({ releases: [{ ...r(1), en: ['  '] }] })).toBeNull();
    expect(parseWhatsNew({ releases: [r(2), { id: 1 }] })).toBeNull();
  });
});

describe('latestReleaseId / newerReleases', () => {
  it('finds the newest id, 0 for none', () => {
    expect(latestReleaseId([r(2), r(5), r(4)])).toBe(5);
    expect(latestReleaseId(null)).toBe(0);
  });

  it('lists only releases newer than the running one, newest first', () => {
    expect(newerReleases([r(1), r(3), r(2)], 1).map((x) => x.id)).toEqual([3, 2]);
    expect(newerReleases([r(1)], 1)).toEqual([]);
    expect(newerReleases(null, 1)).toEqual([]);
  });
});

describe('resolveOffer', () => {
  const base: OfferInput = {
    native: true,
    currentId: 3,
    remote: null,
    ota: { available: false, pending: false, updateId: undefined },
    appVersion: '0.1.0',
    config: { latestAppVersion: '0.1.0', apkUrl: '' },
    dismissed: [],
  };
  const web: OfferInput = { ...base, native: false, config: undefined };

  it('web: offers a reload only when the live file is newer than the page', () => {
    expect(resolveOffer({ ...web, remote: [r(4), r(3)] })).toEqual({ kind: 'reload', key: 'web:4' });
    expect(resolveOffer({ ...web, remote: [r(3)] }).kind).toBe('none');
    expect(resolveOffer({ ...web, remote: [r(2)] }).kind).toBe('none');
    expect(resolveOffer({ ...web, remote: null }).kind).toBe('none');
  });

  it('web: never offers an app update, whatever expo-updates or the settings say', () => {
    const input = { ...web, ota: { available: true, pending: true, updateId: 'u1' } };
    expect(
      resolveOffer({ ...input, config: { latestAppVersion: '9.0.0', apkUrl: 'https://example.org/a.apk' } }).kind,
    ).toBe('none');
  });

  it('Android: offers an EAS Update when one is found, ready once downloaded', () => {
    expect(resolveOffer({ ...base, ota: { available: true, pending: false, updateId: 'u1' } })).toEqual({
      kind: 'ota',
      key: 'ota:u1',
      ready: false,
    });
    expect(resolveOffer({ ...base, ota: { available: true, pending: true, updateId: 'u1' } })).toEqual({
      kind: 'ota',
      key: 'ota:u1',
      ready: true,
    });
  });

  it('Android: the live notes alone never offer an update (the website can be ahead of the app)', () => {
    expect(resolveOffer({ ...base, remote: [r(9)] }).kind).toBe('none');
  });

  it('Android: offers a newer APK only when it is newer and has an address, after any EAS Update', () => {
    const apk = { latestAppVersion: '0.2.0', apkUrl: 'https://example.org/udvasito-0.2.0.apk' };
    expect(resolveOffer({ ...base, config: apk })).toEqual({ kind: 'apk', key: 'apk:0.2.0', url: apk.apkUrl });
    expect(resolveOffer({ ...base, config: { ...apk, apkUrl: '' } }).kind).toBe('none');
    expect(resolveOffer({ ...base, config: { ...apk, latestAppVersion: '0.1.0' } }).kind).toBe('none');
    expect(resolveOffer({ ...base, config: undefined }).kind).toBe('none');
    expect(resolveOffer({ ...base, config: apk, ota: { available: true, pending: false, updateId: 'u1' } }).kind).toBe(
      'ota',
    );
  });

  it('"Later" hides exactly that offer; a newer one shows again', () => {
    expect(resolveOffer({ ...web, remote: [r(4)], dismissed: ['web:4'] }).kind).toBe('none');
    expect(resolveOffer({ ...web, remote: [r(5)], dismissed: ['web:4'] }).kind).toBe('reload');
    const found = { available: true, pending: true, updateId: 'u1' };
    expect(resolveOffer({ ...base, ota: found, dismissed: ['ota:u1'] }).kind).toBe('none');
    expect(resolveOffer({ ...base, ota: { ...found, updateId: 'u2' }, dismissed: ['ota:u1'] }).kind).toBe('ota');
  });
});

describe('public/whats-new.json (the release notes every version bundles and the website serves)', () => {
  const releases = parseWhatsNew(file);

  it('is a valid file', () => {
    expect(releases).not.toBeNull();
  });

  it('is newest first, ids one apart, dates never going backwards', () => {
    const list = (file as { releases: Release[] }).releases;
    list.forEach((release, i) => {
      const older = list[i + 1];
      if (!older) return;
      expect(release.id).toBe(older.id + 1);
      expect(release.date >= older.date).toBe(true);
    });
  });

  it('has every change in both languages, and never a phone number', () => {
    for (const release of releases ?? []) {
      expect(release.bn).toHaveLength(release.en.length);
      for (const line of release.bn) expect(line).toMatch(/[ঀ-৿]/);
      for (const line of [...release.en, ...release.bn]) expect(findPhoneNumbers(line)).toEqual([]);
    }
  });
});
