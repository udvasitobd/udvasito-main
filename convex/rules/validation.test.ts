import { describe, expect, it } from 'vitest';

import {
  ageOn,
  checkDateOfBirth,
  checkDeleteWord,
  checkName,
  checkPhone,
  checkReason,
  checkVerificationCode,
  firstNameOf,
  zPhone,
} from './validation';

describe('VAL-01 name', () => {
  it('accepts Latin and Bangla names and tidies spaces', () => {
    expect(checkName('  Rahim   Uddin ')).toEqual({ ok: true, value: 'Rahim Uddin' });
    expect(checkName('মোঃ রহিম উদ্দিন')).toMatchObject({ ok: true });
    expect(checkName("D'Costa-Gomes Jr.")).toMatchObject({ ok: true });
  });
  it.each([
    ['', 'validation.VAL-01.empty'],
    ['A', 'validation.VAL-01.short'],
    ['A'.repeat(61), 'validation.VAL-01.long'],
    ['Rahim2', 'validation.VAL-01.chars'],
    ['Rahim@', 'validation.VAL-01.chars'],
    ['রহিম৩', 'validation.VAL-01.chars'],
  ])('%j → %s', (input, key) => {
    expect(checkName(input)).toEqual({ ok: false, error: { field: 'name', messageKey: key } });
  });
  it('first name is the first word', () => {
    expect(firstNameOf(' Rahim Uddin ')).toBe('Rahim');
  });
});

describe('VAL-02 date of birth', () => {
  const today = '2026-11-27';
  it('computes age by calendar', () => {
    expect(ageOn('2008-11-27', today)).toBe(18);
    expect(ageOn('2008-11-28', today)).toBe(17);
    expect(ageOn('2008-12-01', today)).toBe(17);
  });
  it('under 18 is not a field error — it returns underage', () => {
    expect(checkDateOfBirth('2008-11-28', today, 18)).toEqual({
      ok: true,
      value: { dateOfBirth: '2008-11-28', underage: true },
    });
    expect(checkDateOfBirth('2008-11-27', today, 18)).toEqual({
      ok: true,
      value: { dateOfBirth: '2008-11-27', underage: false },
    });
  });
  it.each([
    ['', 'validation.VAL-02.empty'],
    ['2001-02-30', 'validation.VAL-02.invalid'],
    ['27/11/2000', 'validation.VAL-02.invalid'],
    ['2026-11-28', 'validation.VAL-02.invalid'],
    ['1920-01-01', 'validation.VAL-02.tooOld'],
  ])('%j → %s', (input, key) => {
    expect(checkDateOfBirth(input, today, 18)).toEqual({ ok: false, error: { field: 'dateOfBirth', messageKey: key } });
  });
});

describe('VAL-03 phone', () => {
  it('stores +880 form', () => expect(checkPhone('01712345678')).toEqual({ ok: true, value: '+8801712345678' }));
  it('empty vs invalid', () => {
    expect(checkPhone('')).toMatchObject({ ok: false, error: { messageKey: 'validation.VAL-03.empty' } });
    expect(checkPhone('123')).toMatchObject({ ok: false, error: { messageKey: 'validation.VAL-03.invalid' } });
  });
  it('zod helper uses the same rule', () => {
    expect(zPhone.parse('০১৮১২৩৪৫৬৭৮')).toBe('+8801812345678');
    expect(zPhone.safeParse('99').success).toBe(false);
  });
});

describe('VAL-18 reason, VAL-25 delete word, VAL-26 code', () => {
  it('reason 5–200', () => {
    expect(checkReason('abcd').ok).toBe(false);
    expect(checkReason('abcde').ok).toBe(true);
    expect(checkReason('x'.repeat(201)).ok).toBe(false);
  });
  it('delete word', () => {
    expect(checkDeleteWord('DELETE').ok).toBe(true);
    expect(checkDeleteWord('মুছুন').ok).toBe(true);
    expect(checkDeleteWord('delete').ok).toBe(false);
  });
  it('verification code: 6 chars, no 0/O/1/I, case-insensitive', () => {
    expect(checkVerificationCode('ab3dq9')).toEqual({ ok: true, value: 'AB3DQ9' });
    expect(checkVerificationCode('AB0DQ9').ok).toBe(false);
    expect(checkVerificationCode('ABIDQ9').ok).toBe(false);
    expect(checkVerificationCode('AB3DQ').ok).toBe(false);
  });
});
