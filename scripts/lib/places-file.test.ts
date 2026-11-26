import { describe, expect, it } from 'vitest';

import type { PlaceInput } from '../../convex/rules/places';
import { chunkBySize, datasetErrors, insertBatches, parseDataset, toMin } from './places-file';

// Test fixtures only — the real rows come from data/places.json.
function dataset(): PlaceInput[] {
  const rows: PlaceInput[] = [];
  for (let d = 1; d <= 8; d++) {
    rows.push({ level: 'division', code: `V${d}`, nameEn: `Division ${d}`, nameBn: 'বিভাগ', lat: 23, lng: 90, isMetroThana: false });
  }
  for (let z = 1; z <= 64; z++) {
    rows.push({
      level: 'district',
      code: `D${z}`,
      nameEn: z === 1 ? 'Chattogram' : `District ${z}`,
      nameBn: 'জেলা',
      parentCode: `V${(z % 8) + 1}`,
      lat: 23,
      lng: 90,
      isMetroThana: false,
    });
  }
  rows.push({ level: 'upazila', code: 'U1', nameEn: 'Hathazari', nameBn: 'হাটহাজারী', parentCode: 'D1', lat: 22.5, lng: 91.8, isMetroThana: false });
  rows.push({ level: 'upazila', code: 'U2', nameEn: 'Panchlaish', nameBn: 'পাঁচলাইশ', parentCode: 'D1', lat: 22.36, lng: 91.83, isMetroThana: true });
  return rows;
}

describe('datasetErrors', () => {
  it('accepts 8 divisions, 64 districts and Chattogram with a metropolitan thana', () => {
    expect(datasetErrors(dataset())).toEqual([]);
  });

  it('reports wrong counts', () => {
    const rows = dataset().filter((p) => p.code !== 'D64');
    expect(datasetErrors(rows)).toContain('expected 64 district rows, found 63');
  });

  it('requires the pilot district and its metropolitan thanas', () => {
    const noMetro = dataset().map((p) => ({ ...p, isMetroThana: false }));
    expect(datasetErrors(noMetro)).toContain('Chattogram has no metropolitan thanas');
    const renamed = dataset().map((p) => (p.code === 'D1' ? { ...p, nameEn: 'Chittagong' } : p));
    expect(datasetErrors(renamed)).toContain('expected one district named Chattogram, found 0');
  });
});

describe('parseDataset', () => {
  it('accepts the file shape and rejects a wrong one', () => {
    const file = { sources: [{ name: 'x', url: 'https://example.org', commit: 'abc', licence: 'MIT' }], places: dataset() };
    expect(parseDataset(file).places).toHaveLength(74);
    expect(() => parseDataset({ sources: [], places: [] })).toThrow(/wrong shape/);
    expect(() => parseDataset({ ...file, places: [{ ...dataset()[0], lat: '22' }] })).toThrow(/wrong shape/);
  });
});

describe('chunkBySize and insertBatches', () => {
  it('keeps every batch under the limit and keeps order', () => {
    const items = Array.from({ length: 50 }, (_, i) => ({ i, pad: 'x'.repeat(30) }));
    const batches = chunkBySize(items, 300);
    expect(batches.flat()).toEqual(items);
    for (const b of batches) expect(JSON.stringify(b).length).toBeLessThanOrEqual(300);
    expect(batches.length).toBeGreaterThan(1);
  });

  it('refuses a single row that cannot fit', () => {
    expect(() => chunkBySize([{ pad: 'x'.repeat(100) }], 50)).toThrow(/larger than 50/);
  });

  it('sends divisions, then districts, then upazilas, never mixing levels in a batch', () => {
    const batches = insertBatches(dataset().reverse(), 2_000);
    const levels = batches.map((b) => new Set(b.map((p) => p.level)));
    for (const set of levels) expect(set.size).toBe(1);
    expect(batches.flat().map((p) => p.level)).toEqual([...Array(8).fill('division'), ...Array(64).fill('district'), 'upazila', 'upazila']);
  });
});

describe('toMin', () => {
  it('writes short keys, rounds centres to 5 decimals and marks metropolitan thanas', () => {
    const min = toMin([
      { level: 'upazila', code: 'U2', nameEn: 'Panchlaish', nameBn: 'পাঁচলাইশ', parentCode: 'D1', lat: 22.3621871, lng: 91.834272, isMetroThana: true },
      { level: 'division', code: 'V1', nameEn: 'Chattogram', nameBn: 'চট্টগ্রাম', lat: 22.3, lng: 91.8, isMetroThana: false },
    ]);
    expect(min).toEqual({
      v: 1,
      places: [
        { c: 'V1', l: 'v', en: 'Chattogram', bn: 'চট্টগ্রাম', lat: 22.3, lng: 91.8 },
        { c: 'U2', l: 'u', p: 'D1', en: 'Panchlaish', bn: 'পাঁচলাইশ', lat: 22.36219, lng: 91.83427, m: 1 },
      ],
    });
  });
});
