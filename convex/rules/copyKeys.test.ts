/**
 * Every message key the backend can return exists in both dictionaries (specs §6.7 errors, §4 validation).
 */
import { describe, expect, it } from 'vitest';

import en from '../../src/i18n/en.json';
import bn from '../../src/i18n/bn.json';
import { ERROR_CODES } from '../_lib/errors';

const dictionaries = { en: en as Record<string, string>, bn: bn as Record<string, string> };

describe('backend message keys exist in en.json and bn.json', () => {
  it.each(ERROR_CODES)('errors.%s', (code) => {
    expect(dictionaries.en[`errors.${code}`]).toBeTruthy();
    expect(dictionaries.bn[`errors.${code}`]).toBeTruthy();
  });

  it.each([
    'validation.VAL-01.empty',
    'validation.VAL-01.short',
    'validation.VAL-01.long',
    'validation.VAL-01.chars',
    'validation.VAL-02.empty',
    'validation.VAL-02.invalid',
    'validation.VAL-02.tooOld',
    'validation.VAL-03.empty',
    'validation.VAL-03.invalid',
    'validation.VAL-18.invalid',
    'validation.VAL-19.invalid',
    'validation.VAL-25.invalid',
    'validation.VAL-26.invalid',
    'validation.summary',
  ])('%s', (key) => {
    expect(dictionaries.en[key]).toBeTruthy();
    expect(dictionaries.bn[key]).toBeTruthy();
  });
});
