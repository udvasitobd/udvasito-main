import { describe, expect, it } from 'vitest';

import { canDonate, computeEligibility, type DonationHistory } from './eligibility';
import { defaultSettings } from './settings';
import { dhakaDate, dhakaMidnight, dhakaMidnightAfter, dhakaMonthStart } from './time';

const S = defaultSettings();
/** 10:00 in Dhaka on a calendar date. */
const at = (date: string, hour = 10) => dhakaMidnight(date) + hour * 3_600_000;
const never: DonationHistory = { gender: 'male', neverDonated: true };
const donated = (gender: DonationHistory['gender'], date: string, type?: 'whole_blood' | 'platelets'): DonationHistory => ({
  gender,
  neverDonated: false,
  lastDonationDate: date,
  ...(type ? { lastDonationType: type } : {}),
});

describe('time helpers (Asia/Dhaka, UTC+6)', () => {
  it('turns timestamps into Dhaka dates across midnight', () => {
    expect(dhakaDate(Date.UTC(2026, 10, 27, 17, 59))).toBe('2026-11-27'); // 23:59 Dhaka
    expect(dhakaDate(Date.UTC(2026, 10, 27, 18, 0))).toBe('2026-11-28'); // 00:00 Dhaka
  });

  it('gives Dhaka midnight and adds calendar days across months and years', () => {
    expect(new Date(dhakaMidnight('2026-11-28')).toISOString()).toBe('2026-11-27T18:00:00.000Z');
    expect(dhakaDate(dhakaMidnightAfter('2026-12-20', 14))).toBe('2027-01-03');
  });

  it('finds the start of the Dhaka month', () => {
    expect(dhakaMonthStart(at('2026-11-30', 23))).toBe(dhakaMidnight('2026-11-01'));
    expect(dhakaMonthStart(Date.UTC(2026, 10, 30, 18, 30))).toBe(dhakaMidnight('2026-12-01')); // 00:30 Dhaka, 1 Dec
  });
});

describe('computeEligibility (specs §5.4)', () => {
  it('never donated → eligible now for both', () => {
    expect(computeEligibility(never, S)).toEqual({ eligibleFrom: 0, eligibleFromPlatelets: 0 });
    expect(computeEligibility({ gender: 'female', neverDonated: false }, S)).toEqual({ eligibleFrom: 0, eligibleFromPlatelets: 0 });
  });

  it.each([
    ['male', S.intervalWholeMaleDays],
    ['female', S.intervalWholeOtherDays],
    ['other', S.intervalWholeOtherDays],
    ['unspecified', S.intervalWholeOtherDays],
  ] as const)('after whole blood, a %s donor waits %i days for whole blood and for platelets', (gender, days) => {
    const result = computeEligibility(donated(gender, '2026-09-01', 'whole_blood'), S);
    expect(result.eligibleFrom).toBe(dhakaMidnightAfter('2026-09-01', days));
    expect(result.eligibleFromPlatelets).toBe(dhakaMidnightAfter('2026-09-01', days));
  });

  it('after platelets: platelets again after S-06, whole blood after S-07', () => {
    const result = computeEligibility(donated('female', '2026-11-10', 'platelets'), S);
    expect(result.eligibleFromPlatelets).toBe(dhakaMidnightAfter('2026-11-10', S.intervalPlateletDays));
    expect(result.eligibleFrom).toBe(dhakaMidnightAfter('2026-11-10', S.intervalPlateletToWholeDays));
  });

  it('a date without a type counts as whole blood (the longer interval)', () => {
    expect(computeEligibility(donated('male', '2026-09-01'), S).eligibleFrom).toBe(
      dhakaMidnightAfter('2026-09-01', S.intervalWholeMaleDays),
    );
  });

  it('reads every interval from settings, never a typed number', () => {
    const custom = { ...S, intervalWholeMaleDays: 56, intervalWholeOtherDays: 100, intervalPlateletDays: 7, intervalPlateletToWholeDays: 30 };
    expect(computeEligibility(donated('male', '2026-01-01', 'whole_blood'), custom).eligibleFrom).toBe(dhakaMidnightAfter('2026-01-01', 56));
    expect(computeEligibility(donated('other', '2026-01-01', 'whole_blood'), custom).eligibleFrom).toBe(dhakaMidnightAfter('2026-01-01', 100));
    const p = computeEligibility(donated('male', '2026-01-01', 'platelets'), custom);
    expect(p).toEqual({ eligibleFrom: dhakaMidnightAfter('2026-01-01', 30), eligibleFromPlatelets: dhakaMidnightAfter('2026-01-01', 7) });
  });
});

