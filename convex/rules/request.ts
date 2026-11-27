/**
 * Blood requests — the field checks of specs §4 (VAL-04 … VAL-11) and the "needed by" rules of SCR-M02, shared by the
 * request form and `requests.create`. Pure TypeScript, no Convex imports.
 *
 * The numbers here are the definitions written in specs §4 and SCR-M02 (field lengths, 1–10 bags, "Now" = within
 * 2 hours), not tunable policy, so they are constants like NAME_MAX_LENGTH rather than settings (Q-019).
 */
import { BLOOD_GROUPS, type BloodGroup } from './compatibility';
import { dhakaDate, dhakaMidnight, dhakaMidnightAfter } from './time';
import { NAME_CHARS, toLatinDigits, type Checked } from './validation';

const MINUTE_MS = 60 * 1000;
const HOUR_MS = 60 * MINUTE_MS;

export const REQUEST_GROUPS = [...BLOOD_GROUPS, 'any', 'not_sure'] as const;
export type RequestGroup = BloodGroup | 'any' | 'not_sure';
export type Component = 'whole_blood' | 'platelets';
export type Urgency = 'now' | 'today' | 'later';

/** VAL-06 */
export const UNITS_MIN = 1;
export const UNITS_MAX = 10;
/** VAL-07 */
export const PLACE_TEXT_MIN = 3;
export const PLACE_TEXT_MAX = 80;
/** VAL-09 / VAL-10 / VAL-11 */
export const PATIENT_NAME_MAX = 60;
export const WARD_MAX = 40;
export const NOTE_MAX = 300;
/** VAL-08: a little in the past is allowed (the form was open a while); at most 30 days ahead. */
export const NEEDED_BY_GRACE_MS = 5 * MINUTE_MS;
export const NEEDED_BY_MAX_DAYS = 30;
/** SCR-M02: "Now" means blood is needed within 2 hours. */
export const URGENT_WINDOW_MS = 2 * HOUR_MS;
/** SCR-M02: "Tomorrow" means tomorrow at 12:00. */
const TOMORROW_HOUR = 12;
/** The stored request point is rounded to 3 decimals (about 100 m) — schema `approxLat`. */
const POINT_DECIMALS = 3;

const ok = <T>(value: T): Checked<T> => ({ ok: true, value });
const fail = (field: string, messageKey: string): Checked<never> => ({ ok: false, error: { field, messageKey } });

const clean = (input: string | undefined) => (input ?? '').trim().replace(/\s+/g, ' ');
const length = (text: string) => [...text].length;

/** VAL-04 */
export function checkRequestGroup(value: string | null | undefined): Checked<RequestGroup> {
  return value && (REQUEST_GROUPS as readonly string[]).includes(value)
    ? ok(value as RequestGroup)
    : fail('bloodGroup', 'validation.VAL-04.empty');
}

/** VAL-05: whole blood or platelets; platelets need a specific group or "Not sure". */
export function checkComponent(group: RequestGroup | null, component: string | null | undefined): Checked<Component> {
  if (component !== 'whole_blood' && component !== 'platelets') return fail('component', 'validation.VAL-05.combo');
  if (component === 'platelets' && group === 'any') return fail('component', 'validation.VAL-05.combo');
  return ok(component);
}

/** VAL-06 */
export function checkUnits(units: number): Checked<number> {
  return Number.isInteger(units) && units >= UNITS_MIN && units <= UNITS_MAX
    ? ok(units)
    : fail('unitsNeeded', 'validation.VAL-06.range');
}

/**
 * VAL-07: a hospital from the list, or a district + thana + the place's name (3–80). Which of the two is checked
 * against the database by the caller; this only checks that one of them is complete. With a hospital the typed name
 * is dropped: the hospital names the place, and the form clears the field when one is picked.
 */
export function checkPlace(place: {
  hospitalId?: string | null;
  districtId?: string | null;
  upazilaId?: string | null;
  placeText?: string;
}): Checked<{ placeText?: string }> {
  if (place.hospitalId) return ok({});
  const placeText = clean(place.placeText);
  if (!place.districtId || !place.upazilaId) return fail('place', 'validation.VAL-07.empty');
  if (length(placeText) < PLACE_TEXT_MIN || length(placeText) > PLACE_TEXT_MAX) {
    return fail('placeText', 'validation.VAL-07.placeText');
  }
  return ok({ placeText });
}

/** VAL-08 */
export function checkNeededBy(neededBy: number | null | undefined, now: number): Checked<number> {
  if (
    neededBy === null ||
    neededBy === undefined ||
    !Number.isFinite(neededBy) ||
    neededBy < now - NEEDED_BY_GRACE_MS
  ) {
    return fail('neededBy', 'validation.VAL-08.past');
  }
  if (neededBy > now + NEEDED_BY_MAX_DAYS * 24 * HOUR_MS) return fail('neededBy', 'validation.VAL-08.far');
  return ok(neededBy);
}

