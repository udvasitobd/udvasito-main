/**
 * Dates shown to people (specs §1.6 rule 3): `d MMM yyyy` with the date-fns `bn` / `enGB` locale, Bangla digits in
 * Bangla, Asia/Dhaka time. Calendar dates travel as "YYYY-MM-DD" strings (VAL-02, VAL-14b).
 */
import { format } from 'date-fns';
import { bn } from 'date-fns/locale/bn';
import { enGB } from 'date-fns/locale/en-GB';

import { dhakaDate } from '../../convex/rules/time';

import type { Language } from './language';

const BANGLA_DIGITS = '০১২৩৪৫৬৭৮৯';

export function toBanglaDigits(text: string): string {
  return text.replace(/[0-9]/g, (d) => BANGLA_DIGITS[Number(d)] ?? d);
}

const YMD = /^(\d{4})-(\d{2})-(\d{2})$/;

/** "YYYY-MM-DD" → a local Date at noon of that day (noon keeps the day stable in every time zone). */
export function dateFromYmd(ymd: string): Date | null {
  const m = YMD.exec(ymd);
  if (!m) return null;
  const date = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]), 12);
  return Number.isNaN(date.getTime()) ? null : date;
}

/** A local Date → its "YYYY-MM-DD" calendar day (what the person picked). */
export function ymdFromDate(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** "2001-05-20" → "20 May 2001" / "২০ মে ২০০১". Empty for anything that is not a date. */
export function formatCalendarDate(ymd: string, language: Language): string {
  const date = dateFromYmd(ymd);
  if (!date) return '';
  const text = format(date, 'd MMM yyyy', { locale: language === 'bn' ? bn : enGB });
  return language === 'bn' ? toBanglaDigits(text) : text;
}

/** A timestamp → its Dhaka calendar date, formatted ("eligible again on …"). */
export function formatDhakaDate(timestamp: number, language: Language): string {
  return formatCalendarDate(dhakaDate(timestamp), language);
}

/** Today's date in Dhaka, "YYYY-MM-DD" (the latest date of birth or last donation that can be picked). */
export function todayInDhaka(now = Date.now()): string {
  return dhakaDate(now);
}

/** `ymd` moved by whole years (29 Feb → 28 Feb in a non-leap year). Where a calendar opens; never a rule. */
export function addYears(ymd: string, years: number): string {
  const date = dateFromYmd(ymd);
  if (!date) return ymd;
  const month = date.getMonth();
  date.setFullYear(date.getFullYear() + years);
  if (date.getMonth() !== month) date.setDate(0);
  return ymdFromDate(date);
}

const HM = /^(\d{1,2}):(\d{2})$/;
/** Asia/Dhaka is UTC+6 all year (no daylight saving since 2009). */
const DHAKA_OFFSET_MS = 6 * 60 * 60 * 1000;

function localized(text: string, language: Language): string {
  return language === 'bn' ? toBanglaDigits(text) : text;
}

/** "14:05" → "2:05 PM" in the app language (Bangla digits and day period in Bangla) (specs §1.6: `h:mm a`). Empty if not a time. */
export function formatClockTime(hm: string, language: Language): string {
  const m = HM.exec(hm);
  if (!m || Number(m[1]) > 23 || Number(m[2]) > 59) return '';
  const date = new Date(2000, 0, 1, Number(m[1]), Number(m[2]));
  return localized(format(date, 'h:mm a', { locale: language === 'bn' ? bn : enGB }), language);
}

/** A timestamp as Dhaka wall-clock time, "27 Nov 2026, 2:05 PM", whatever the device's time zone. */
export function formatDhakaDateTime(timestamp: number, language: Language): string {
  const d = new Date(timestamp + DHAKA_OFFSET_MS);
  const wall = new Date(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), d.getUTCHours(), d.getUTCMinutes());
  return localized(format(wall, 'd MMM yyyy, h:mm a', { locale: language === 'bn' ? bn : enGB }), language);
}

/** A Date's local clock time as "HH:MM" (what the phone's time picker returns). */
export function hmFromDate(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
}
