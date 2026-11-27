import { describe, expect, it } from 'vitest';

import { SECURITY_HEADERS, withSecurityHeaders } from './security-headers';

// scripts/lib/headers-file.test.ts checks that SECURITY_HEADERS equals the /* block of public/_headers.

describe('withSecurityHeaders', () => {
  it('adds the missing headers and keeps status, body and the headers already set', async () => {
    const response = withSecurityHeaders(
      new Response('hi', { status: 404, headers: { 'Content-Type': 'text/plain', 'Referrer-Policy': 'no-referrer' } }),
    );
    expect(response.status).toBe(404);
    expect(await response.text()).toBe('hi');
    expect(response.headers.get('content-type')).toBe('text/plain');
    expect(response.headers.get('referrer-policy')).toBe('no-referrer');
    expect(response.headers.get('strict-transport-security')).toBe(SECURITY_HEADERS['strict-transport-security']);
    expect(response.headers.get('x-frame-options')).toBe('DENY');
    expect(response.headers.get('content-security-policy')).toContain("frame-ancestors 'none'");
  });

  it('leaves out the headers named in except', () => {
    const response = withSecurityHeaders(new Response(null, { status: 302 }), ['content-security-policy']);
    expect(response.headers.get('content-security-policy')).toBeNull();
    expect(response.headers.get('x-content-type-options')).toBe('nosniff');
  });
});
