import { describe, expect, it } from 'vitest';

import { matchesSearch, normaliseSearch } from './search';

describe('matchesSearch', () => {
  const kotwali = ['Kotwali', 'কোতোয়ালী'];

  it('matches English or Bangla, ignoring case and extra spaces', () => {
    expect(matchesSearch('kot', kotwali)).toBe(true);
    expect(matchesSearch('  KOTW ', kotwali)).toBe(true);
    expect(matchesSearch('কোতো', kotwali)).toBe(true);
    expect(matchesSearch('pahartali', kotwali)).toBe(false);
  });

  it('every word must appear', () => {
    expect(matchesSearch('cox bazar', ["Cox's Bazar", 'কক্সবাজার'])).toBe(true);
    expect(matchesSearch('cox ctg', ["Cox's Bazar"])).toBe(false);
  });

  it('an empty query matches everything; Bangla digits count as Latin', () => {
    expect(matchesSearch('', kotwali)).toBe(true);
    expect(normaliseSearch('Ward ১২')).toBe('ward 12');
  });
});
