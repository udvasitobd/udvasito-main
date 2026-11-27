/**
 * npx tsx scripts/build-places.ts
 *
 * data/sources/places/* (licensed source files, docs/data-licences.md) → data/places.json, the dataset that
 * `npm run seed:places` loads. Run it again after the team edits chattogram-metro-thanas.csv or a source is
 * refreshed (update SOURCES below with the new commit). Fails when the dataset would not pass the seed's checks.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

import { countByLevel } from '../convex/rules/places';
import { parseCsv } from './lib/csv';
import { buildPlaces, exportTable } from './lib/places-build';
import { datasetErrors, type PlacesDataset } from './lib/places-file';

const SOURCES: PlacesDataset['sources'] = [
  {
    name: 'nuhil/bangladesh-geocode — divisions, districts, upazilas, BBS admin-3 points',
    url: 'https://github.com/nuhil/bangladesh-geocode',
    commit: 'c4b950b5cd2a65d42d75b12f7fad459e12777df6',
    licence: 'MIT (code and compilation); data from Bangladesh Bureau of Statistics via UN OCHA COD-AB, CC BY-IGO',
  },
  {
    name: 'mdtanjilhasan/bd-geocode-with-lat-long — Chattogram thana Bangla names and some centres',
    url: 'https://github.com/mdtanjilhasan/bd-geocode-with-lat-long',
    commit: 'aaa3a6a9c70f958154b34f25212fc65b27014369',
    licence: 'MIT',
  },
  {
    name: 'UDVASITO team — chattogram-metro-thanas.csv (list, spellings, corrections)',
    url: 'https://github.com/udvasitobd/udvasito-main/blob/main/data/sources/places/chattogram-metro-thanas.csv',
    commit: 'this repository',
    licence: 'same as this repository',
  },
];

const dir = path.join(process.cwd(), 'data', 'sources', 'places');
const json = (file: string): unknown => JSON.parse(readFileSync(path.join(dir, file), 'utf8'));
const csv = (file: string, columns: string[]) => parseCsv(readFileSync(path.join(dir, file), 'utf8'), columns).records;

const { places, report } = buildPlaces({
  divisions: exportTable(json('nuhil-bangladesh-geocode/divisions.json'), 'divisions'),
  districts: exportTable(json('nuhil-bangladesh-geocode/districts.json'), 'districts'),
  upazilas: exportTable(json('nuhil-bangladesh-geocode/upazilas.json'), 'upazilas'),
  bbsPoints: csv('nuhil-bangladesh-geocode/bbs_admin3_points.csv', ['v03_pcode', 'name', 'adm2_pcode', 'lat', 'lon']),
  bdGeocodeUpazilas: exportTable(json('bd-geocode-with-lat-long/db_geocode.json'), 'upazilas'),
  metroThanas: csv('chattogram-metro-thanas.csv', ['code', 'nameEn', 'nameBn', 'bbsV03', 'bdGeocodeId', 'lat', 'lng', 'note']),
});

for (const n of report.notes) console.log(`note: ${n}`);
for (const s of report.skipped) console.log(`LEFT OUT: ${s}`);

const errors = datasetErrors(places);
if (errors.length > 0) {
  console.error(`the built dataset has ${errors.length} problem(s); data/places.json was not written:`);
  for (const e of errors.slice(0, 50)) console.error(`  - ${e}`);
  process.exit(1);
}

const dataset: PlacesDataset = { sources: SOURCES, places };
writeFileSync(path.join(process.cwd(), 'data', 'places.json'), `${JSON.stringify(dataset, null, 1)}\n`, 'utf8');
const c = countByLevel(places);
console.log(`wrote data/places.json: ${c.division} divisions, ${c.district} districts, ${c.upazila} upazilas/thanas`);
