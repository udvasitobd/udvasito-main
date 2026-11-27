/**
 * Bangladeshi mobile numbers — VAL-03 (specs §4). Shared by the app (instant field errors) and the server
 * (`convex/rules/validation.ts` re-runs it in every mutation). Pure TypeScript, no imports.
 *
 * Normalise: Bangla digits → Latin; strip spaces, dashes, dots and brackets; accept `01XXXXXXXXX`,
 * `8801XXXXXXXXX`, `+8801XXXXXXXXX`; valid if the national part matches `^01[3-9]\d{8}$`; stored as `+8801XXXXXXXXX`.
 */

const BANGLA_DIGITS = '০১২৩৪৫৬৭৮৯';
const NATIONAL_MOBILE = /^01[3-9]\d{8}$/;

/** Converts Bangla digits (০–৯) to Latin digits; other characters are kept. */
export function toLatinDigits(input: string): string {
  let out = '';
  for (const ch of input) {
    const i = BANGLA_DIGITS.indexOf(ch);
    out += i >= 0 ? String(i) : ch;
  }
  return out;
}

export type PhoneResult = { ok: true; phone: string } | { ok: false; reason: 'empty' | 'invalid' };

/** VAL-03: returns the stored form `+8801XXXXXXXXX`, or why the input is not a Bangladeshi mobile number. */
export function normalisePhone(input: string | null | undefined): PhoneResult {
  const cleaned = toLatinDigits(input ?? '').replace(/[\s\-().]/g, '');
  if (cleaned === '') return { ok: false, reason: 'empty' };
  let national: string;
  if (cleaned.startsWith('+880')) national = '0' + cleaned.slice(4);
  else if (cleaned.startsWith('880')) national = '0' + cleaned.slice(3);
  else national = cleaned;
  if (!NATIONAL_MOBILE.test(national)) return { ok: false, reason: 'invalid' };
  return { ok: true, phone: '+88' + national };
}

/** Last four digits only — what an in-person verifier may see (D-R1). */
export function phoneLast4(stored: string): string {
  return stored.slice(-4);
}
