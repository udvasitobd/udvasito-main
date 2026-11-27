/**
 * The normalised places dataset `data/places.json` (built by scripts/build-places.ts from the licensed sources in
 * data/sources/places/, docs/data-licences.md) and the compact copy `src/data/places.min.json` for offline pickers.
 *
 * The compact copy is keyed by `code`, not by Convex `_id`: ids differ between staging and production, while the
 * same app bundle talks to both. The app maps a code to its id with the places it has fetched (docs/questions.md Q-007).
 */
import { z } from 'zod';

import { countByLevel, sortForInsert, validatePlaces, type PlaceInput, type PlaceLevel } from '../../convex/rules/places';
import type { HospitalRow } from './hospitals-csv';

/** The pilot district (OQ-12). The dataset must contain it and its metropolitan thanas (roadmap §5.2). */
export const PILOT_DISTRICT_EN = 'Chattogram';

export const EXPECTED_COUNTS: Partial<Record<PlaceLevel, number>> = { division: 8, district: 64 };

const placeSchema = z.object({
  level: z.enum(['division', 'district', 'upazila']),
  code: z.string().min(1),
  nameEn: z.string().min(1),
  nameBn: z.string().min(1),
  parentCode: z.string().min(1).optional(),
  lat: z.number(),
  lng: z.number(),
  isMetroThana: z.boolean(),
});

export const datasetSchema = z.object({
  /** Where every row came from, with licences (copied from docs/data-licences.md). */
  sources: z.array(z.object({ name: z.string(), url: z.string(), commit: z.string(), licence: z.string() })).min(1),
  places: z.array(placeSchema),
});

export type PlacesDataset = z.infer<typeof datasetSchema>;

export function parseDataset(json: unknown): PlacesDataset {
  const parsed = datasetSchema.safeParse(json);
  if (!parsed.success) throw new Error(`data/places.json has the wrong shape: ${z.prettifyError(parsed.error)}`);
  // zod's optional() leaves `parentCode` absent rather than undefined, which matches PlaceInput.
  return parsed.data as PlacesDataset;
}

/** Everything that stops the dataset from being loaded: row problems, wrong counts, a missing pilot district. */
export function datasetErrors(places: readonly PlaceInput[]): string[] {
  const errors = validatePlaces(places);
  const counts = countByLevel(places);
  for (const [level, expected] of Object.entries(EXPECTED_COUNTS) as [PlaceLevel, number][]) {
    if (counts[level] !== expected) errors.push(`expected ${expected} ${level} rows, found ${counts[level]}`);
  }
  const pilot = places.filter((p) => p.level === 'district' && p.nameEn === PILOT_DISTRICT_EN);
  if (pilot.length !== 1) errors.push(`expected one district named ${PILOT_DISTRICT_EN}, found ${pilot.length}`);
  else if (!places.some((p) => p.isMetroThana && p.parentCode === pilot[0]!.code)) {
    errors.push(`${PILOT_DISTRICT_EN} has no metropolitan thanas`);
  }
  return errors;
}

/**
 * Splits rows into batches whose JSON stays under `maxChars` (one `convex run` argument; Windows limits a command
 * line to ≈ 32 K characters). Order is kept, so parents still come before children.
 */
export function chunkBySize<T>(items: readonly T[], maxChars: number): T[][] {
  const batches: T[][] = [];
  let current: T[] = [];
  let size = 2;
  for (const item of items) {
    const itemSize = JSON.stringify(item).length + 1;
    if (itemSize + 2 > maxChars) throw new Error(`one row is larger than ${maxChars} characters`);
    if (current.length > 0 && size + itemSize > maxChars) {
      batches.push(current);
      current = [];
      size = 2;
    }
    current.push(item);
    size += itemSize;
  }
  if (current.length > 0) batches.push(current);
  return batches;
}

/** Batches for `admin/seed:upsertPlaces`: parents first, and never mixing levels in one batch. */
export function insertBatches(places: readonly PlaceInput[], maxChars = 20_000): PlaceInput[][] {
  const sorted = sortForInsert(places);
  const levels: PlaceLevel[] = ['division', 'district', 'upazila'];
  return levels.flatMap((level) => chunkBySize(sorted.filter((p) => p.level === level), maxChars));
}

/** One compact place: code, level, parent code, names, centre (5 decimals ≈ 1 m), metro-thana flag. */
export type MinPlace = { c: string; l: 'v' | 'd' | 'u'; p?: string; en: string; bn: string; lat: number; lng: number; m?: 1 };

/**
 * One compact active hospital for the offline picker and search: names, aliases, type, district + upazila codes,
 * point. Never the phone number or address (`hospitals.bloodBanksNear` is member-only, specs §6).
 */
export type MinHospital = { en: string; bn: string; a?: string[]; t: 'h' | 'b' | 'c'; d: string; u: string; lat: number; lng: number };

export type PlacesMin = { v: 1; places: MinPlace[]; hospitals: MinHospital[] };

const TYPE_CODE = { hospital: 'h', blood_bank: 'b', clinic: 'c' } as const;

const LEVEL_CODE = { division: 'v', district: 'd', upazila: 'u' } as const;

const round5 = (n: number) => Math.round(n * 1e5) / 1e5;

export function toMin(places: readonly PlaceInput[], hospitals: readonly HospitalRow[] = []): PlacesMin {
  return {
    v: 1,
    places: sortForInsert(places).map((p) => ({
      c: p.code,
      l: LEVEL_CODE[p.level],
      ...(p.parentCode !== undefined ? { p: p.parentCode } : {}),
      en: p.nameEn,
      bn: p.nameBn,
      lat: round5(p.lat),
      lng: round5(p.lng),
      ...(p.isMetroThana ? { m: 1 as const } : {}),
    })),
    hospitals: hospitals
      .filter((h) => h.active)
      .map((h) => ({
        en: h.nameEn,
        bn: h.nameBn,
        ...(h.aliases.length > 0 ? { a: h.aliases } : {}),
        t: TYPE_CODE[h.type],
        d: h.districtCode,
        u: h.upazilaCode,
        lat: round5(h.lat),
        lng: round5(h.lng),
      }))
      .sort((x, y) => x.d.localeCompare(y.d) || x.en.localeCompare(y.en)),
  };
}
