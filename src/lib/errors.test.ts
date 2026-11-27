import type { TFunction } from 'i18next';
import { describe, expect, it } from 'vitest';

import bn from '@/i18n/bn.json';
import en from '@/i18n/en.json';

import { errorMessage, errorText } from './errors';

describe('errorMessage', () => {
  it('maps a ConvexError code to errors.<CODE> with params', () => {
    expect(errorMessage({ data: { code: 'ERR_RATE_LIMITED', params: { minutes: 3 } } })).toEqual({
      code: 'ERR_RATE_LIMITED',
      key: 'errors.ERR_RATE_LIMITED',
      params: { minutes: 3 },
    });
  });
  it('prefers a field-level message key', () => {
    expect(errorMessage({ data: { code: 'ERR_VALIDATION', messageKey: 'validation.VAL-03.invalid' } }).key).toBe(
      'validation.VAL-03.invalid',
    );
  });
  it('anything else is ERR_INTERNAL', () => {
    expect(errorMessage(new Error('Network down')).key).toBe('errors.ERR_INTERNAL');
    expect(errorMessage({ data: { code: 'drop table' } }).code).toBe('ERR_INTERNAL');
    expect(errorMessage(null).code).toBe('ERR_INTERNAL');
  });
});

describe('errorText', () => {
  const translator = (dictionary: Record<string, string>): TFunction =>
    ((key: string, params: Record<string, string | number> = {}) =>
      (dictionary[key] ?? key).replace(/\{\{(\w+)\}\}/g, (_, name: string) =>
        String(params[name] ?? ''),
      )) as unknown as TFunction;

  it('fills {{reason}} from the ↳ reason rows, with the date in the reader’s language', () => {
    const cooldown = errorMessage({
      data: { code: 'ERR_NOT_ELIGIBLE', params: { reason: 'cooldown', date: '2027-02-19' } },
    });
    expect(errorText(cooldown, translator(en), 'en')).toBe(
      "You can't donate for this request right now: you can donate again from 19 Feb 2027.",
    );
    expect(errorText(cooldown, translator(bn), 'bn')).toBe(
      'এখন এই অনুরোধে রক্ত দিতে পারবেন না: ১৯ ফেব্রু ২০২৭ থেকে আবার দিতে পারবেন।',
    );
    const age = errorMessage({ data: { code: 'ERR_NOT_ELIGIBLE', params: { reason: 'age', min: 18, max: 65 } } });
    expect(errorText(age, translator(bn), 'bn')).toBe('এখন এই অনুরোধে রক্ত দিতে পারবেন না: রক্তদাতার বয়সসীমা ১৮–৬৫ বছর।');
  });

  it('a message without a reason is translated as it is', () => {
    expect(errorText(errorMessage(null), translator(en), 'en')).toBe(en['errors.ERR_INTERNAL']);
  });
});
