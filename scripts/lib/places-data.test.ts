/**
 * Checks the committed dataset data/places.json itself (P0 Definition of Done: "a unit test checks the counts").
 */
import { readFileSync } from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

import { countByLevel, neighbourCodes } from '../../convex/rules/places';
import { SETTING_DEFS } from '../../convex/rules/settings';
import { datasetErrors, parseDataset } from './places-file';

const dataset = parseDataset(JSON.parse(readFileSync(path.join(process.cwd(), 'data', 'places.json'), 'utf8')));
const places = dataset.places;
const ctg = places.find((p) => p.level === 'district' && p.nameEn === 'Chattogram')!;

describe('data/places.json', () => {
  it('passes every load check', () => {
    expect(datasetErrors(places)).toEqual([]);
  });

  it('has 8 divisions, 64 districts and 495 upazilas plus the Chattogram metropolitan thanas', () => {
    const counts = countByLevel(places);
    expect(counts.division).toBe(8);
    expect(counts.district).toBe(64);
    expect(places.filter((p) => p.level === 'upazila' && !p.isMetroThana)).toHaveLength(495);
  });

  it('gives every district at least one upazila, each with English and Bangla names', () => {
    for (const d of places.filter((p) => p.level === 'district')) {
      expect(places.some((p) => p.parentCode === d.code), d.nameEn).toBe(true);
    }
    expect(places.every((p) => p.nameEn.trim() && /[ঀ-৿]/.test(p.nameBn))).toBe(true);
  });

  it('has Chattogram with its 15 upazilas and the metropolitan thanas (Akbar Shah waits for a centre)', () => {
    const children = places.filter((p) => p.parentCode === ctg.code);
    expect(children.filter((p) => !p.isMetroThana)).toHaveLength(15);
    const metro = children.filter((p) => p.isMetroThana).map((p) => p.nameEn);
    expect(metro).toHaveLength(14);
    for (const name of ['Kotwali', 'Panchlaish', 'Chandgaon', 'Khulshi', 'Pahartali', 'Halishahar', 'Patenga', 'Double Mooring']) {
      expect(metro).toContain(name);
    }
  });

  it('gives every Chattogram metropolitan thana a neighbour at the default neighbourKm (S-32)', () => {
    const km = SETTING_DEFS.neighbourKm.default as number;
    const n = neighbourCodes(places.filter((p) => p.level === 'upazila'), km);
    for (const t of places.filter((p) => p.isMetroThana)) expect(n.get(t.code)?.length, t.nameEn).toBeGreaterThan(0);
  });

  it('names its sources with pinned commits and licences', () => {
    expect(dataset.sources.map((s) => s.licence).join(' ')).toMatch(/MIT.*CC BY-IGO/s);
    expect(dataset.sources.filter((s) => /^[0-9a-f]{40}$/.test(s.commit))).toHaveLength(2);
  });
});