describe('canDonate — age (PRD §5.1: 18–65 from the date of birth)', () => {
  const now = at('2026-11-27');
  it.each([
    ['17 (turns 18 tomorrow)', '2008-11-28', { ok: false, reason: 'too_young' }],
    ['18 today', '2008-11-27', { ok: true }],
    ['65', '1961-06-01', { ok: true }],
    ['65 (turns 66 tomorrow)', '1960-11-28', { ok: true }],
    ['66 today', '1960-11-27', { ok: false, reason: 'too_old' }],
  ])('%s', (_, dob, expected) => {
    expect(canDonate(never, 'whole_blood', now, S, dob)).toEqual(expected);
  });

  it('uses the Dhaka date: just after midnight in Dhaka is already the birthday', () => {
    const justAfterDhakaMidnight = dhakaMidnight('2026-11-27') + 60_000; // still 26 Nov in UTC
    expect(canDonate(never, 'whole_blood', justAfterDhakaMidnight, S, '2008-11-27')).toEqual({ ok: true });
  });

  it('follows maxDonorAge from settings', () => {
    expect(canDonate(never, 'whole_blood', now, { ...S, maxDonorAge: 70 }, '1960-11-27')).toEqual({ ok: true });
  });
});

describe('canDonate — intervals (PRD §5.1)', () => {
  const dob = '1995-03-15';

  it.each([
    ['man, whole blood 89 days ago', donated('male', '2026-08-30', 'whole_blood'), 'whole_blood', '2026-11-27', false],
    ['man, whole blood 90 days ago', donated('male', '2026-08-29', 'whole_blood'), 'whole_blood', '2026-11-27', true],
    ['woman, whole blood 119 days ago', donated('female', '2026-07-31', 'whole_blood'), 'whole_blood', '2026-11-27', false],
    ['woman, whole blood 120 days ago', donated('female', '2026-07-30', 'whole_blood'), 'whole_blood', '2026-11-27', true],
    ['platelets 13 days ago → platelets', donated('male', '2026-11-14', 'platelets'), 'platelets', '2026-11-27', false],
    ['platelets 14 days ago → platelets', donated('male', '2026-11-13', 'platelets'), 'platelets', '2026-11-27', true],
    ['platelets 13 days ago → whole blood', donated('female', '2026-11-14', 'platelets'), 'whole_blood', '2026-11-27', false],
    ['platelets 14 days ago → whole blood', donated('female', '2026-11-13', 'platelets'), 'whole_blood', '2026-11-27', true],
    ['man, whole blood 30 days ago → platelets', donated('male', '2026-10-28', 'whole_blood'), 'platelets', '2026-11-27', false],
    ['man, whole blood 90 days ago → platelets', donated('male', '2026-08-29', 'whole_blood'), 'platelets', '2026-11-27', true],
    ['never donated → platelets', never, 'platelets', '2026-11-27', true],
  ] as const)('%s', (_, donor, component, today, ok) => {
    const result = canDonate(donor, component, at(today), S, dob);
    expect(result.ok).toBe(ok);
    if (!result.ok) {
      expect(result.reason).toBe('interval');
      const { eligibleFrom, eligibleFromPlatelets } = computeEligibility(donor, S);
      expect(result.date).toBe(component === 'platelets' ? eligibleFromPlatelets : eligibleFrom);
    }
  });

  it('becomes eligible exactly at 00:00 Dhaka time on the first allowed day', () => {
    const donor = donated('male', '2026-08-29', 'whole_blood');
    const from = dhakaMidnightAfter('2026-08-29', S.intervalWholeMaleDays);
    expect(canDonate(donor, 'whole_blood', from - 1, S, dob)).toEqual({ ok: false, reason: 'interval', date: from });
    expect(canDonate(donor, 'whole_blood', from, S, dob)).toEqual({ ok: true });
  });

  it('checks age before the interval', () => {
    expect(canDonate(donated('male', '2026-11-20', 'whole_blood'), 'whole_blood', at('2026-11-27'), S, '2010-01-01')).toEqual({
      ok: false,
      reason: 'too_young',
    });
  });
});
