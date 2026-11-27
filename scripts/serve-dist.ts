/**
 * npx tsx scripts/serve-dist.ts [--port 8081]
 *
 * Serves the web export `dist/` the way Cloudflare does with wrangler.jsonc (ADR-024): real files first, then the
 * single-page-application fallback to index.html, the same `_headers` (CSP included), and 404 for `/api/*` (handled
 * by worker/index.ts in production) — so the Playwright smoke test sees what production browsers see.
 * Local testing only; no dependencies.
 */
import { existsSync, readFileSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import path from 'node:path';

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
  const resolved = path.normalize(path.join(dist, decodeURIComponent(urlPath)));
  if (!resolved.startsWith(dist)) return null;
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
  const urlPath = new URL(req.url ?? '/', 'http://localhost').pathname;
  if (urlPath.startsWith('/api/')) {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' }).end('Not found');
    return;
  }
  // `_headers` itself is configuration: Cloudflare never serves it.
  const file = (urlPath === '/_headers' ? null : fileFor(urlPath === '/' ? '/index.html' : urlPath)) ?? fileFor('/index.html');
  for (const [name, value] of headersFor(rules, urlPath)) {
    // Plain-http localhost: browsers would upgrade every request to https and fail; production is https anyway.
    res.setHeader(name, name === 'content-security-policy' ? value.replace(/;\s*upgrade-insecure-requests/, '') : value);
  }
  if (!file) {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' }).end('Not Found');
    return;
  }
  res.writeHead(200, { 'Content-Type': TYPES[path.extname(file)] ?? 'application/octet-stream' });
  res.end(readFileSync(file));
}).listen(port, () => console.log(`serving dist/ on http://localhost:${port}`));
