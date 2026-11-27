import { describe, expect, it } from 'vitest';

import { clientAddress, networkKey } from './network';

const h = (init: Record<string, string>) => new Headers(init);

describe('clientAddress', () => {
  it('prefers the address Cloudflare sets', () => {
    expect(clientAddress(h({ 'cf-connecting-ip': '198.51.100.20', 'x-forwarded-for': '203.0.113.7' }))).toBe('198.51.100.20');
  });

  it('uses the last x-forwarded-for entry, never a caller-written first entry', () => {
    expect(clientAddress(h({ 'x-forwarded-for': '203.0.113.7, 198.51.100.20' }))).toBe('198.51.100.20');
    expect(clientAddress(h({ 'x-forwarded-for': '198.51.100.20' }))).toBe('198.51.100.20');
  });

  it('ignores x-real-ip, which a caller can write', () => {
    expect(clientAddress(h({ 'x-real-ip': '203.0.113.7' }))).toBe('unknown');
    expect(clientAddress(h({ 'x-forwarded-for': ' , ' }))).toBe('unknown');
  });
});

describe('networkKey', () => {
  it('is a stable hash that never contains the address, and differs per namespace', async () => {
    const headers = h({ 'cf-connecting-ip': '198.51.100.20' });
    const a = await networkKey(headers, 'helpline');
    expect(a).toMatch(/^[0-9a-f]{64}$/);
    expect(a).not.toContain('198.51.100.20');
    expect(await networkKey(headers, 'helpline')).toBe(a);
    expect(await networkKey(headers, 'other')).not.toBe(a);
  });

  it('a spoofed first x-forwarded-for entry does not change the key', async () => {
    const real = await networkKey(h({ 'x-forwarded-for': '198.51.100.20' }), 'helpline');
    const spoofed = await networkKey(h({ 'x-forwarded-for': '203.0.113.99, 198.51.100.20' }), 'helpline');
    expect(spoofed).toBe(real);
  });
});
