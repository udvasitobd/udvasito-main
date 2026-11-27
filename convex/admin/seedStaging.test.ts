import { afterEach, describe, expect, it, vi } from 'vitest';

import { internal } from '../_generated/api';
import type { PlaceInput } from '../rules/places';
import { makeT } from '../test.setup';

// Test-only places (shape of the real ones).
const places: PlaceInput[] = [
  { level: 'division', code: 'T-DIV', nameEn: 'Test Division', nameBn: 'পরীক্ষা বিভাগ', lat: 22.7, lng: 91.7, isMetroThana: false },
  { level: 'district', code: 'T-CTG', nameEn: 'Chattogram', nameBn: 'চট্টগ্রাম', parentCode: 'T-DIV', lat: 22.33, lng: 91.83, isMetroThana: false },
  { level: 'upazila', code: 'T-U1', nameEn: 'North', nameBn: 'উত্তর', parentCode: 'T-CTG', lat: 22.5, lng: 91.8, isMetroThana: false },
  { level: 'upazila', code: 'T-U2', nameEn: 'City', nameBn: 'শহর', parentCode: 'T-CTG', lat: 22.36, lng: 91.83, isMetroThana: true },
];

async function loaded() {
  const t = makeT();
  await t.mutation(internal.admin.seed.upsertPlaces, { places });
  return t;
}

afterEach(() => vi.unstubAllEnvs());

describe('admin.seedStaging.seedDonors', () => {
  it('refuses to run on production or an unknown deployment', async () => {
    vi.stubEnv('SITE_URL', 'https://udvasito.com');
    await expect((await loaded()).mutation(internal.admin.seedStaging.seedDonors, {})).rejects.toThrow(/refuses to run on production/);
    vi.stubEnv('SITE_URL', '');
    await expect((await loaded()).mutation(internal.admin.seedStaging.seedDonors, {})).rejects.toThrow(/SITE_URL/);
  });

  it('creates live donors in every group for every Chattogram place, once', async () => {
    vi.stubEnv('SITE_URL', 'https://staging.udvasito.com');
    const t = await loaded();
    expect(await t.mutation(internal.admin.seedStaging.seedDonors, {})).toEqual({ inserted: 16, kept: 0, places: 2, groups: 8 });
    expect(await t.mutation(internal.admin.seedStaging.seedDonors, {})).toEqual({ inserted: 0, kept: 16, places: 2, groups: 8 });

    const donors = await t.run((ctx) => ctx.db.query('donorProfiles').collect());
    expect(donors).toHaveLength(16);
    expect(new Set(donors.map((d) => d.bloodGroup)).size).toBe(8);
    expect(donors.every((d) => d.live && !d.isDemo && d.alertCapPerDay === 3)).toBe(true);

    const profiles = await t.run((ctx) => ctx.db.query('profiles').collect());
    // Unallocated prefix only — never a number a real Bangladeshi phone could have (01[3-9]…).
    expect(profiles.every((p) => /^\+88010\d{8}$/.test(p.phone))).toBe(true);
    expect(new Set(profiles.map((p) => p.phone)).size).toBe(16);
  });

  it('needs the places to be loaded first', async () => {
    vi.stubEnv('SITE_URL', 'http://localhost:8081');
    await expect(makeT().mutation(internal.admin.seedStaging.seedDonors, {})).rejects.toThrow(/seed:places/);
  });
});
