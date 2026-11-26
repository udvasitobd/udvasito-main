/**
 * npm run copy:extract — regenerates src/i18n/en.json and bn.json from docs/specs.md (CLAUDE.md §4).
 *
 * - Every key gets English and Bangla; keys missing one language, conflicting duplicates and copy without a key are
 *   reported, and the script exits with code 1 if there are conflicts or missing languages.
 * - Never overwrites reviewed Bangla: keys listed in src/i18n/reviewed.json keep the value already in bn.json.
 * - `--check` only compares: exits 1 if en.json/bn.json are out of date (used by `npm run check` and CI).
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

import { buildDictionaries, parseSpecs } from './lib/copy';

const root = process.cwd();
const specsPath = join(root, 'docs', 'specs.md');
const enPath = join(root, 'src', 'i18n', 'en.json');
const bnPath = join(root, 'src', 'i18n', 'bn.json');
const reviewedPath = join(root, 'src', 'i18n', 'reviewed.json');
const checkOnly = process.argv.includes('--check');

const readJson = <T>(path: string, fallback: T): T => (existsSync(path) ? (JSON.parse(readFileSync(path, 'utf8')) as T) : fallback);

const { entries, issues, unkeyed } = parseSpecs(readFileSync(specsPath, 'utf8'));
const existingBn = readJson<Record<string, string>>(bnPath, {});
const reviewed = readJson<string[]>(reviewedPath, []);
const result = buildDictionaries(entries, existingBn, reviewed);

const print = (title: string, list: { line: number; message: string }[]) => {
  if (list.length === 0) return;
  console.log(`\n${title} (${list.length}):`);
  for (const item of list) console.log(`  specs.md:${item.line}  ${item.message}`);
};

const enText = `${JSON.stringify(result.en, null, 2)}\n`;
const bnText = `${JSON.stringify(result.bn, null, 2)}\n`;

if (checkOnly) {
  const current = (p: string) => (existsSync(p) ? readFileSync(p, 'utf8').replace(/\r\n/g, '\n') : '');
  if (current(enPath) !== enText || current(bnPath) !== bnText) {
    console.error('src/i18n/en.json or bn.json is out of date with docs/specs.md. Run: npm run copy:extract');
    process.exit(1);
  }
  console.log(`i18n up to date: ${Object.keys(result.en).length} keys.`);
  process.exit(0);
}

writeFileSync(enPath, enText);
writeFileSync(bnPath, bnText);

console.log(`Wrote ${Object.keys(result.en).length} keys to src/i18n/en.json and bn.json.`);
print('Parse problems', issues);
print('Keys missing a language', result.missing);
print('Conflicting duplicate keys', result.conflicts);
print('Copy without a key (add it to UNKEYED_COPY in scripts/lib/copy.ts when a screen needs it)', unkeyed);
if (result.duplicates.length > 0) console.log(`\n${result.duplicates.length} keys appear twice with the same text (fine).`);
if (result.reviewedDiffers.length > 0) {
  console.log('\nReviewed Bangla kept, but specs.md now differs (ask member 3):');
  for (const key of result.reviewedDiffers) console.log(`  ${key}`);
}
if (result.missing.length > 0 || result.conflicts.length > 0 || issues.length > 0) process.exit(1);
