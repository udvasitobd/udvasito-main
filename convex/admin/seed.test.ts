/**
 * Places seed (internal, CLI only): idempotent upsert by code, parents first, neighbours from settings.neighbourKm.
 * Fixtures below are test-only rows (staging/production data comes from the dataset via scripts/seed-places.ts).
 */
import { describe, expect, it } from 'vitest';

import { internal } from '../_generated/api';
import type { PlaceInput } from '../rules/places';
import { makeT } from '../test.setup';

const places: PlaceInput[] = [
  { level: 'division', code: 'T-DIV', nameEn: 'Test Division', nameBn: 'পরীক্ষা বিভাগ', lat: 22.3, lng: 91.8, isMetroThana: false },
  { level: 'district', code: 'T-DIS', nameEn: 'Test District', nameBn: 'পরীক্ষা জেলা', parentCode: 'T-DIV', lat: 22.33, lng: 91.83, isMetroThana: false },
  { level: 'upazila', code: 'T-U1', nameEn: 'North', nameBn: 'উত্তর', parentCode: 'T-DIS', lat: 22.3, lng: 91.8, isMetroThana: false },
  { level: 'upazila', code: 'T-U2', nameEn: 'Middle', nameBn: 'মধ্য', parentCode: 'T-DIS', lat: 22.35, lng: 91.8, isMetroThana: true },
  { level: 'upazila', code: 'T-U3', nameEn: 'Far', nameBn: 'দূর', parentCode: 'T-DIS', lat: 22.6, lng: 91.8, isMetroThana: false },
];

describe('admin.seed places', () => {
  it('inserts once, then reports everything unchanged', async () => {
    const t = makeT();
    expect(await t.mutation(internal.admin.seed.upsertPlaces, { places })).toEqual({ inserted: 5, updated: 0, unchanged: 0 });
    expect(await t.mutation(internal.admin.seed.upsertPlaces, { places })).toEqual({ inserted: 0, updated: 0, unchanged: 5 });
  });

  it('links parents and updates a changed name without a new row', async () => {
    const t = makeT();
    await t.mutation(internal.admin.seed.upsertPlaces, { places });
    const renamed = places.map((p) => (p.code === 'T-U1' ? { ...p, nameBn: 'উত্তর পাড়া' } : p));
    expect(await t.mutation(internal.admin.seed.upsertPlaces, { places: renamed })).toEqual({ inserted: 0, updated: 1, unchanged: 4 });
    const rows = await t.run((ctx) => ctx.db.query('places').withIndex('by_code').collect());
    expect(rows).toHaveLength(5);
    const byCode = new Map(rows.map((r) => [r.code, r]));
    expect(byCode.get('T-U1')?.nameBn).toBe('উত্তর পাড়া');
    expect(byCode.get('T-U1')?.parentId).toBe(byCode.get('T-DIS')?._id);
    expect(byCode.get('T-DIS')?.parentId).toBe(byCode.get('T-DIV')?._id);
    expect(byCode.get('T-DIV')?.parentId).toBeUndefined();
  });

  it('refuses a child whose parent is not loaded, and an invalid row', async () => {
    const t = makeT();
    await expect(t.mutation(internal.admin.seed.upsertPlaces, { places: [places[2]!] })).rejects.toThrow(/parent T-DIS is not loaded/);
    await expect(
      t.mutation(internal.admin.seed.upsertPlaces, { places: [{ ...places[0]!, lat: 91.8, lng: 22.3 }] }),
    ).rejects.toThrow(/outside Bangladesh/);
  });

  it('computes neighbours within settings.neighbourKm (default 10 km), and again when the setting changes', async () => {
    const t = makeT();
    await t.mutation(internal.admin.seed.upsertPlaces, { places });
    const first = await t.mutation(internal.admin.seed.computeNeighbours, {});
    expect(first).toMatchObject({ km: 10, changed: 2, counts: { division: 1, district: 1, upazila: 3 }, metroThanas: 1 });

    const neighbours = async () => {
      const rows = await t.run((ctx) => ctx.db.query('places').withIndex('by_code').collect());
      const codeById = new Map(rows.map((r) => [r._id, r.code]));
      return Object.fromEntries(rows.filter((r) => r.level === 'upazila').map((r) => [r.code, r.neighbourIds.map((id) => codeById.get(id))]));
    };
    expect(await neighbours()).toEqual({ 'T-U1': ['T-U2'], 'T-U2': ['T-U1'], 'T-U3': [] });

    // Unchanged data → nothing written.
    expect(await t.mutation(internal.admin.seed.computeNeighbours, {})).toMatchObject({ changed: 0 });

    await t.run((ctx) => ctx.db.insert('settings', { key: 'neighbourKm', value: 35 }));
    expect(await t.mutation(internal.admin.seed.computeNeighbours, {})).toMatchObject({ km: 35, changed: 3 });
    expect(await neighbours()).toEqual({ 'T-U1': ['T-U2', 'T-U3'], 'T-U2': ['T-U1', 'T-U3'], 'T-U3': ['T-U2', 'T-U1'] });
  });
});
