import { describe, expect, it } from 'vitest';

import { normalisePhone, phoneLast4, toLatinDigits } from './phone';

describe('normalisePhone (VAL-03)', () => {
  it.each([
    ['01712345678', '+8801712345678'],
    ['8801712345678', '+8801712345678'],
    ['+8801712345678', '+8801712345678'],
    ['017-1234-5678', '+8801712345678'],
    ['(017) 1234 5678', '+8801712345678'],
    ['০১৭১২৩৪৫৬৭৮', '+8801712345678'],
    ['+৮৮০১৯১২৩৪৫৬৭৮', '+8801912345678'],
    ['01312345678', '+8801312345678'],
  ])('%s → %s', (input, stored) => {
    expect(normalisePhone(input)).toEqual({ ok: true, phone: stored });
  });

  it.each(['', '   ', null, undefined])('empty: %j', (input) => {
    expect(normalisePhone(input)).toEqual({ ok: false, reason: 'empty' });
  });

  it.each(['01212345678', '0171234567', '017123456789', '1712345678', '+9101712345678', 'abc', '02-9876543'])(
    'invalid: %s',
    (input) => {
      expect(normalisePhone(input)).toEqual({ ok: false, reason: 'invalid' });
    },
  );

  it('converts Bangla digits', () => {
    expect(toLatinDigits('০১২৩৪৫৬৭৮৯ x')).toBe('0123456789 x');
  });

  it('shows only the last four digits', () => {
    expect(phoneLast4('+8801712345678')).toBe('5678');
  });
});
