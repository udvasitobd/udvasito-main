import { afterEach, describe, expect, it, vi } from 'vitest';

import worker, { authTarget, routeFor, type Env } from './index';

const CONVEX = 'https://example-123.eu-west-1.convex.site';

describe('authTarget', () => {
  it('maps an auth path and its query to the Convex site', () => {
    expect(authTarget('https://udvasito.com/api/auth/callback/google?code=c&state=s', CONVEX)?.href).toBe(
      `${CONVEX}/api/auth/callback/google?code=c&state=s`,
    );
  });

  it.each([
    ['other API path', 'https://udvasito.com/api/other'],
    ['prefix look-alike', 'https://udvasito.com/api/authx/session'],
    ['bare prefix', 'https://udvasito.com/api/auth'],
    ['dot segments', 'https://udvasito.com/api/auth/../../admin'],
    ['encoded dot segments', 'https://udvasito.com/api/auth/%2e%2e/%2e%2e/admin'],
  ])('ignores %s', (_, url) => {
    expect(authTarget(url, CONVEX)).toBeNull();
  });

  it.each([[undefined], [''], ['not a url'], ['http://example.convex.site']])(
    'fails closed when CONVEX_SITE_URL is %j',
    (convexSiteUrl) => {
      expect(authTarget('https://udvasito.com/api/auth/session', convexSiteUrl)).toBeNull();
    },
  );

  it('never lets the request choose the host', () => {
    expect(authTarget('https://udvasito.com/api/auth//evil.example/x', CONVEX)?.origin).toBe(CONVEX);
  });
});

describe('routeFor', () => {
  const kind = (method: string, path: string) => routeFor(method, `https://udvasito.com${path}`, CONVEX).kind;

  it.each([['/'], ['/learn/dengue'], ['/r/a1B2c3D4e5'], ['/home?next=x'], ['/sign-in']])('serves the app for %s', (p) => {
    expect(kind('GET', p)).toBe('app');
    expect(kind('HEAD', p)).toBe('app');
  });

  it('passes /api/auth/* to Convex for any method', () => {
    expect(kind('POST', '/api/auth/sign-out')).toBe('auth');
  });

  it.each([
    ['another API path', 'GET', '/api/r/abc'],
    ['a missing bundle', 'GET', '/_expo/static/js/web/entry-old.js'],
    ['a missing asset', 'GET', '/assets/x'],
    ['a missing well-known file', 'GET', '/.well-known/assetlinks'],
    ['a missing file with an extension', 'GET', '/robots.txt'],
    ['a POST to an app address', 'POST', '/learn/dengue'],
  ])('answers 404 for %s', (_, method, p) => {
    expect(kind(method, p)).toBe('not-found');
  });

  it('treats /api/auth/* as a 404 when Convex is not configured', () => {
    expect(routeFor('GET', 'https://udvasito.com/api/auth/session', undefined).kind).toBe('not-found');
  });
});

describe('worker.fetch', () => {
  afterEach(() => vi.unstubAllGlobals());

  function stubFetch() {
    const upstream = vi.fn(async () => new Response(null, { status: 302, headers: { Location: 'https://accounts.google.com/o' } }));
    vi.stubGlobal('fetch', upstream);
    return upstream;
  }

  it('forwards an auth request without our host or the visitor IP, and returns redirects unchanged', async () => {
    const upstream = stubFetch();
    const response = await worker.fetch(
      new Request('https://udvasito.com/api/auth/sign-in/social?x=1', {
        headers: { cookie: 'a=b', 'cf-connecting-ip': '1.2.3.4', 'x-forwarded-for': '1.2.3.4', 'x-real-ip': '1.2.3.4' },
      }),
      { CONVEX_SITE_URL: CONVEX },
    );
    expect(response.status).toBe(302);
    expect(response.headers.get('location')).toBe('https://accounts.google.com/o');
    const [target, init] = upstream.mock.calls[0] as unknown as [URL, RequestInit];
    expect(target.href).toBe(`${CONVEX}/api/auth/sign-in/social?x=1`);
    expect(init.redirect).toBe('manual');
    expect(init.body).toBeUndefined();
    const sent = new Headers(init.headers);
    expect(sent.get('cookie')).toBe('a=b');
    expect(sent.get('x-forwarded-host')).toBe('udvasito.com');
    expect(sent.get('cf-connecting-ip')).toBeNull();
    expect(sent.get('x-real-ip')).toBeNull();
    expect(sent.get('x-forwarded-for')).toBeNull();
    // Security headers are added, except our app CSP (Better Auth's pages are not our app).
    expect(response.headers.get('strict-transport-security')).toContain('max-age=');
    expect(response.headers.get('x-frame-options')).toBe('DENY');
    expect(response.headers.get('content-security-policy')).toBeNull();
  });

  it('forwards the body of a POST', async () => {
    const upstream = stubFetch();
    await worker.fetch(
      new Request('https://udvasito.com/api/auth/sign-out', { method: 'POST', body: '{"a":1}' }),
      { CONVEX_SITE_URL: CONVEX },
    );
    const [, init] = upstream.mock.calls[0] as unknown as [URL, RequestInit];
    expect(init.method).toBe('POST');
    expect(new TextDecoder().decode(init.body as ArrayBuffer)).toBe('{"a":1}');
  });

  it('answers 404 with the security headers for any other API path, without calling out', async () => {
    const upstream = stubFetch();
    const response = await worker.fetch(new Request('https://udvasito.com/api/r/abc'), { CONVEX_SITE_URL: CONVEX });
    expect(response.status).toBe(404);
    expect(response.headers.get('x-content-type-options')).toBe('nosniff');
    expect(response.headers.get('content-security-policy')).toContain("frame-ancestors 'none'");
    expect(upstream).not.toHaveBeenCalled();
  });

  function assetsStub() {
    const assets = vi.fn(async (request: Request) =>
      new Response(request.method === 'HEAD' ? null : '<!doctype html><title>UDVASITO</title>', {
        status: 200,
        headers: { 'Content-Type': 'text/html; charset=utf-8' },
      }),
    );
    const env: Env = { CONVEX_SITE_URL: CONVEX, ASSETS: { fetch: assets } };
    return { assets, env };
  }

  it('gives a crawler (no Sec-Fetch-Mode) the app for an app address, with the security headers', async () => {
    const { assets, env } = assetsStub();
    const response = await worker.fetch(
      new Request('https://udvasito.com/learn/dengue', { headers: { 'user-agent': 'facebookexternalhit/1.1' } }),
      env,
    );
    expect(response.status).toBe(200);
    expect(await response.text()).toContain('<title>UDVASITO</title>');
    expect(response.headers.get('content-type')).toBe('text/html; charset=utf-8');
    expect(response.headers.get('content-security-policy')).toContain("script-src 'self'");
    expect(response.headers.get('strict-transport-security')).toContain('preload');
    const [asked] = assets.mock.calls[0] as unknown as [Request];
    expect(new URL(asked.url).pathname).toBe('/');
    expect(asked.method).toBe('GET');
  });

  it('answers 404, not the app, for a missing bundle', async () => {
    const { assets, env } = assetsStub();
    const response = await worker.fetch(new Request('https://udvasito.com/_expo/static/js/web/entry-old.js'), env);
    expect(response.status).toBe(404);
    expect(assets).not.toHaveBeenCalled();
  });

  it('answers 404 when the assets binding is missing', async () => {
    const response = await worker.fetch(new Request('https://udvasito.com/learn/dengue'), { CONVEX_SITE_URL: CONVEX });
    expect(response.status).toBe(404);
  });
});
