import { describe, expect, it } from 'vitest';

import {
  checkComponent,
  checkNeededBy,
  checkNote,
  checkPatientName,
  checkPlace,
  checkRequestGroup,
  checkUnits,
  checkWard,
  containsPhoneNumber,
  dhakaDateTime,
  neededByFor,
  roundPoint,
  SLUG_ALPHABET,
  slugFromBytes,
  checkClientId,
  urgencyOf,
} from './request';

const HOUR = 60 * 60 * 1000;
/** 2026-11-27 10:00 in Dhaka. */
const NOW = Date.UTC(2026, 10, 27, 4, 0);
const dhaka = (y: number, m: number, d: number, h: number, min = 0) => Date.UTC(y, m - 1, d, h - 6, min);

describe('checkRequestGroup (VAL-04)', () => {
  it('accepts the 8 groups, any and not_sure', () => {
    for (const g of ['A+', 'O-', 'AB+', 'any', 'not_sure']) expect(checkRequestGroup(g).ok).toBe(true);
  });
  it('rejects empty and unknown values', () => {
    expect(checkRequestGroup(null)).toEqual({
      ok: false,
      error: { field: 'bloodGroup', messageKey: 'validation.VAL-04.empty' },
    });
    expect(checkRequestGroup('C+').ok).toBe(false);
  });
});

describe('checkComponent (VAL-05)', () => {
  it('platelets need a specific group or not sure', () => {
    expect(checkComponent('any', 'platelets')).toEqual({
      ok: false,
      error: { field: 'component', messageKey: 'validation.VAL-05.combo' },
    });
    expect(checkComponent('not_sure', 'platelets')).toEqual({ ok: true, value: 'platelets' });
    expect(checkComponent('B+', 'platelets').ok).toBe(true);
    expect(checkComponent('any', 'whole_blood').ok).toBe(true);
    expect(checkComponent('B+', 'plasma').ok).toBe(false);
  });
});

describe('checkUnits (VAL-06)', () => {
  it('whole numbers 1–10 only', () => {
    expect(checkUnits(1).ok).toBe(true);
    expect(checkUnits(10).ok).toBe(true);
    for (const n of [0, 11, 2.5, Number.NaN]) {
      expect(checkUnits(n)).toEqual({
        ok: false,
        error: { field: 'unitsNeeded', messageKey: 'validation.VAL-06.range' },
      });
    }
  });
});

describe('checkPlace (VAL-07)', () => {
  it('a hospital is enough', () => {
    expect(checkPlace({ hospitalId: 'h1' })).toEqual({ ok: true, value: {} });
  });
  it('otherwise district + thana + a 3–80 character name', () => {
    expect(checkPlace({})).toEqual({ ok: false, error: { field: 'place', messageKey: 'validation.VAL-07.empty' } });
    expect(checkPlace({ districtId: 'd', upazilaId: null, placeText: 'Ward 5' }).ok).toBe(false);
    expect(checkPlace({ districtId: 'd', upazilaId: 'u', placeText: ' ab ' })).toEqual({
      ok: false,
      error: { field: 'placeText', messageKey: 'validation.VAL-07.placeText' },
    });
    expect(checkPlace({ districtId: 'd', upazilaId: 'u', placeText: 'x'.repeat(81) }).ok).toBe(false);
    expect(checkPlace({ districtId: 'd', upazilaId: 'u', placeText: '  Max   Hospital ' })).toEqual({
      ok: true,
      value: { placeText: 'Max Hospital' },
    });
  });
});

describe('checkNeededBy (VAL-08)', () => {
  it('allows 5 minutes in the past and up to 30 days ahead', () => {
    expect(checkNeededBy(NOW - 5 * 60 * 1000, NOW).ok).toBe(true);
    expect(checkNeededBy(NOW - 5 * 60 * 1000 - 1, NOW)).toEqual({
      ok: false,
      error: { field: 'neededBy', messageKey: 'validation.VAL-08.past' },
    });
    expect(checkNeededBy(NOW + 30 * 24 * HOUR, NOW).ok).toBe(true);
    expect(checkNeededBy(NOW + 30 * 24 * HOUR + 1, NOW)).toEqual({
      ok: false,
      error: { field: 'neededBy', messageKey: 'validation.VAL-08.far' },
    });
    expect(checkNeededBy(null, NOW).ok).toBe(false);
  });
});

