import { describe, expect, it } from 'vitest';

import { notLiveReasons, shownNotLiveReason, type LiveFacts } from './donor';
import { dhakaMidnight } from './time';

const NOW = dhakaMidnight('2026-11-27') + 10 * 3_600_000;
const RULES = {
  minAge: 18,
  maxDonorAge: 65,
  consentVersion: '2026-11-28-pilot',
} as const;
const LIVE: LiveFacts = {
  phoneVerified: true,
  profileStatus: 'active',
  dateOfBirth: '2000-01-01',
  bloodGroup: 'O+',
  hidden: false,
  healthConsentVersion: '2026-11-28-pilot',
};

describe('notLiveReasons (specs §5.4)', () => {
  it('a verified, consenting adult with a known group is live', () => {
    expect(notLiveReasons(LIVE, NOW, RULES)).toEqual([]);
  });

  it('lists every reason, in the Donate tab order', () => {
    const facts: LiveFacts = {
      phoneVerified: false,
      profileStatus: 'frozen',
      dateOfBirth: '1950-01-01',
      bloodGroup: 'unknown',
      hidden: true,
      healthConsentVersion: 'old',
    };
    expect(notLiveReasons(facts, NOW, RULES)).toEqual(['phone', 'consent', 'group', 'hidden', 'status', 'age']);
  });

  it('age 18 to 65 inclusive, on the Dhaka date', () => {
    expect(notLiveReasons({ ...LIVE, dateOfBirth: '2008-11-27' }, NOW, RULES)).toEqual([]);
    expect(notLiveReasons({ ...LIVE, dateOfBirth: '2008-11-28' }, NOW, RULES)).toEqual(['age']);
    expect(notLiveReasons({ ...LIVE, dateOfBirth: '1961-01-01' }, NOW, RULES)).toEqual([]);
    expect(notLiveReasons({ ...LIVE, dateOfBirth: '1960-11-27' }, NOW, RULES)).toEqual(['age']);
  });

  it('a new consent version makes the donor not live until they accept it again', () => {
    expect(notLiveReasons(LIVE, NOW, { ...RULES, consentVersion: '2027-01-01' })).toEqual(['consent']);
  });
});

describe('shownNotLiveReason', () => {
  it('the first reason the Donate tab explains', () => {
    expect(shownNotLiveReason([])).toBeNull();
    expect(shownNotLiveReason(['hidden', 'group', 'phone'])).toBe('group');
    expect(shownNotLiveReason(['status', 'age'])).toBeNull();
  });
});
