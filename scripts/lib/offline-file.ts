/**
 * Reads the two reference files and writes src/data/places.min.json (offline pickers, specs file tree). Used by
 * seed-places and import-hospitals so the file always holds both. Hospitals: only rows that pass the checks.
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

import type { PlaceInput } from '../../convex/rules/places';
import { parseCsv } from './csv';
import { checkHospitals, HOSPITAL_COLUMNS, type HospitalCheck } from './hospitals-csv';
import { parseDataset, toMin } from './places-file';

export const PATHS = {
  places: path.join('data', 'places.json'),
  hospitals: path.join('data', 'hospitals.csv'),
  min: path.join('src', 'data', 'places.min.json'),
};

export function readPlaces(root: string): PlaceInput[] {
  return parseDataset(JSON.parse(readFileSync(path.join(root, PATHS.places), 'utf8'))).places;
}

/** The checked hospital file, or an empty check when the team has not added it yet. */
export function readHospitals(root: string, places: readonly PlaceInput[]): HospitalCheck {
  const file = path.join(root, PATHS.hospitals);
  if (!existsSync(file)) return { rows: [], rejected: [], warnings: [] };
  const { records } = parseCsv(readFileSync(file, 'utf8'), HOSPITAL_COLUMNS);
  return checkHospitals(records, places);
}

export function writeOfflineFile(root: string, places: readonly PlaceInput[], hospitals: HospitalCheck): void {
  writeFileSync(path.join(root, PATHS.min), `${JSON.stringify(toMin(places, hospitals.rows))}\n`, 'utf8');
}
