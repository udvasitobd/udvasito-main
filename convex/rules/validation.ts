/**
 * Validation rules — specs §4. Single source of truth: the app imports these for instant field errors and every
 * Convex mutation re-runs them (the server never trusts client validation). Pure TypeScript with no libraries: the
 * web app bundles this file, and zod alone would add about 100 KB gzip to the first load (specs §7.1).
 *
 * Each failure carries the i18n key `validation.<rule>.<case>` (e.g. `validation.VAL-03.invalid`).
 * Rules are added here phase by phase, as their forms are built.
 */
import { normalisePhone } from '../../src/lib/phone';

export { normalisePhone, phoneLast4, toLatinDigits } from '../../src/lib/phone';

export type FieldError = { field: string; messageKey: string; params?: Record<string, string | number> };
export type Checked<T> = { ok: true; value: T } | { ok: false; error: FieldError };

const ok = <T>(value: T): Checked<T> => ({ ok: true, value });
const fail = (field: string, messageKey: string, params?: Record<string, string | number>): Checked<never> => ({
  ok: false,
  error: params ? { field, messageKey, params } : { field, messageKey },
});

/** Letters (Latin or Bangla, incl. Bangla vowel signs and marks), spaces, `.` `-` `'` only (VAL-01). */
export const NAME_CHARS = /^[\p{Script=Latin}\p{Script=Bengali}\p{M} .'-]+$/u;

/** VAL-01 length limits (specs §4). */
export const NAME_MIN_LENGTH = 2;
export const NAME_MAX_LENGTH = 60;

/** VAL-01 Full name. */
export function checkName(input: string, field = 'name'): Checked<string> {
  const name = input.trim().replace(/\s+/g, ' ');
  if (name === '') return fail(field, 'validation.VAL-01.empty');
  if ([...name].length < NAME_MIN_LENGTH) return fail(field, 'validation.VAL-01.short');
  if ([...name].length > NAME_MAX_LENGTH) return fail(field, 'validation.VAL-01.long');
  if (!NAME_CHARS.test(name) || /[0-9০-৯]/.test(name)) return fail(field, 'validation.VAL-01.chars');
  return ok(name);
}

/** The first word of a name — the only name shown to other members. */
export function firstNameOf(name: string): string {
  return name.trim().split(/\s+/)[0] ?? '';
}

/** Age in whole years on `today` ("YYYY-MM-DD" strings, calendar arithmetic, no time zones). */
export function ageOn(dateOfBirth: string, today: string): number {
  const [by, bm, bd] = dateOfBirth.split('-').map(Number) as [number, number, number];
  const [ty, tm, td] = today.split('-').map(Number) as [number, number, number];
  let age = ty - by;
  if (tm < bm || (tm === bm && td < bd)) age -= 1;
  return age;
}

function isRealDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [y, m, d] = value.split('-').map(Number) as [number, number, number];
  const date = new Date(Date.UTC(y, m - 1, d));
  return date.getUTCFullYear() === y && date.getUTCMonth() === m - 1 && date.getUTCDate() === d;
}

/**
 * VAL-02 Date of birth. Under `minAge` is not a field error: it returns `underage` so the app shows the
 * under-18 flow.
 */
export function checkDateOfBirth(
  input: string,
  today: string,
  minAge: number,
): Checked<{ dateOfBirth: string; underage: boolean }> {
  const value = input.trim();
  if (value === '') return fail('dateOfBirth', 'validation.VAL-02.empty');
  if (!isRealDate(value) || value > today) return fail('dateOfBirth', 'validation.VAL-02.invalid');
  const age = ageOn(value, today);
  if (age > 100) return fail('dateOfBirth', 'validation.VAL-02.tooOld');
  return ok({ dateOfBirth: value, underage: age < minAge });
}

/** VAL-03 Mobile number (and contact numbers). */
export function checkPhone(input: string, field = 'phone'): Checked<string> {
  const result = normalisePhone(input);
  if (result.ok) return ok(result.phone);
  return fail(field, result.reason === 'empty' ? 'validation.VAL-03.empty' : 'validation.VAL-03.invalid');
}

/** VAL-18 Reason for admin / volunteer actions: 5–200 characters. */
export function checkReason(input: string, field = 'reason'): Checked<string> {
  const reason = input.trim();
  const length = [...reason].length;
  if (length < 5 || length > 200) return fail(field, 'validation.VAL-18.invalid');
  return ok(reason);
}

/** VAL-25 Delete confirmation: exactly `DELETE` or `মুছুন`. */
export function checkDeleteWord(input: string): Checked<string> {
  const word = input.trim();
  if (word !== 'DELETE' && word !== 'মুছুন') return fail('confirmWord', 'validation.VAL-25.invalid');
  return ok(word);
}

/** VAL-26 In-person verification code alphabet (no 0/O/1/I). */
export const VERIFICATION_CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

/** VAL-26 In-person verification code: 6 characters, case-insensitive input. */
export function checkVerificationCode(input: string): Checked<string> {
  const code = input.trim().toUpperCase();
  if (code.length !== 6 || [...code].some((c) => !VERIFICATION_CODE_ALPHABET.includes(c))) {
    return fail('code', 'validation.VAL-26.invalid');
  }
  return ok(code);
}

/** VAL-14d (and the donor's blood group, travel range): one of the offered options must be chosen. */
export function checkChoice<T extends string>(
  value: T | null | undefined,
  options: readonly T[],
  field: string,
): Checked<T> {
  if (value === null || value === undefined || !options.includes(value)) return fail(field, 'validation.VAL-14d.invalid');
  return ok(value);
}

/** VAL-14b Last donation: a real date from 1970 to today, unless "I have never donated". */
export function checkLastDonation(
  neverDonated: boolean,
  input: string | undefined,
  today: string,
): Checked<string | undefined> {
  if (neverDonated) return ok(undefined);
  const value = (input ?? '').trim();
  if (!isRealDate(value) || value < '1970-01-01') return fail('lastDonationDate', 'validation.VAL-14b.missing');
  if (value > today) return fail('lastDonationDate', 'validation.VAL-14b.future');
  return ok(value);
}

/** VAL-14c The three self-checks must all be ticked. */
export function checkDonorChecklist(checklist: { weight: boolean; health: boolean; screening: boolean }): Checked<true> {
  if (!checklist.weight || !checklist.health || !checklist.screening) {
    return fail('checklist', 'validation.VAL-14c.invalid');
  }
  return ok(true);
}

/** VAL-15 A consent checkbox must be ticked. */
export function checkTicked(ticked: boolean, field = 'consent'): Checked<true> {
  return ticked ? ok(true) : fail(field, 'validation.VAL-15.invalid');
}

/** VAL-22 / VAL-23 limit (specs §4). */
export const SHORT_TEXT_MAX_LENGTH = 80;

/** VAL-22 Institution / VAL-23 Area text: optional, trimmed, at most 80 characters; empty → undefined. */
export function checkShortText(input: string | undefined, field: 'institution' | 'areaText'): Checked<string | undefined> {
  const value = (input ?? '').trim().replace(/\s+/g, ' ');
  if (value === '') return ok(undefined);
  if ([...value].length > SHORT_TEXT_MAX_LENGTH) {
    return fail(field, field === 'institution' ? 'validation.VAL-22.invalid' : 'validation.VAL-23.invalid');
  }
  return ok(value);
}
