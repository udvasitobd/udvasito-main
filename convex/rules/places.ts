/**
 * Places rules (ADR-013, roadmap §5.2) — pure TypeScript, no Convex imports (CLAUDE.md rule 10).
 * Used by the places seed (convex/admin/seed.ts, scripts/seed-places.ts) and the hospital import.
 */

export type PlaceLevel = 'division' | 'district' | 'upazila';

/** One place as loaded from the dataset. `code` is the stable key (BBS geocode when the source has one). */
export type PlaceInput = {
  level: PlaceLevel;
  code: string;
  nameEn: string;
  nameBn: string;
  /** Division for a district, district for an upazila / thana; none for a division. */
  parentCode?: string;
  lat: number;
  lng: number;
  /** A metropolitan (city) thana rather than a rural upazila. */
  isMetroThana: boolean;
};

/**
 * A generous rectangle around Bangladesh (≈ 20.5–26.7 °N, 88.0–92.7 °E). It catches swapped or mistyped
 * coordinates; it is not a border check.
 */
export const BANGLADESH_BOUNDS = { minLat: 20.5, maxLat: 26.7, minLng: 88.0, maxLng: 92.7 } as const;

export function insideBangladesh(lat: number, lng: number): boolean {
  const b = BANGLADESH_BOUNDS;
  return Number.isFinite(lat) && Number.isFinite(lng) && lat >= b.minLat && lat <= b.maxLat && lng >= b.minLng && lng <= b.maxLng;
}

const EARTH_RADIUS_KM = 6371.0088;

/** Great-circle distance in km (haversine). */
export function distanceKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const rad = Math.PI / 180;
  const dLat = (b.lat - a.lat) * rad;
  const dLng = (b.lng - a.lng) * rad;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.min(1, Math.sqrt(h)));
}

/**
 * For each upazila / thana, the others whose centres are within `km` (settings.neighbourKm, S-32), nearest first.
 * Symmetric by construction; a place is never its own neighbour.
 */
export function neighbourCodes(upazilas: readonly { code: string; lat: number; lng: number }[], km: number): Map<string, string[]> {
  const found = new Map<string, { code: string; d: number }[]>(upazilas.map((u) => [u.code, []]));
  for (let i = 0; i < upazilas.length; i++) {
    const a = upazilas[i]!;
    for (let j = i + 1; j < upazilas.length; j++) {
      const b = upazilas[j]!;
      const d = distanceKm(a, b);
      if (d <= km) {
        found.get(a.code)!.push({ code: b.code, d });
        found.get(b.code)!.push({ code: a.code, d });
      }
    }
  }
  return new Map(
    [...found].map(([code, list]) => [code, list.sort((x, y) => x.d - y.d || x.code.localeCompare(y.code)).map((n) => n.code)]),
  );
}

const BENGALI = /[ঀ-৿]/;

const PARENT_LEVEL: Record<PlaceLevel, PlaceLevel | null> = { division: null, district: 'division', upazila: 'district' };

const describe = (p: PlaceInput) => `${p.level} ${p.code} (${p.nameEn || '?'})`;

/** Problems with one place on its own (names, centre, flags, whether it should have a parent). */
export function placeErrors(p: PlaceInput): string[] {
  const where = describe(p);
  const errors: string[] = [];
  if (!p.code.trim()) errors.push(`${where}: no code`);
  if (!p.nameEn.trim()) errors.push(`${where}: no English name`);
  if (!BENGALI.test(p.nameBn)) errors.push(`${where}: no Bangla name`);
  if (!insideBangladesh(p.lat, p.lng)) errors.push(`${where}: centre ${p.lat}, ${p.lng} is outside Bangladesh`);
  if (p.isMetroThana && p.level !== 'upazila') errors.push(`${where}: only an upazila-level place can be a metropolitan thana`);
  if (PARENT_LEVEL[p.level] === null && p.parentCode !== undefined) errors.push(`${where}: a division has no parent`);
  if (PARENT_LEVEL[p.level] !== null && p.parentCode === undefined) errors.push(`${where}: parent (none) not found`);
  return errors;
}

/** Problems that make a dataset unusable. An empty list means it can be loaded. */
export function validatePlaces(places: readonly PlaceInput[]): string[] {
  const errors: string[] = [];
  const byCode = new Map<string, PlaceInput>();
  for (const p of places) {
    if (byCode.has(p.code)) errors.push(`${p.code}: code used twice`);
    byCode.set(p.code, p);
  }
  const namesInParent = new Map<string, string>();
  for (const p of places) {
    const where = describe(p);
    errors.push(...placeErrors(p));
    const parentLevel = PARENT_LEVEL[p.level];
    if (parentLevel !== null && p.parentCode !== undefined) {
      const parent = byCode.get(p.parentCode);
      if (!parent) errors.push(`${where}: parent ${p.parentCode} not found`);
      else if (parent.level !== parentLevel) errors.push(`${where}: parent ${parent.code} is a ${parent.level}, expected a ${parentLevel}`);
    }
    // Hospitals and people refer to places by English name inside their parent (roadmap §5.1), so names are unique there.
    const key = `${p.level}|${p.parentCode ?? ''}|${p.nameEn.trim().toLowerCase()}`;
    const other = namesInParent.get(key);
    if (other !== undefined) errors.push(`${where}: same English name as ${other} in the same parent`);
    namesInParent.set(key, p.code);
  }
  return errors;
}

/** Counts per level, for reports and dataset checks (8 divisions, 64 districts). */
export function countByLevel(places: readonly PlaceInput[]): Record<PlaceLevel, number> {
  const counts: Record<PlaceLevel, number> = { division: 0, district: 0, upazila: 0 };
  for (const p of places) counts[p.level]++;
  return counts;
}

/** Parents always come before their children (divisions → districts → upazilas), as the seed inserts them. */
export function sortForInsert(places: readonly PlaceInput[]): PlaceInput[] {
  const rank: Record<PlaceLevel, number> = { division: 0, district: 1, upazila: 2 };
  return [...places].sort((a, b) => rank[a.level] - rank[b.level] || a.code.localeCompare(b.code));
}
