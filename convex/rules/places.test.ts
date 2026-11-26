import { describe, expect, it } from 'vitest';

import {
  countByLevel,
  distanceKm,
  insideBangladesh,
  neighbourCodes,
  placeErrors,
  sortForInsert,
  validatePlaces,
  type PlaceInput,
} from './places';

// Test fixtures only (shape of real rows); the real dataset is loaded by scripts/seed-places.ts.
const division: PlaceInput = { level: 'division', code: 'D1', nameEn: 'Div', nameBn: 'বিভাগ', lat: 22.3, lng: 91.8, isMetroThana: false };
const district: PlaceInput = { level: 'district', code: 'Z1', nameEn: 'Dist', nameBn: 'জেলা', parentCode: 'D1', lat: 22.33, lng: 91.83, isMetroThana: false };
const upazila = (code: string, lat: number, lng: number, extra: Partial<PlaceInput> = {}): PlaceInput => ({
  level: 'upazila',
  code,
  nameEn: `U ${code}`,
  nameBn: 'উপজেলা',
  parentCode: 'Z1',
  lat,
  lng,
  isMetroThana: false,
  ...extra,
});

describe('insideBangladesh', () => {
  it.each([
    [22.3351, 91.8341, true], // Chattogram
    [23.8103, 90.4125, true], // Dhaka
    [20.6273, 92.3226, true], // St Martin's Island
    [26.3333, 88.55, true], // Panchagarh
    [91.83, 22.33, false], // lat/lng swapped
    [0, 0, false],
    [Number.NaN, 90, false],
  ])('%f, %f → %s', (lat, lng, inside) => {
    expect(insideBangladesh(lat, lng)).toBe(inside);
  });
});

describe('distanceKm', () => {
  it('is zero for the same point and symmetric', () => {
    const a = { lat: 22.3351, lng: 91.8341 };
    const b = { lat: 23.8103, lng: 90.4125 };
    expect(distanceKm(a, a)).toBe(0);
    expect(distanceKm(a, b)).toBeCloseTo(distanceKm(b, a), 9);
  });

  it('matches the known Chattogram–Dhaka straight-line distance (≈ 213 km)', () => {
    expect(distanceKm({ lat: 22.3351, lng: 91.8341 }, { lat: 23.8103, lng: 90.4125 })).toBeGreaterThan(205);
    expect(distanceKm({ lat: 22.3351, lng: 91.8341 }, { lat: 23.8103, lng: 90.4125 })).toBeLessThan(220);
  });

  it('one degree of latitude ≈ 111.2 km', () => {
    expect(distanceKm({ lat: 22, lng: 91 }, { lat: 23, lng: 91 })).toBeCloseTo(111.2, 0);
  });
});

describe('neighbourCodes', () => {
  // In a line: A–B 5.6 km, B–C 6.7 km, A–C 12.2 km, C–D 21.1 km.
  const line = [upazila('A', 22.3, 91.8), upazila('B', 22.35, 91.8), upazila('C', 22.41, 91.8), upazila('D', 22.6, 91.8)];

  it('lists places within the distance, nearest first, never itself', () => {
    const n = neighbourCodes(line, 13);
    expect(n.get('A')).toEqual(['B', 'C']);
    expect(n.get('B')).toEqual(['A', 'C']);
    expect(n.get('C')).toEqual(['B', 'A']);
    expect(n.get('D')).toEqual([]);
  });

  it('is symmetric', () => {
    const n = neighbourCodes(line, 30);
    for (const [code, list] of n) for (const other of list) expect(n.get(other)).toContain(code);
  });

  it('respects the distance from settings', () => {
    expect(neighbourCodes(line, 5).get('A')).toEqual([]);
    expect(neighbourCodes(line, 6).get('A')).toEqual(['B']);
  });
});

describe('validatePlaces', () => {
  const good = [division, district, upazila('U1', 22.35, 91.8), upazila('U2', 22.36, 91.81, { isMetroThana: true })];

  it('accepts a consistent dataset', () => {
    expect(validatePlaces(good)).toEqual([]);
  });

  it.each<[string, PlaceInput[], RegExp]>([
    ['duplicate code', [...good, upazila('U1', 22.4, 91.8, { nameEn: 'Other' })], /code used twice/],
    ['missing Bangla', [division, { ...district, nameBn: 'Dist' }], /no Bangla name/],
    ['outside Bangladesh', [division, { ...district, lat: 91.83, lng: 22.33 }], /outside Bangladesh/],
    ['unknown parent', [division, { ...district, parentCode: 'NOPE' }], /parent NOPE not found/],
    ['wrong parent level', [division, district, upazila('U9', 22.3, 91.8, { parentCode: 'D1' })], /expected a district/],
    ['division with parent', [{ ...division, parentCode: 'Z1' }, district], /division has no parent/],
    ['metro flag on a district', [division, { ...district, isMetroThana: true }], /only an upazila-level/],
    ['same name twice in a district', [division, district, upazila('U1', 22.3, 91.8), upazila('U2', 22.31, 91.8, { nameEn: 'u u1' })], /same English name/],
  ])('rejects %s', (_, places, message) => {
    expect(validatePlaces(places).join('\n')).toMatch(message);
  });
});

describe('placeErrors (one place on its own)', () => {
  it('accepts a good row and flags a district or upazila without a parent', () => {
    expect(placeErrors(district)).toEqual([]);
    expect(placeErrors({ ...district, parentCode: undefined }).join()).toMatch(/parent \(none\) not found/);
    expect(placeErrors({ ...upazila('U1', 22.3, 91.8), nameEn: ' ' }).join()).toMatch(/no English name/);
  });
});

describe('countByLevel and sortForInsert', () => {
  it('counts each level', () => {
    expect(countByLevel([division, district, upazila('U1', 22.3, 91.8)])).toEqual({ division: 1, district: 1, upazila: 1 });
  });

  it('puts parents before children', () => {
    expect(sortForInsert([upazila('U1', 22.3, 91.8), district, division]).map((p) => p.level)).toEqual(['division', 'district', 'upazila']);
  });
});
