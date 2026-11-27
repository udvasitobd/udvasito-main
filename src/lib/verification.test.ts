import { describe, expect, it } from 'vitest';

import { aroundValue, availableMethods, canVerify, splitSteps } from './verification';

const config = (inPerson: boolean, telegramBot = '') => ({
  verification: { telegram: true, whatsapp: false, inPerson, telegramBot, whatsappNumber: '' },
});

describe('availableMethods / canVerify', () => {
  it('in person follows the setting', () => {
    expect(availableMethods(config(true))).toEqual({ inPerson: true, telegram: false });
    expect(canVerify(config(true))).toBe(true);
    expect(availableMethods(config(false))).toEqual({ inPerson: false, telegram: false });
    expect(canVerify(config(false))).toBe(false);
  });

  it('offers nothing while the config is loading', () => {
    expect(canVerify(undefined)).toBe(false);
  });

  it('Telegram stays hidden until it is built, even with a bot name', () => {
    expect(availableMethods(config(false, 'udvasito_bot')).telegram).toBe(false);
  });
});

describe('splitSteps', () => {
  it('splits English steps', () => {
    expect(splitSteps('1. Show this code. 2. Call their phone — free. 3. They confirm.')).toEqual([
      '1. Show this code.',
      '2. Call their phone — free.',
      '3. They confirm.',
    ]);
  });

  it('splits Bangla steps', () => {
    expect(splitSteps('১. কোড দেখান। ২. কল দিন। ৩. নিশ্চিত করুন।')).toEqual(['১. কোড দেখান।', '২. কল দিন।', '৩. নিশ্চিত করুন।']);
  });

  it('keeps text without steps whole', () => {
    expect(splitSteps('Just one line')).toEqual(['Just one line']);
  });
});

describe('aroundValue', () => {
  it('splits a sentence around the marker', () => {
    expect(aroundValue('Your code: @@ (valid for 10 minutes)', '@@')).toEqual(['Your code:', '(valid for 10 minutes)']);
    expect(aroundValue('আপনার কোড: @@ (১০ মিনিট পর্যন্ত বৈধ)', '@@')).toEqual(['আপনার কোড:', '(১০ মিনিট পর্যন্ত বৈধ)']);
  });

  it('returns the sentence when the marker is missing', () => {
    expect(aroundValue('No marker', '@@')).toEqual(['No marker', '']);
  });
});
