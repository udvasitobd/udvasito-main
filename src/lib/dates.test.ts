import { describe, expect, it } from 'vitest';

import { addYears, dateFromYmd, formatCalendarDate, formatDhakaDate, toBanglaDigits, todayInDhaka, ymdFromDate } from './dates';

describe('dates (specs §1.6 rule 3)', () => {
  it('formats a calendar date as d MMM yyyy, with Bangla digits in Bangla', () => {
    expect(formatCalendarDate('2001-05-20', 'en')).toBe('20 May 2001');
    expect(formatCalendarDate('2001-05-20', 'bn')).toBe('২০ মে ২০০১');
    expect(formatCalendarDate('not-a-date', 'en')).toBe('');
  });

  it('round-trips YYYY-MM-DD through a local date', () => {
    for (const ymd of ['2001-01-01', '2024-02-29', '1970-12-31']) {
      const date = dateFromYmd(ymd);
      expect(date && ymdFromDate(date)).toBe(ymd);
    }
    expect(dateFromYmd('2001-5-20')).toBeNull();
  });

  it('uses the Dhaka day for timestamps', () => {
    expect(todayInDhaka(Date.UTC(2026, 10, 27, 18, 30))).toBe('2026-11-28'); // 00:30 in Dhaka
    expect(formatDhakaDate(Date.UTC(2026, 10, 27, 18, 30), 'en')).toBe('28 Nov 2026');
  });

  it('moves by whole years, keeping 29 February valid', () => {
    expect(addYears('2026-11-27', -25)).toBe('2001-11-27');
    expect(addYears('2024-02-29', -1)).toBe('2023-02-28');
  });

  it('converts digits only', () => {
    expect(toBanglaDigits('B+ 2 units, 10:30')).toBe('B+ ২ units, ১০:৩০');
  });
});