describe('optional texts (VAL-09, VAL-10, VAL-11)', () => {
  it('patient name: letters only, at most 60, empty is fine', () => {
    expect(checkPatientName('  ')).toEqual({ ok: true, value: undefined });
    expect(checkPatientName(' Rahima  Begum ')).toEqual({ ok: true, value: 'Rahima Begum' });
    expect(checkPatientName('রহিমা বেগম').ok).toBe(true);
    expect(checkPatientName('x'.repeat(61))).toEqual({
      ok: false,
      error: { field: 'patientName', messageKey: 'validation.VAL-09.long' },
    });
    expect(checkPatientName('Bed 12')).toEqual({
      ok: false,
      error: { field: 'patientName', messageKey: 'validation.VAL-01.chars' },
    });
  });
  it('ward: at most 40', () => {
    expect(checkWard('Ward 5, bed 12')).toEqual({ ok: true, value: 'Ward 5, bed 12' });
    expect(checkWard('x'.repeat(41)).ok).toBe(false);
  });
  it('note: no phone numbers, at most 300', () => {
    expect(checkNote('Please come to gate 2')).toEqual({ ok: true, value: 'Please come to gate 2' });
    expect(checkNote('call 017-1234-5678')).toEqual({
      ok: false,
      error: { field: 'note', messageKey: 'validation.VAL-11.phone' },
    });
    expect(checkNote('x'.repeat(301))).toEqual({
      ok: false,
      error: { field: 'note', messageKey: 'validation.VAL-11.long' },
    });
  });
});

describe('containsPhoneNumber', () => {
  it('finds mobile numbers in any common shape', () => {
    for (const text of [
      '01712345678',
      '+8801712345678',
      '8801712345678',
      '০১৭১২৩৪৫৬৭৮',
      '017 1234 5678',
      '(017)12-34-5678',
      'call me 01812.345.678 now',
    ]) {
      expect(containsPhoneNumber(text)).toBe(true);
    }
  });
  it('ignores other numbers', () => {
    for (const text of ['Ward 12, bed 7', '2 bags by 10:30', '031-123456', '0112345678', '2026-11-27']) {
      expect(containsPhoneNumber(text)).toBe(false);
    }
  });
});

describe('needed by', () => {
  it('Now = in 2 hours; Today = 23:59, or in 2 hours late at night; Tomorrow = 12:00', () => {
    expect(neededByFor('now', NOW)).toBe(NOW + 2 * HOUR);
    expect(neededByFor('today', NOW)).toBe(dhaka(2026, 11, 27, 23, 59));
    const lateNight = dhaka(2026, 11, 27, 22, 30);
    expect(neededByFor('today', lateNight)).toBe(lateNight + 2 * HOUR);
    expect(neededByFor('tomorrow', NOW)).toBe(dhaka(2026, 11, 28, 12));
  });

  it('urgency: within 2 hours → now; later today → today; else later', () => {
    expect(urgencyOf(NOW + 2 * HOUR, NOW)).toBe('now');
    expect(urgencyOf(neededByFor('today', NOW), NOW)).toBe('today');
    expect(urgencyOf(neededByFor('today', dhaka(2026, 11, 27, 22, 30)), dhaka(2026, 11, 27, 22, 30))).toBe('now');
    expect(urgencyOf(neededByFor('tomorrow', NOW), NOW)).toBe('later');
  });

  it('a picked date and time is read in Dhaka time', () => {
    expect(dhakaDateTime('2026-11-28', '09:30')).toBe(dhaka(2026, 11, 28, 9, 30));
    expect(dhakaDateTime('2026-11-28', '24:00')).toBeNull();
    expect(dhakaDateTime('28/11/2026', '09:30')).toBeNull();
    expect(dhakaDateTime('2026-11-28', '')).toBeNull();
  });
});

describe('roundPoint', () => {
  it('keeps 3 decimals', () => {
    expect(roundPoint({ lat: 22.359812, lng: 91.821234 })).toEqual({ lat: 22.36, lng: 91.821 });
  });
});

describe('slugFromBytes', () => {
  it('10 characters from the slug alphabet', () => {
    const slug = slugFromBytes(new Uint8Array([0, 31, 32, 255, 7, 8, 9, 10, 11, 12, 99]));
    expect(slug).toHaveLength(10);
    expect(slug.startsWith('a9a9')).toBe(true);
    expect([...slug].every((c) => SLUG_ALPHABET.includes(c))).toBe(true);
    expect(() => slugFromBytes(new Uint8Array(9))).toThrow();
  });
});

describe('checkClientId', () => {
  it('accepts a UUID, refuses junk', () => {
    expect(checkClientId('3f1c2a9e-8b7d-4c6e-9f00-1a2b3c4d5e6f').ok).toBe(true);
    expect(checkClientId('short').ok).toBe(false);
    expect(checkClientId('has space in it').ok).toBe(false);
  });
});
