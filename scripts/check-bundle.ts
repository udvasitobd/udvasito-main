/**
 * `npm run bundle:check` — run after `npm run build:web` (CI does both). Fails when the initial web shell is over
 * the specs §7.1 budget, or when any phone number other than the VAL-03 format example is in the build output.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { gzipSync } from 'node:zlib';

import { checkBundle, initialScripts, SHELL_BUDGET_BYTES, type BundleFile } from './lib/bundle';

const dist = join(process.cwd(), 'dist');

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const full = join(dir, name);
    return statSync(full).isDirectory() ? walk(full) : [full];
  });
}

let html: string;
try {
  html = readFileSync(join(dist, 'index.html'), 'utf8');
} catch {
  console.error('dist/index.html not found — run `npm run build:web` first.');
  process.exit(1);
}

const initial = new Set(initialScripts(html));
const files: BundleFile[] = walk(dist)
  .filter((f) => /\.(html|js|json|css)$/.test(f))
  .map((full) => {
    const path = relative(dist, full).split('\\').join('/');
    const buf = readFileSync(full);
    return { path, text: buf.toString('utf8'), gzipBytes: gzipSync(buf).length, initial: initial.has(path) || path === 'index.html' };
  });

const report = checkBundle(files);
const kb = (n: number) => `${(n / 1024).toFixed(0)} KB`;

console.log(`Initial web shell: ${kb(report.initialGzipBytes)} gzip (budget ${kb(SHELL_BUDGET_BYTES)}).`);
for (const f of files.filter((x) => x.path.endsWith('.js'))) {
  console.log(`  ${f.initial ? 'initial' : 'lazy   '}  ${kb(f.gzipBytes).padStart(7)}  ${f.path}`);
}

let failed = false;
if (report.overBudget) {
  console.error('✖ The initial web shell is over budget (specs §7.1). Lazy-load the new code or remove a dependency.');
  failed = true;
}
if (report.phoneHits.length > 0) {
  // Print where, never the number itself (it may be the helpline).
  for (const hit of report.phoneHits) console.error(`✖ A phone number is in ${hit.path} (${hit.number.length} characters). Phone numbers must never ship in the app.`);
  failed = true;
}
if (failed) process.exit(1);
console.log('✓ Bundle check passed.');
