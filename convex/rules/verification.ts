/**
 * Phone verification — pure rules (specs §6.1 `phoneVerification.*`, VAL-26, ADR-004, D-R1). No Convex imports.
 */
import { VERIFICATION_CODE_ALPHABET } from './validation';

/**
 * A code or Telegram link works for 10 minutes (specs §5 `phoneVerifications.expiresAt`, SCR-O04). The approved copy
 * says "valid for 10 minutes", so this is fixed with the copy, not a setting.
 */
export const VERIFICATION_TTL_MS = 10 * 60 * 1000;

/** VAL-26: 6 characters. */
export const VERIFICATION_CODE_LENGTH = 6;

/** Random bytes → a VAL-26 code. The alphabet has exactly 32 characters, so `byte % 32` is uniform. */
export function codeFromBytes(bytes: ArrayLike<number>): string {
  if (bytes.length < VERIFICATION_CODE_LENGTH) throw new Error('codeFromBytes: need 6 bytes');
  let code = '';
  for (let i = 0; i < VERIFICATION_CODE_LENGTH; i++) {
    code += VERIFICATION_CODE_ALPHABET[bytes[i]! % VERIFICATION_CODE_ALPHABET.length];
  }
  return code;
}

/** Random bytes → hex (16 bytes → the 32-character `phoneVerifications.token`). */
export function tokenFromBytes(bytes: ArrayLike<number>): string {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
}

export type VerificationStatus = 'pending' | 'verified' | 'mismatch' | 'expired';

type Row = { status: VerificationStatus; expiresAt: number };

/** Still usable: waiting, and not past its time. */
export function isOpen(row: Row, now: number): boolean {
  return row.status === 'pending' && now < row.expiresAt;
}

/** What the person's screen shows: a waiting row past its time has expired, even before anything marks it. */
export function effectiveStatus(row: Row, now: number): VerificationStatus {
  return row.status === 'pending' && now >= row.expiresAt ? 'expired' : row.status;
}
