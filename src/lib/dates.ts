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
