import { readFileSync } from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

import { checkHeadersFile, headersFor, parseHeadersFile } from './headers-file';

describe('parseHeadersFile / headersFor', () => {
  const rules = parseHeadersFile(
    ['# comment', '/*', '  X-A: 1', '  Cache-Control: no-cache', '', '/_expo/*', '  ! Cache-Control', '  Cache-Control: immutable', '/r/:slug', '  X-A: 2'].join('\n'),
  );

  it('applies every matching rule in order, joining repeats and honouring detach', () => {
    expect(Object.fromEntries(headersFor(rules, '/sign-in'))).toEqual({ 'x-a': '1', 'cache-control': 'no-cache' });
    expect(Object.fromEntries(headersFor(rules, '/_expo/static/js/web/a.js'))).toEqual({ 'x-a': '1', 'cache-control': 'immutable' });
    expect(headersFor(rules, '/r/abc').get('x-a')).toBe('1, 2');
    expect(headersFor(rules, '/r/abc/def').get('x-a')).toBe('1');
  });

  it('rejects a header line before any path', () => {
    expect(() => parseHeadersFile('  X-A: 1')).toThrow(/line 1/);
  });
});

describe('public/_headers (what Cloudflare serves)', () => {
  const text = readFileSync(path.join(process.cwd(), 'public', '_headers'), 'utf8');
  const rules = parseHeadersFile(text);

  it('stays within Cloudflare limits', () => {
    expect(checkHeadersFile(text)).toEqual([]);
  });

  it('sends the security headers of specs §7.4 on every page', () => {
    const h = headersFor(rules, '/donor/abc');
    expect(h.get('content-security-policy')).toMatch(/^default-src 'self'; script-src 'self';/);
    expect(h.get('content-security-policy')).toMatch(/frame-ancestors 'none'/);
    expect(h.get('x-content-type-options')).toBe('nosniff');
    expect(h.get('x-frame-options')).toBe('DENY');
    expect(h.get('strict-transport-security')).toMatch(/max-age=\d+/);
    expect(h.get('referrer-policy')).toBe('strict-origin-when-cross-origin');
  });

  it('caches hashed bundles for a year but never sets a cache header on pages', () => {
    expect(headersFor(rules, '/_expo/static/js/web/entry-abc.js').get('cache-control')).toBe('public, max-age=31536000, immutable');
    expect(headersFor(rules, '/index.html').get('cache-control')).toBeUndefined();
  });
});
