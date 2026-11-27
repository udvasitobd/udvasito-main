/**
 * Calendar dates in Bangladesh time — pure TypeScript, no Convex imports.
 *
 * Dates people type (date of birth, last donation) are "YYYY-MM-DD" calendar dates in Asia/Dhaka. Bangladesh has kept
 * UTC+6 all year since 2009 (no daylight saving), so a fixed offset is exact and needs no time-zone database.
 */

/** Asia/Dhaka is UTC+6 all year. A time-zone fact, not a product rule. */
const DHAKA_OFFSET_MS = 6 * 60 * 60 * 1000;
export const DAY_MS = 24 * 60 * 60 * 1000;

function parts(date: string): [number, number, number] {
  return date.split('-').map(Number) as [number, number, number];
}

/** The Dhaka calendar date ("YYYY-MM-DD") of a timestamp. */
export function dhakaDate(timestamp: number): string {
  return new Date(timestamp + DHAKA_OFFSET_MS).toISOString().slice(0, 10);
}

/** The timestamp of 00:00 in Dhaka on `date` ("YYYY-MM-DD"). */
export function dhakaMidnight(date: string): number {
  const [y, m, d] = parts(date);
  return Date.UTC(y, m - 1, d) - DHAKA_OFFSET_MS;
}

/** 00:00 in Dhaka, `days` calendar days after `date`. */
export function dhakaMidnightAfter(date: string, days: number): number {
  return dhakaMidnight(date) + days * DAY_MS;
}

/** 00:00 in Dhaka on the first day of the calendar month that contains `timestamp` (for monthly limits). */
export function dhakaMonthStart(timestamp: number): number {
  const [y, m] = parts(dhakaDate(timestamp));
  return Date.UTC(y, m - 1, 1) - DHAKA_OFFSET_MS;
}

/** 00:00 in Dhaka on the calendar day that contains `timestamp` (for daily limits). */
export function dhakaDayStart(timestamp: number): number {
  return dhakaMidnight(dhakaDate(timestamp));
}
