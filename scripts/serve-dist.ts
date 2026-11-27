/**
 * npx tsx scripts/serve-dist.ts [--port 8081]
 *
 * Serves the web export `dist/` the way Vercel does with vercel.json: real files first, then the SPA rewrite to
 * index.html, and the same response headers (CSP included) — so the Playwright smoke test sees what production
 * browsers see. Local testing only; no dependencies.
 */
import { existsSync, readFileSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import path from 'node:path';

import { argValue } from './lib/convex-cli';

type VercelConfig = {
  rewrites: { source: string; destination: string }[];
  headers: { source: string; headers: { key: string; value: string }[] }[];
};

const root = process.cwd();
const dist = path.join(root, 'dist');
const port = Number(argValue(process.argv.slice(2), '--port') ?? 8081);
const vercel = JSON.parse(readFileSync(path.join(root, 'vercel.json'), 'utf8')) as VercelConfig;

/** vercel.json sources here are plain regex paths such as `/(.*)`. */
const matcher = (source: string) => new RegExp(`^${source}$`);
const rewrites = vercel.rewrites.map((r) => ({ test: matcher(r.source), destination: r.destination }));
const headerRules = vercel.headers.map((h) => ({ test: matcher(h.source), headers: h.headers }));

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

createServer((req, res) => {
  const urlPath = new URL(req.url ?? '/', 'http://localhost').pathname;
  let servedPath = urlPath === '/' ? '/index.html' : urlPath;
  let file = fileFor(servedPath);
  if (!file) {
    const rewrite = rewrites.find((r) => r.test.test(urlPath));
    if (rewrite) {
      servedPath = rewrite.destination;
      file = fileFor(servedPath);
    }
  }
  for (const rule of headerRules) {
    if (rule.test.test(urlPath) || rule.test.test(servedPath)) {
      for (const h of rule.headers) {
        // Plain-http localhost: browsers would upgrade every request to https and fail; production is https anyway.
        const value = h.key === 'Content-Security-Policy' ? h.value.replace(/;\s*upgrade-insecure-requests/, '') : h.value;
        res.setHeader(h.key, value);
      }
    }
  }
  if (!file) {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' }).end('Not Found');
    return;
  }
  res.writeHead(200, { 'Content-Type': TYPES[path.extname(file)] ?? 'application/octet-stream' });
  res.end(readFileSync(file));
}).listen(port, () => console.log(`serving dist/ on http://localhost:${port}`));
