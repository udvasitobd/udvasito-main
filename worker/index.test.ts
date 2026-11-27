import { afterEach, describe, expect, it, vi } from 'vitest';

import worker, { authTarget } from './index';

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

  it('answers 404 for any other path without calling out', async () => {
    const upstream = stubFetch();
    const response = await worker.fetch(new Request('https://udvasito.com/api/r/abc'), { CONVEX_SITE_URL: CONVEX });
    expect(response.status).toBe(404);
    expect(upstream).not.toHaveBeenCalled();
  });
});
