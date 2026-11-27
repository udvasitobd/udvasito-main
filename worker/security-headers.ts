/**
 * The specs §7.4 response headers for responses that worker/index.ts returns. Cloudflare applies `public/_headers`
 * only to static files it serves itself, never to Worker responses, so the Worker adds these. They must equal the
 * `/*` block of `public/_headers` — `security-headers.test.ts` fails if the two drift apart.
 */
export const SECURITY_HEADERS: Readonly<Record<string, string>> = {
  'content-security-policy':
    "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; font-src 'self' data:; " +
    "img-src 'self' data: blob: https://res.cloudinary.com https://tiles.openfreemap.org; " +
    "connect-src 'self' https://*.convex.cloud wss://*.convex.cloud https://*.convex.site https://api.cloudinary.com " +
    'https://tiles.openfreemap.org https://*.ingest.sentry.io https://*.ingest.us.sentry.io ' +
    'https://*.ingest.de.sentry.io https://accounts.google.com; ' +
    "worker-src 'self'; manifest-src 'self'; form-action 'self' https://accounts.google.com; base-uri 'self'; " +
    "object-src 'none'; frame-ancestors 'none'; upgrade-insecure-requests",
  'x-content-type-options': 'nosniff',
  'referrer-policy': 'strict-origin-when-cross-origin',
  'permissions-policy': 'geolocation=(self), microphone=(self), camera=(self)',
  'strict-transport-security': 'max-age=63072000; includeSubDomains; preload',
  'x-frame-options': 'DENY',
};

/**
 * A copy of `response` with every security header it does not already set. `except` leaves headers out — the auth
 * pass-through skips our CSP, which is written for the app and not for Better Auth's own pages.
 */
export function withSecurityHeaders(response: Response, except: readonly string[] = []): Response {
  const headers = new Headers(response.headers);
  for (const [name, value] of Object.entries(SECURITY_HEADERS)) {
    if (!except.includes(name) && !headers.has(name)) headers.set(name, value);
  }
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
}
