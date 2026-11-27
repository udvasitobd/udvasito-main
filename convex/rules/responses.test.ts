import { describe, expect, it } from 'vitest';

import {
  canAnswer,
  contactExpiry,
  laterDonation,
  slotFor,
  unitsCovered,
  whyNotEligible,
  type AcceptingDonor,
} from './responses';
import { defaultSettings } from './settings';

const S = defaultSettings();
const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;
/** 27 Nov 2026, 10:00 in Dhaka. */
const NOW = Date.UTC(2026, 10, 27, 4, 0);

const donor = (overrides: Partial<AcceptingDonor> = {}): AcceptingDonor => ({
  live: true,
  bloodGroup: 'B+',
  plateletOptIn: false,
  gender: 'male',
  neverDonated: true,
  dateOfBirth: '1999-04-12',
  ...overrides,
});
const B_POS = { bloodGroup: 'B+' as const, component: 'whole_blood' as const };

describe('who may answer', () => {
  it('only a donor who has not answered yet', () => {
    expect(canAnswer('notified')).toBe(true);
    expect(canAnswer('opened')).toBe(true);
    for (const state of ['accepted', 'confirmed', 'standby', 'declined', 'withdrew', 'not_responding'] as const) {
      expect(canAnswer(state)).toBe(false);
    }
  });
});

describe('whyNotEligible (ERR_NOT_ELIGIBLE reasons, specs §6.7)', () => {
  it('a live donor of the right group, old enough and rested, may accept', () => {
    expect(whyNotEligible(donor(), B_POS, NOW, S)).toBeNull();
    expect(whyNotEligible(donor({ bloodGroup: 'O-' }), { ...B_POS, bloodGroup: 'any' }, NOW, S)).toBeNull();
  });

  it('not live, wrong or unknown group, platelets without opt-in', () => {
    expect(whyNotEligible(donor({ live: false }), B_POS, NOW, S)).toEqual({ reason: 'notLive' });
    expect(whyNotEligible(donor({ bloodGroup: 'O-' }), B_POS, NOW, S)).toEqual({ reason: 'group' });
    expect(whyNotEligible(donor({ bloodGroup: 'unknown' }), B_POS, NOW, S)).toEqual({ reason: 'group' });
    expect(whyNotEligible(donor(), { ...B_POS, bloodGroup: 'not_sure' }, NOW, S)).toEqual({ reason: 'group' });
    expect(whyNotEligible(donor(), { ...B_POS, component: 'platelets' }, NOW, S)).toEqual({ reason: 'platelets' });
    expect(whyNotEligible(donor({ plateletOptIn: true }), { ...B_POS, component: 'platelets' }, NOW, S)).toBeNull();
  });

  it('age limits and the donation interval', () => {
    expect(whyNotEligible(donor({ dateOfBirth: '2009-01-01' }), B_POS, NOW, S)).toEqual({
      reason: 'age',
      min: S.minAge,
      max: S.maxDonorAge,
    });
    expect(whyNotEligible(donor({ dateOfBirth: '1950-01-01' }), B_POS, NOW, S)?.reason).toBe('age');
    const recent = donor({ neverDonated: false, lastDonationDate: '2026-11-01', lastDonationType: 'whole_blood' });
    const result = whyNotEligible(recent, B_POS, NOW, S);
    expect(result?.reason).toBe('cooldown');
    expect(result && 'date' in result ? result.date : 0).toBeGreaterThan(NOW);
  });
});

describe('slots', () => {
  it('the first units + S-12 donors are confirmed, the rest wait on standby', () => {
    const settings = { extraConfirmedSlots: 1 };
    expect([0, 1, 2, 3].map((n) => slotFor(n, 1, settings))).toEqual(['confirmed', 'confirmed', 'standby', 'standby']);
    expect(slotFor(2, 2, settings)).toBe('confirmed');
    expect(slotFor(0, 1, { extraConfirmedSlots: 0 })).toBe('confirmed');
    expect(slotFor(1, 1, { extraConfirmedSlots: 0 })).toBe('standby');
  });

  it('units covered never count the extra slot', () => {
    expect(unitsCovered(2, 1)).toBe(1);
    expect(unitsCovered(1, 2)).toBe(1);
  });
});

describe('contactExpiry (S-17, S-18)', () => {
  it('S-18 days after close; an open request counts from its auto-close time', () => {
    const closedAt = NOW + HOUR;
    expect(contactExpiry({ neededBy: NOW, closedAt }, NOW, S)).toBe(closedAt + S.contactVisibleAfterCloseDays * DAY);
    expect(contactExpiry({ neededBy: NOW + 2 * HOUR }, NOW, S)).toBe(
      NOW + 2 * HOUR + S.autoCloseAfterNeededHours * HOUR + S.contactVisibleAfterCloseDays * DAY,
    );
    // Needed-by already passed: counted from now.
    expect(contactExpiry({ neededBy: NOW - DAY }, NOW, S)).toBe(
      NOW + S.autoCloseAfterNeededHours * HOUR + S.contactVisibleAfterCloseDays * DAY,
    );
  });
});

describe('laterDonation', () => {
  it('keeps the later date', () => {
    expect(laterDonation(undefined, '2026-11-20')).toBe('2026-11-20');
    expect(laterDonation('2026-11-25', '2026-11-20')).toBe('2026-11-25');
    expect(laterDonation('2026-10-01', '2026-11-20')).toBe('2026-11-20');
  });
});