/** VAL-09: optional; at most 60; letters only (VAL-01 characters). Empty → undefined. */
export function checkPatientName(input: string | undefined): Checked<string | undefined> {
  const name = clean(input);
  if (name === '') return ok(undefined);
  if (length(name) > PATIENT_NAME_MAX) return fail('patientName', 'validation.VAL-09.long');
  if (!NAME_CHARS.test(name) || /[0-9০-৯]/.test(name)) return fail('patientName', 'validation.VAL-01.chars');
  return ok(name);
}

/** VAL-10: optional; at most 40. */
export function checkWard(input: string | undefined): Checked<string | undefined> {
  const ward = clean(input);
  if (ward === '') return ok(undefined);
  return length(ward) > WARD_MAX ? fail('ward', 'validation.VAL-10.long') : ok(ward);
}

/**
 * True when the text holds a Bangladeshi mobile number, written with any spacing, dashes, dots or brackets, in Latin
 * or Bangla digits, with or without +88 (VAL-11: numbers never go in the note — P-13).
 */
export function containsPhoneNumber(text: string): boolean {
  const latin = toLatinDigits(text);
  const runs = latin.match(/\+?\d[\d\s\-.()]{8,}\d/g) ?? [];
  return runs.some((run) => /01[3-9]\d{8}/.test(run.replace(/\D/g, '')));
}

/** VAL-11: optional; no phone numbers; at most 300 (line breaks kept). Empty → undefined. */
export function checkNote(input: string | undefined): Checked<string | undefined> {
  const note = (input ?? '').trim();
  if (note === '') return ok(undefined);
  if (containsPhoneNumber(note)) return fail('note', 'validation.VAL-11.phone');
  return length(note) > NOTE_MAX ? fail('note', 'validation.VAL-11.long') : ok(note);
}

export type NeededByChoice = 'now' | 'today' | 'tomorrow';

/**
 * SCR-M02 "Needed by" chips: Now → in 2 hours; Today → 23:59 today, or in 2 hours when that is later;
 * Tomorrow → tomorrow 12:00 (all Dhaka time).
 */
export function neededByFor(choice: NeededByChoice, now: number): number {
  const today = dhakaDate(now);
  if (choice === 'now') return now + URGENT_WINDOW_MS;
  if (choice === 'today') return Math.max(dhakaMidnightAfter(today, 1) - MINUTE_MS, now + URGENT_WINDOW_MS);
  return dhakaMidnightAfter(today, 1) + TOMORROW_HOUR * HOUR_MS;
}

/** "Pick date & time": a Dhaka calendar date "YYYY-MM-DD" and a time "HH:MM" → timestamp, or null if malformed. */
export function dhakaDateTime(date: string, time: string): number | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;
  const match = /^(\d{1,2}):(\d{2})$/.exec(time);
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours > 23 || minutes > 59) return null;
  const midnight = dhakaMidnight(date);
  return Number.isNaN(midnight) ? null : midnight + hours * HOUR_MS + minutes * MINUTE_MS;
}

/** Urgency stored with a request: within 2 hours → now; later today (Dhaka) → today; otherwise later. */
export function urgencyOf(neededBy: number, now: number): Urgency {
  if (neededBy - now <= URGENT_WINDOW_MS) return 'now';
  return dhakaDate(neededBy) === dhakaDate(now) ? 'today' : 'later';
}

/** The stored request point (about 100 m). */
export function roundPoint(point: { lat: number; lng: number }): { lat: number; lng: number } {
  const factor = 10 ** POINT_DECIMALS;
  return { lat: Math.round(point.lat * factor) / factor, lng: Math.round(point.lng * factor) / factor };
}

/** Letters and digits that cannot be confused when read aloud or typed (no 0/o, 1/l). 32 symbols, so no bias. */
export const SLUG_ALPHABET = 'abcdefghijkmnpqrstuvwxyz23456789';
export const SLUG_LENGTH = 10;

/** `publicSlug` for `/r/<slug>` (schema: 10 characters) from at least SLUG_LENGTH random bytes. */
export function slugFromBytes(bytes: Uint8Array): string {
  if (bytes.length < SLUG_LENGTH) throw new Error('slugFromBytes: not enough bytes');
  let slug = '';
  for (let i = 0; i < SLUG_LENGTH; i += 1) slug += SLUG_ALPHABET[bytes[i]! % SLUG_ALPHABET.length];
  return slug;
}

/** The device's idempotency key (a UUID v4 in practice). */
export function checkClientId(clientId: string): Checked<string> {
  return /^[A-Za-z0-9-]{8,64}$/.test(clientId) ? ok(clientId) : fail('clientId', 'errors.ERR_VALIDATION');
}
