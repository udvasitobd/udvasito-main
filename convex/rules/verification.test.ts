import { describe, expect, it } from 'vitest';

import { checkVerificationCode, VERIFICATION_CODE_ALPHABET } from './validation';
import {
  codeFromBytes,
  effectiveStatus,
  isOpen,
  telegramDeepLink,
  tokenFromBytes,
  VERIFICATION_CODE_LENGTH,
  VERIFICATION_TTL_MS,
  WEBHOOK_REPLAY_MS,
} from './verification';

describe('codeFromBytes (VAL-26)', () => {
  it('maps each byte into the 32-character alphabet', () => {
    expect(VERIFICATION_CODE_ALPHABET).toHaveLength(32);
    expect(codeFromBytes([0, 1, 31, 32, 255, 100])).toBe('AB9A9E'); // 31 and 255 → the last character, 100 % 32 = 4 → E
  });

  it('always makes a code that passes VAL-26', () => {
    for (let seed = 0; seed < 256; seed++) {
      const bytes = Array.from({ length: VERIFICATION_CODE_LENGTH }, (_, i) => (seed * 7 + i * 31) % 256);
      const code = codeFromBytes(bytes);
      expect(code).toHaveLength(6);
      expect(checkVerificationCode(code)).toEqual({ ok: true, value: code });
    }
  });

  it('never uses 0, O, 1 or I', () => {
    const all = codeFromBytes([...Array(6).keys()]) + VERIFICATION_CODE_ALPHABET;
    expect(all).not.toMatch(/[0O1I]/);
  });

  it('needs six bytes', () => {
    expect(() => codeFromBytes([1, 2, 3])).toThrow();
  });
});

describe('tokenFromBytes', () => {
  it('makes 32 hex characters from 16 bytes', () => {
    const token = tokenFromBytes(Array.from({ length: 16 }, (_, i) => i * 16 + 1));
    expect(token).toMatch(/^[0-9a-f]{32}$/);
    expect(tokenFromBytes([0, 15, 255])).toBe('000fff');
  });
});

describe('isOpen / effectiveStatus', () => {
  const now = 1_800_000_000_000;
  const pending = { status: 'pending' as const, expiresAt: now + VERIFICATION_TTL_MS };

  it('a fresh pending row is open', () => {
    expect(isOpen(pending, now)).toBe(true);
    expect(effectiveStatus(pending, now)).toBe('pending');
  });

  it('a pending row past its time is expired', () => {
    const late = now + VERIFICATION_TTL_MS;
    expect(isOpen(pending, late)).toBe(false);
    expect(effectiveStatus(pending, late)).toBe('expired');
  });

  it('finished rows are never open and keep their status', () => {
    for (const status of ['verified', 'mismatch', 'expired'] as const) {
      const row = { status, expiresAt: now + VERIFICATION_TTL_MS };
      expect(isOpen(row, now)).toBe(false);
      expect(effectiveStatus(row, now + 2 * VERIFICATION_TTL_MS)).toBe(status);
    }
  });

  it('the code lives 10 minutes', () => {
    expect(VERIFICATION_TTL_MS).toBe(600_000);
  });
});

describe('telegramDeepLink', () => {
  it('builds the start link, with or without "@"', () => {
    expect(telegramDeepLink('udvasito_bot', 'abc123')).toBe('https://t.me/udvasito_bot?start=abc123');
    expect(telegramDeepLink(' @udvasito_bot ', 'abc123')).toBe('https://t.me/udvasito_bot?start=abc123');
  });

  it('the replay window is 10 minutes', () => {
    expect(WEBHOOK_REPLAY_MS).toBe(600_000);
  });
});
