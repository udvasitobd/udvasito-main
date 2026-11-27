/**
 * npm run seed:places [-- --prod] [-- --file-only]
 *
 * Loads data/places.json (divisions → districts → upazilas + Chattogram metropolitan thanas, roadmap §5.2) into the
 * `places` table, re-computes neighbours (centres within settings.neighbourKm) and writes the compact offline copy
 * src/data/places.min.json. Idempotent: matched by code, never deletes a place. One of the three loaders allowed
 * against production (CLAUDE.md rule 17).
 *
 * --file-only  only checks the dataset and writes src/data/places.min.json (no Convex deployment needed).
 */
import { readFileSync } from 'node:fs';
import path from 'node:path';

import { countByLevel } from '../convex/rules/places';
import { parseTarget, runFunction } from './lib/convex-cli';
import { readHospitals, writeOfflineFile } from './lib/offline-file';
import { datasetErrors, insertBatches, parseDataset } from './lib/places-file';

const argv = process.argv.slice(2);
const target = parseTarget(argv);
const fileOnly = argv.includes('--file-only');

const root = process.cwd();
const datasetPath = path.join(root, 'data', 'places.json');

const dataset = parseDataset(JSON.parse(readFileSync(datasetPath, 'utf8')));
const errors = datasetErrors(dataset.places);
if (errors.length > 0) {
  console.error(`data/places.json has ${errors.length} problem(s) — nothing was loaded:`);
  for (const e of errors.slice(0, 50)) console.error(`  - ${e}`);
  if (errors.length > 50) console.error(`  … and ${errors.length - 50} more`);
  process.exit(1);
}

const counts = countByLevel(dataset.places);
const metro = dataset.places.filter((p) => p.isMetroThana).length;
console.log(`dataset: ${counts.division} divisions, ${counts.district} districts, ${counts.upazila} upazilas/thanas (${metro} metropolitan)`);

const hospitals = readHospitals(root, dataset.places);
writeOfflineFile(root, dataset.places, hospitals);
console.log(`wrote src/data/places.min.json (with ${hospitals.rows.length} checked hospital rows; npm run import:hospitals prints their report)`);

if (!fileOnly) {
  const totals = { inserted: 0, updated: 0, unchanged: 0 };
  for (const batch of insertBatches(dataset.places)) {
    const r = runFunction<typeof totals>('admin/seed:upsertPlaces', { places: batch }, target);
    totals.inserted += r.inserted;
    totals.updated += r.updated;
    totals.unchanged += r.unchanged;
  }
  console.log(`places (${target.prod ? 'production' : 'dev/staging'}): ${totals.inserted} added, ${totals.updated} updated, ${totals.unchanged} unchanged`);

  const n = runFunction<{ km: number; changed: number; metroThanas: number }>('admin/seed:computeNeighbours', {}, target);
  console.log(`neighbours: within ${n.km} km, ${n.changed} upazilas/thanas changed`);
  console.log('next: run `npm run seed:settings` (fills pilotDistrictIds once Chattogram exists).');
}
