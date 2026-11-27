import { describe, expect, it } from 'vitest';

import { intlLocale, pickLanguage } from './language';

describe('pickLanguage (F-104)', () => {
  it('defaults to English', () => {
    expect(pickLanguage({})).toBe('en');
    expect(pickLanguage({ deviceLanguages: ['en-US', 'hi-IN'] })).toBe('en');
  });
  it('uses Bangla when the device is Bangla', () => {
    expect(pickLanguage({ deviceLanguages: ['bn-BD'] })).toBe('bn');
    expect(pickLanguage({ deviceLanguages: [null, 'en-GB', 'bn'] })).toBe('bn');
    expect(pickLanguage({ deviceLanguages: ['bn_IN'] })).toBe('bn');
  });
  it('does not mistake other languages for Bangla', () => {
    expect(pickLanguage({ deviceLanguages: ['bnx', 'br-FR'] })).toBe('en');
  });
  it('the person’s own pick beats the device language', () => {
    expect(pickLanguage({ stored: 'en', deviceLanguages: ['bn-BD'] })).toBe('en');
    expect(pickLanguage({ stored: 'bn', deviceLanguages: ['en-US'] })).toBe('bn');
  });
  it('a shared link keeps its language', () => {
    expect(pickLanguage({ urlLang: 'bn', stored: 'en' })).toBe('bn');
    expect(pickLanguage({ urlLang: 'EN', stored: 'bn' })).toBe('en');
  });
  it('ignores unknown values', () => {
    expect(pickLanguage({ urlLang: 'fr', stored: 'xx', deviceLanguages: ['bn'] })).toBe('bn');
  });
  it('formats numbers with Bangla digits in Bangla', () => {
    expect(intlLocale('bn')).toBe('bn-BD');
    expect(new Intl.NumberFormat(intlLocale('bn')).format(15)).toBe('১৫');
    expect(new Intl.NumberFormat(intlLocale('en')).format(15)).toBe('15');
  });
});
