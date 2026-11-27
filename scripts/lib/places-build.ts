/**
 * Builds the normalised places dataset (data/places.json) from the licensed sources in data/sources/places/
 * (docs/data-licences.md):
 * - divisions, districts, upazilas — nuhil/bangladesh-geocode (MIT; BBS / UN OCHA COD-AB data, CC BY-IGO);
 * - Chattogram metropolitan thanas — the team-reviewed chattogram-metro-thanas.csv, whose empty centres are filled
 *   from the BBS admin-3 points (same repository) or, failing that, mdtanjilhasan/bd-geocode-with-lat-long (MIT).
 * Pure: takes the parsed files, returns places plus a report. Never invents a value — a row without a centre is
 * left out and reported.
 */
import { PILOT_DISTRICT_EN } from './places-file';
import type { PlaceInput } from '../../convex/rules/places';
import type { CsvRecord } from './csv';

/** phpMyAdmin JSON export: `[header, database, {type: 'table', name, data}]`. */
export function exportTable(json: unknown, name: string): Record<string, string | null>[] {
  if (!Array.isArray(json)) throw new Error('not a phpMyAdmin JSON export');
  const table = json.find((x) => x && typeof x === 'object' && x.type === 'table' && x.name === name) as
    | { data?: unknown }
    | undefined;
  if (!table || !Array.isArray(table.data)) throw new Error(`table ${name} not found`);
  return table.data as Record<string, string | null>[];
}

const clean = (s: string | null | undefined) => (s ?? '').trim().replace(/\s+/g, ' ');

function coord(value: string | null | undefined): number | undefined {
  const s = clean(value);
  if (s === '' || s.toLowerCase() === 'null') return undefined;
  const n = Number(s);
  return Number.isFinite(n) ? n : undefined;
}

/** Bangla thana names in bd-geocode end in " থানা" (thana); our upazila names carry no suffix. */
export function stripThana(nameBn: string): string {
  return clean(nameBn).replace(/\s*থানা$/u, '');
}

export type PlaceSources = {
  divisions: Record<string, string | null>[];
  districts: Record<string, string | null>[];
  upazilas: Record<string, string | null>[];
  /** BBS admin-3 points: pcode, v03_pcode, name, adm2_pcode, lat, lon, pip_adm3_pcode. */
  bbsPoints: CsvRecord[];
  /** bd-geocode-with-lat-long `upazilas` table (id, district_id, name, bn_name, lat, lng). */
  bdGeocodeUpazilas: Record<string, string | null>[];
  metroThanas: CsvRecord[];
};

export type BuildReport = { notes: string[]; skipped: string[] };

export function buildPlaces(src: PlaceSources): { places: PlaceInput[]; report: BuildReport } {
  const notes: string[] = [];
  const skipped: string[] = [];
  const places: PlaceInput[] = [];

  const divisionCode = new Map<string, string>();
  for (const d of src.divisions) {
    const code = clean(d.bbs_code);
    divisionCode.set(clean(d.id), code);
    places.push({ level: 'division', code, nameEn: clean(d.name), nameBn: clean(d.bn_name), lat: coord(d.lat) ?? NaN, lng: coord(d.lon) ?? NaN, isMetroThana: false });
  }
  const districtCode = new Map<string, string>();
  for (const d of src.districts) {
    const code = clean(d.bbs_code);
    districtCode.set(clean(d.id), code);
    places.push({
      level: 'district',
      code,
      nameEn: clean(d.name),
      nameBn: clean(d.bn_name),
      parentCode: divisionCode.get(clean(d.division_id)) ?? `unknown division ${clean(d.division_id)}`,
      lat: coord(d.lat) ?? NaN,
      lng: coord(d.lon) ?? NaN,
      isMetroThana: false,
    });
  }
  for (const u of src.upazilas) {
    places.push({
      level: 'upazila',
      code: clean(u.bbs_code),
      nameEn: clean(u.name),
      nameBn: clean(u.bn_name),
      parentCode: districtCode.get(clean(u.district_id)) ?? `unknown district ${clean(u.district_id)}`,
      lat: coord(u.lat) ?? NaN,
      lng: coord(u.lon) ?? NaN,
      isMetroThana: false,
    });
  }

  const pilot = places.find((p) => p.level === 'district' && p.nameEn === PILOT_DISTRICT_EN);
  if (!pilot) throw new Error(`district ${PILOT_DISTRICT_EN} not found in the districts source`);

  const bbs = new Map(src.bbsPoints.map((r) => [clean(r.values.v03_pcode), r.values]));
  const bdGeo = new Map(src.bdGeocodeUpazilas.map((r) => [clean(r.id), r]));
  let metro = 0;
  for (const { line, values: t } of src.metroThanas) {
    const where = `chattogram-metro-thanas.csv line ${line} (${clean(t.nameEn)})`;
    const b = clean(t.bbsV03) ? bbs.get(clean(t.bbsV03)) : undefined;
    if (clean(t.bbsV03) && !b) throw new Error(`${where}: BBS code ${clean(t.bbsV03)} not in the BBS points`);
    if (b && clean(b.adm2_pcode) !== pilot.code) throw new Error(`${where}: BBS row is not in ${PILOT_DISTRICT_EN}`);
    const g = clean(t.bdGeocodeId) ? bdGeo.get(clean(t.bdGeocodeId)) : undefined;
    if (clean(t.bdGeocodeId) && !g) throw new Error(`${where}: bd-geocode id ${clean(t.bdGeocodeId)} not found`);

    let lat = coord(t.lat);
    let lng = coord(t.lng);
    let centre = 'team (csv)';
    if (lat === undefined || lng === undefined) {
      if (b && coord(b.lat) !== undefined && coord(b.lon) !== undefined) {
        [lat, lng, centre] = [coord(b.lat), coord(b.lon), 'BBS'];
      } else if (g && coord(g.lat) !== undefined && coord(g.lng) !== undefined) {
        [lat, lng, centre] = [coord(g.lat), coord(g.lng), 'bd-geocode'];
      }
    }
    if (lat === undefined || lng === undefined) {
      skipped.push(`${where}: no centre in any source — add lat,lng to the csv`);
      continue;
    }
    const nameBn = clean(t.nameBn);
    if (g && stripThana(clean(g.bn_name)) !== nameBn) notes.push(`${where}: Bangla "${nameBn}" differs from the source "${clean(g.bn_name)}"`);
    if (b && clean(b.name) !== clean(t.nameEn)) notes.push(`${where}: English differs from BBS "${clean(b.name)}"`);
    places.push({ level: 'upazila', code: clean(t.code), nameEn: clean(t.nameEn), nameBn, parentCode: pilot.code, lat: lat!, lng: lng!, isMetroThana: true });
    metro++;
    if (centre !== 'BBS') notes.push(`${where}: centre from ${centre}`);
  }
  notes.unshift(`${metro} Chattogram metropolitan thanas`);
  return { places, report: { notes, skipped } };
}
