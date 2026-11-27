import { describe, expect, it } from 'vitest';

import { hospitalSearchText, splitAliases } from './hospitals';

describe('splitAliases', () => {
  it('splits on ;, trims, drops empties and case-insensitive repeats', () => {
    expect(splitAliases(' CMCH ; চমেক;;Chittagong  Medical; cmch ;')).toEqual(['CMCH', 'চমেক', 'Chittagong Medical']);
  });

  it('returns nothing for an empty column', () => {
    expect(splitAliases('')).toEqual([]);
    expect(splitAliases(' ; ')).toEqual([]);
  });
});

describe('hospitalSearchText', () => {
  it('joins lower-case names and aliases once each', () => {
    expect(hospitalSearchText('Chittagong Medical College Hospital', 'চট্টগ্রাম মেডিকেল কলেজ হাসপাতাল', ['CMCH', 'চমেক', 'cmch'])).toBe(
      'chittagong medical college hospital চট্টগ্রাম মেডিকেল কলেজ হাসপাতাল cmch চমেক',
    );
  });

  it('collapses spaces and skips empty terms', () => {
    expect(hospitalSearchText('  A   B ', '', [' '])).toBe('a b');
  });
});
