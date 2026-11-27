import { describe, expect, it } from 'vitest';

import { formatDhakaDeadline } from '../../src/lib/dates';

import { componentText, donorAlertText, fill, groupText, kmText, noLongerNeededText } from './alertText';

/** 27 Nov 2026, 10:00 in Dhaka. */
const NOW = Date.UTC(2026, 10, 27, 4, 0);
const NOON = Date.UTC(2026, 10, 27, 6, 0);

describe('alert words (specs §6.8)', () => {
  it('fills placeholders and leaves unknown ones visible', () => {
    expect(fill('{{a}} and {{b}}', { a: '1' })).toBe('1 and {{b}}');
  });

  it('writes groups as on the chips, components and distances in the reader’s language', () => {
    expect(groupText('A-', 'en')).toBe('A−');
    expect(groupText('any', 'bn')).toBe('যেকোনো গ্রুপ (রিপ্লেসমেন্ট ডোনার)');
    expect(componentText('platelets', 'en')).toBe('Platelets');
    expect(componentText('whole_blood', 'bn')).toBe('সম্পূর্ণ রক্ত');
    expect(kmText(3.24, 'en')).toBe('3.2');
    expect(kmText(12.6, 'en')).toBe('13');
    expect(kmText(3.24, 'bn')).toBe('৩.২');
  });

  it('NTF-01 in English, urgent', () => {
    const text = donorAlertText(
      {
        urgency: 'now',
        bloodGroup: 'B+',
        component: 'whole_blood',
        place: 'Chattogram Medical College Hospital',
        units: 2,
        neededBy: NOON,
        km: 3.24,
      },
      'en',
      NOW,
    );
    expect(text).toEqual({
      title: 'URGENT · B+ Whole blood needed · Chattogram Medical College Hospital',
      body: '2 bag(s) by 12:00 PM · 3.2 km. Tap to answer.',
    });
  });

  it('NTF-01 in Bangla, not urgent, another day', () => {
    const tomorrow = NOON + 24 * 60 * 60 * 1000;
    const text = donorAlertText(
      {
        urgency: 'later',
        bloodGroup: 'O-',
        component: 'platelets',
        place: 'চমেক',
        units: 1,
        neededBy: tomorrow,
        km: 12,
      },
      'bn',
      NOW,
    );
    expect(text.title).toBe('O− প্লাটিলেট প্রয়োজন · চমেক');
    expect(text.body).toBe(
      `১ ব্যাগ, ${formatDhakaDeadline(tomorrow, NOW, 'bn')}-এর মধ্যে · ১২ কিমি। উত্তর দিতে ট্যাপ করুন।`,
    );
    expect(text.body).not.toMatch(/[0-9]|\{\{/);
  });

  it('NTF-09 names the group and the place, in the donor’s language', () => {
    expect(noLongerNeededText('AB-', 'Chattogram Medical College Hospital', 'fulfilled', 'en')).toEqual({
      title: 'No longer needed — thank you',
      body: 'The AB− request at Chattogram Medical College Hospital has been arranged.',
    });
    expect(noLongerNeededText('B+', 'চমেক', 'fulfilled', 'bn').body).toBe('চমেক-এর B+ অনুরোধটির ব্যবস্থা হয়ে গেছে।');
  });

  it('NTF-09 after "No longer needed" does not say it was arranged (Q-023)', () => {
    expect(noLongerNeededText('O+', 'Parkview Hospital', 'not_needed', 'en')).toEqual({
      title: 'No longer needed — thank you',
      body: 'The O+ request at Parkview Hospital is no longer needed. Thank you for being ready.',
    });
    expect(noLongerNeededText('O+', 'চমেক', 'not_needed', 'bn').body).toBe(
      'চমেক-এর O+ অনুরোধটির আর প্রয়োজন নেই। প্রস্তুত থাকার জন্য ধন্যবাদ।',
    );
  });
});
