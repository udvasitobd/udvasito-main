import type { TFunction } from 'i18next';
import { describe, expect, it } from 'vitest';

import bnJson from '@/i18n/bn.json';
import enJson from '@/i18n/en.json';
import { formatDhakaDeadline } from '@/lib/dates';

import {
  componentWords,
  deadlineWords,
  distanceWords,
  groupWords,
  requestTitle,
  timeLeft,
  trackRecordWords,
  unitsWords,
} from './words';

const en: Record<string, string> = enJson;
const bnCopy: Record<string, string> = bnJson;
/** Enough of i18next for these tests: {{name}} and the `_one` / `_other` plural forms. */
const tFor = (copy: Record<string, string>): TFunction =>
  ((key: string, params: Record<string, string | number> = {}) => {
    const plural = typeof params.count === 'number' ? `${key}_${params.count === 1 ? 'one' : 'other'}` : key;
    return (copy[plural] ?? copy[key] ?? key).replace(/\{\{(\w+)\}\}/g, (_m, name: string) =>
      String(params[name] ?? ''),
    );
  }) as unknown as TFunction;

const NOW = Date.UTC(2026, 10, 27, 4, 0); // 10:00 in Dhaka
const HOUR = 60 * 60 * 1000;

describe('request words', () => {
  it('groups and components as on the chips, in each language', () => {
    expect(groupWords('O-', tFor(en))).toBe('O−');
    expect(groupWords('any', tFor(bnCopy))).toBe(bnCopy['blood.any']);
    expect(componentWords('platelets', tFor(en))).toBe('Platelets');
    expect(requestTitle({ bloodGroup: 'B+', component: 'whole_blood' }, tFor(en))).toBe('B+ Whole blood needed');
    expect(requestTitle({ bloodGroup: 'AB-', component: 'platelets' }, tFor(bnCopy))).toBe('AB− প্লাটিলেট প্রয়োজন');
  });

  it('distance with Bangla digits in Bangla', () => {
    expect(distanceWords(2.2, 'en', tFor(en))).toBe('2.2 km away');
    expect(distanceWords(12, 'bn', tFor(bnCopy))).toBe('১২ কিমি দূরে');
  });

  it('deadline with the time left, and only the deadline once it has passed', () => {
    const by = formatDhakaDeadline(NOW + 2 * HOUR, NOW, 'en');
    expect(deadlineWords(NOW + 2 * HOUR, NOW, 'en', tFor(en))).toBe(`Needed by ${by} · in 2 hours`);
    expect(deadlineWords(NOW - HOUR, NOW, 'en', tFor(en))).toBe(
      `Needed by ${formatDhakaDeadline(NOW - HOUR, NOW, 'en')}`,
    );
    expect(timeLeft(NOW + 45 * 60 * 1000, NOW, 'bn')).toMatch(/^৪৫ মিনিট/);
    expect(timeLeft(NOW, NOW, 'en')).toBeNull();
  });

  it('bags and the requester’s track record, with Bangla digits in Bangla', () => {
    expect(unitsWords(1, 'en', tFor(en))).toBe('1 bag');
    expect(unitsWords(3, 'en', tFor(en))).toBe('3 bags');
    expect(unitsWords(2, 'bn', tFor(bnCopy))).toBe('২ ব্যাগ');
    const record = { memberSince: Date.UTC(2026, 0, 3, 6), requests: 2, donations: 1 };
    expect(trackRecordWords(record, 'en', tFor(en))).toBe(
      'Requester: member since 3 Jan 2026 · 2 requests · 1 donations confirmed',
    );
    expect(trackRecordWords(record, 'bn', tFor(bnCopy))).toMatch(
      /^অনুরোধকারী: ৩ .+ ২০২৬ থেকে সদস্য · ২টি অনুরোধ · ১টি রক্তদান নিশ্চিত$/,
    );
  });
});
