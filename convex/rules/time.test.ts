import { describe, expect, it } from 'vitest';

import { DAY_MS, dhakaDate, dhakaDayStart, dhakaMidnight, dhakaMidnightAfter, dhakaMonthStart } from './time';

describe('Dhaka calendar time (UTC+6, no daylight saving)', () => {
  it('dhakaDate uses Dhaka, not UTC', () => {
    // 2026-11-27 18:30 UTC is 00:30 on the 28th in Dhaka.
    expect(dhakaDate(Date.UTC(2026, 10, 27, 18, 30))).toBe('2026-11-28');
    expect(dhakaDate(Date.UTC(2026, 10, 27, 17, 59))).toBe('2026-11-27');
  });

  it('dhakaMidnight is 18:00 UTC the day before', () => {
    expect(dhakaMidnight('2026-11-28')).toBe(Date.UTC(2026, 10, 27, 18, 0));
    expect(dhakaMidnightAfter('2026-11-28', 2)).toBe(dhakaMidnight('2026-11-28') + 2 * DAY_MS);
  });

  it('dhakaDayStart finds 00:00 of the same Dhaka day', () => {
    const lateEvening = Date.UTC(2026, 10, 28, 17, 59); // 23:59 on the 28th in Dhaka
    expect(dhakaDayStart(lateEvening)).toBe(dhakaMidnight('2026-11-28'));
    expect(dhakaDayStart(dhakaMidnight('2026-11-29'))).toBe(dhakaMidnight('2026-11-29'));
  });

  it('dhakaMonthStart finds 00:00 on the 1st in Dhaka', () => {
    expect(dhakaMonthStart(Date.UTC(2026, 10, 30, 18, 30))).toBe(dhakaMidnight('2026-12-01'));
    expect(dhakaMonthStart(Date.UTC(2026, 10, 15))).toBe(dhakaMidnight('2026-11-01'));
  });
});
