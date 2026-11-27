/**
 * Edge Worker for udvasito.com and staging.udvasito.com (ADR-024).
 *
 * Cloudflare serves the web export (`dist/`) as static assets with `public/_headers` without running this code. The
 * Worker runs for `/api/*` (wrangler.jsonc `run_worker_first`) and for any request that matches no file and is not a
 * browser navigation — crawlers, link-preview bots and older browsers send no `Sec-Fetch-Mode: navigate`, so
 * Cloudflare's own single-page-app fallback does not answer them (review of PR #2). `routeFor` decides:
 * - `/api/auth/*` is passed through to this environment's Convex site, so Google's sign-in screen can show our own
 *   address (spike S3). A static `_redirects` rule cannot proxy to another host, hence this Worker.
 * - an app address such as `/learn/dengue` or `/r/<slug>` gets the app (`index.html`), as a navigation would;
 * - everything else is a 404: other `/api/*` paths and missing files (`/_expo/…`, `/robots.txt`), which must never
 *   turn into a 200 HTML page.
 * Cloudflare does not apply `_headers` to Worker responses, so every response here gets the §7.4 security headers.
 * The Worker logs nothing: no request data (cookies, tokens, numbers) leaves this function except to Convex.
 */
import { withSecurityHeaders } from './security-headers';

export type Env = {
  CONVEX_SITE_URL?: string;
  /** The static files (wrangler.jsonc `assets.binding`). */
  ASSETS?: { fetch(request: Request): Promise<Response> };
};

const AUTH_PREFIX = '/api/auth/';

/**
 * Never passed on: our own host, hop-by-hop headers and Cloudflare's visitor headers (IP address, country).
 * Better Auth's own IP rate limiter is off on Convex (it runs only when NODE_ENV is "production"; checked on staging
 * 2026-11-27: 5 quick sign-in attempts → 401 ×5, no 429), so nothing needs the visitor IP. Before anyone turns that
 * limiter on, forward the IP here and set `advanced.ipAddress` — otherwise every visitor shares one bucket (spike S3).
 */
const DROPPED_HEADER = /^(host|connection|keep-alive|transfer-encoding|upgrade|cf-.*|x-forwarded-.*|x-real-ip|true-client-ip)$/i;

/** Paths that are files, never app pages: a missing one is a 404, not the app. */
const FILE_PREFIXES = ['/_expo/', '/assets/', '/.well-known/'];

/** The Convex URL for an auth request, or null when the path is not ours to forward. Pure — unit-tested. */
export function authTarget(requestUrl: string, convexSiteUrl: string | undefined): URL | null {
  if (!convexSiteUrl) return null;
  let base: URL;
  try {
    base = new URL(convexSiteUrl);
  } catch {
    return null;
  }
  if (base.protocol !== 'https:') return null;
  // The URL parser has already resolved "..", "%2e%2e" and similar, so this prefix check sees the real path.
  const url = new URL(requestUrl);
  if (!url.pathname.startsWith(AUTH_PREFIX)) return null;
  return new URL(`${url.pathname}${url.search}`, base.origin);
}

export type Route = { kind: 'auth'; target: URL } | { kind: 'app' } | { kind: 'not-found' };

/**
 * What to do with a request that matched no static file. Pure — unit-tested, and scripts/serve-dist.ts uses it too,
 * so the Playwright smoke test sees the same answers as production.
 */
export function routeFor(method: string, requestUrl: string, convexSiteUrl: string | undefined): Route {
  const { pathname } = new URL(requestUrl);
  if (pathname.startsWith('/api/')) {
    const target = authTarget(requestUrl, convexSiteUrl);
    return target ? { kind: 'auth', target } : { kind: 'not-found' };
  }
  if (method !== 'GET' && method !== 'HEAD') return { kind: 'not-found' };
  const lastSegment = pathname.slice(pathname.lastIndexOf('/') + 1);
  // App addresses never contain a dot (Expo Router file names; `/r/<slug>` is 10 random letters and digits).
  if (FILE_PREFIXES.some((prefix) => pathname.startsWith(prefix)) || lastSegment.includes('.')) {
    return { kind: 'not-found' };
  }
  return { kind: 'app' };
}

function notFound(): Response {
  return new Response('Not found', { status: 404, headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
}

async function passToConvex(request: Request, target: URL): Promise<Response> {
  const headers = new Headers();
  request.headers.forEach((value, key) => {
    if (!DROPPED_HEADER.test(key)) headers.set(key, value);
  });
  headers.set('x-forwarded-host', new URL(request.url).host);
  headers.set('x-forwarded-proto', 'https');

  const hasBody = request.method !== 'GET' && request.method !== 'HEAD';
  // Redirects (e.g. to Google) and Set-Cookie go back to the browser unchanged, on our own address.
  return fetch(target, {
    method: request.method,
    headers,
    body: hasBody ? await request.arrayBuffer() : undefined,
    redirect: 'manual',
  });
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const route = routeFor(request.method, request.url, env.CONVEX_SITE_URL);
    if (route.kind === 'auth') {
      // Our CSP is written for the app, not for Better Auth's own pages; the other headers apply.
      return withSecurityHeaders(await passToConvex(request, route.target), ['content-security-policy']);
    }
    if (route.kind === 'app' && env.ASSETS) {
      // Ask for `/`, not `/index.html`: Cloudflare's html_handling would answer that with a redirect to `/`.
      const shell = await env.ASSETS.fetch(
        new Request(new URL('/', request.url), { method: request.method, headers: request.headers }),
      );
      return withSecurityHeaders(shell);
    }
    return withSecurityHeaders(notFound());
  },
};
