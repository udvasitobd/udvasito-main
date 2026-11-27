/**
 * Edge Worker for udvasito.com and staging.udvasito.com (ADR-024).
 *
 * Cloudflare serves the web export (`dist/`) as static assets — SPA fallback and `public/_headers` included — without
 * running this code. Only paths in wrangler.jsonc `run_worker_first` reach `fetch` below:
 * - `/api/auth/*` is passed through to this environment's Convex site, so Google's sign-in screen can show our own
 *   address (spike S3). A static `_redirects` rule cannot proxy to another host, hence this Worker.
 * - Anything else is a 404.
 * The Worker logs nothing: no request data (cookies, tokens, numbers) leaves this function except to Convex.
 */

export type Env = { CONVEX_SITE_URL?: string };

const AUTH_PREFIX = '/api/auth/';

/** Never passed on: our own host, hop-by-hop headers and Cloudflare's visitor headers (IP address, country). */
const DROPPED_HEADER = /^(host|connection|keep-alive|transfer-encoding|upgrade|cf-.*|x-forwarded-.*|x-real-ip|true-client-ip)$/i;

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

function notFound(): Response {
  return new Response('Not found', {
    status: 404,
    headers: { 'Content-Type': 'text/plain; charset=utf-8', 'X-Content-Type-Options': 'nosniff' },
  });
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const target = authTarget(request.url, env.CONVEX_SITE_URL);
    if (!target) return notFound();

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
  },
};
