/**
 * npm run import:hospitals [-- --prod] [-- --check-only]
 *
 * Reads data/hospitals.csv (roadmap §5.1, DEP-01), checks every row against data/places.json, prints a report of
 * bad rows (line numbers and reasons — never a phone number), imports the good rows (idempotent: matched by English
 * name inside the district) and rewrites src/data/places.min.json. Exits with 1 when any row was rejected, so the
 * file gets fixed. One of the three loaders allowed against production (CLAUDE.md rule 17).
 *
 * --check-only  only checks the file and writes the offline copy (no Convex deployment needed).
 */
import { parseTarget, runFunction } from './lib/convex-cli';
import { readHospitals, readPlaces, writeOfflineFile } from './lib/offline-file';
import { chunkBySize } from './lib/places-file';

const argv = process.argv.slice(2);
const target = parseTarget(argv);
const checkOnly = argv.includes('--check-only');
const root = process.cwd();

const places = readPlaces(root);
const check = readHospitals(root, places);
const total = check.rows.length + check.rejected.length;

console.log(`data/hospitals.csv: ${total} row(s) — ${check.rows.length} good, ${check.rejected.length} rejected`);
for (const r of check.rejected) console.log(`  REJECTED line ${r.line}: ${r.reasons.join('; ')}`);
for (const w of check.warnings) console.log(`  check line ${w.line}: ${w.message}`);

writeOfflineFile(root, places, check);
console.log(`wrote src/data/places.min.json (${check.rows.filter((r) => r.active).length} active hospitals)`);

if (!checkOnly && check.rows.length > 0) {
  const totals = { inserted: 0, updated: 0, unchanged: 0 };
  for (const rows of chunkBySize(check.rows, 20_000)) {
    const r = runFunction<typeof totals>('admin/seed:upsertHospitals', { rows }, target);
    totals.inserted += r.inserted;
    totals.updated += r.updated;
    totals.unchanged += r.unchanged;
  }
  console.log(`hospitals (${target.prod ? 'production' : 'dev/staging'}): ${totals.inserted} added, ${totals.updated} updated, ${totals.unchanged} unchanged`);
}

if (check.rejected.length > 0) process.exit(1);
