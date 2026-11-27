import { checkClientId } from '@convex/rules/request';
import { describe, expect, it } from 'vitest';

import { newClientId } from './clientId';

describe('newClientId', () => {
  it('makes keys the server accepts, all different', () => {
    const ids = new Set(Array.from({ length: 200 }, () => newClientId()));
    expect(ids.size).toBe(200);
    for (const id of ids) expect(checkClientId(id).ok).toBe(true);
  });

  it('works without Web Crypto', () => {
    const original = globalThis.crypto;
    Object.defineProperty(globalThis, 'crypto', { value: undefined, configurable: true });
    try {
      expect(checkClientId(newClientId()).ok).toBe(true);
    } finally {
      Object.defineProperty(globalThis, 'crypto', { value: original, configurable: true });
    }
  });
});
