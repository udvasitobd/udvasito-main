/**
 * npx tsx scripts/serve-dist.ts [--port 8081]
 *
 * Serves the web export `dist/` the way Cloudflare does with wrangler.jsonc (ADR-024): real files first, with the
 * same `_headers` (CSP included); every other request is answered by the Worker's own rule (`routeFor` in
 * worker/index.ts): an app address gets index.html, a missing file or `/api/*` gets a 404 (no Convex locally), each
 * with the Worker's security headers — so the Playwright smoke test sees what production browsers and crawlers see.
 * Local testing only; no dependencies.
 */
import { existsSync, readFileSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import path from 'node:path';

import { routeFor } from '../worker/index';
import { SECURITY_HEADERS } from '../worker/security-headers';
import { argValue } from './lib/convex-cli';
import { headersFor, parseHeadersFile } from './lib/headers-file';

const root = process.cwd();
const dist = path.join(root, 'dist');
const port = Number(argValue(process.argv.slice(2), '--port') ?? 8081);

const TYPES: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.svg': 'image/svg+xml',
  '.ttf': 'font/ttf',
  '.woff2': 'font/woff2',
  '.webmanifest': 'application/manifest+json',
};

function fileFor(urlPath: string): string | null {
  let decoded: string;
  try {
    decoded = decodeURIComponent(urlPath);
  } catch {
    return null; // a broken escape such as /%E0%A4 is no file — never a crash
  }
  const resolved = path.normalize(path.join(dist, decoded));
  // `dist + sep`, so a sibling folder such as dist-old/ can never match.
  if (!resolved.startsWith(dist + path.sep)) return null;
  return existsSync(resolved) && statSync(resolved).isFile() ? resolved : null;
}

if (!existsSync(path.join(dist, 'index.html'))) {
  console.error('dist/ is missing — run `npm run build:web` first.');
  process.exit(1);
}
const headersFile = path.join(dist, '_headers');
if (!existsSync(headersFile)) {
  console.error('dist/_headers is missing — public/_headers must be copied by `npm run build:web`.');
  process.exit(1);
}
const rules = parseHeadersFile(readFileSync(headersFile, 'utf8'));

createServer((req, res) => {
  const url = new URL(req.url ?? '/', 'http://localhost');
  // Static files first — except `/api/*` (run_worker_first) and `_headers` (configuration Cloudflare never serves).
  const asset =
    url.pathname.startsWith('/api/') || url.pathname === '/_headers'
      ? null
      : fileFor(url.pathname === '/' ? '/index.html' : url.pathname);
  // No file: the Worker's rule, with the Worker's headers (Cloudflare does not apply `_headers` to Worker responses).
  const file = asset ?? (routeFor(req.method ?? 'GET', url.href, undefined).kind === 'app' ? fileFor('/index.html') : null);
  const headers = asset ? headersFor(rules, url.pathname) : new Map(Object.entries(SECURITY_HEADERS));
  for (const [name, value] of headers) {
    // Plain-http localhost: browsers would upgrade every request to https and fail; production is https anyway.
    res.setHeader(name, name === 'content-security-policy' ? value.replace(/;\s*upgrade-insecure-requests/, '') : value);
  }
  if (!file) {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' }).end('Not found');
    return;
  }
  res.writeHead(200, { 'Content-Type': TYPES[path.extname(file)] ?? 'application/octet-stream' });
  res.end(readFileSync(file));
}).listen(port, () => console.log(`serving dist/ on http://localhost:${port}`));
