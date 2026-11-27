import { describe, expect, it, vi } from 'vitest';

vi.mock('@react-native-async-storage/async-storage', () => ({ default: {} }));
vi.mock('expo-linking', () => ({}));

const { campaignFromUrl } = await import('./campaign');

describe('campaignFromUrl (V07 ?c= capture)', () => {
  it.each([
    ['https://udvasito.com/?c=CU-DRIVE-1', 'CU-DRIVE-1'],
    ['https://udvasito.com/sign-in?next=%2Fhome&c=cuet_2026', 'cuet_2026'],
    ['udvasito://welcome?c=CMC', 'CMC'],
    ['https://udvasito.com/?c=%20CMC%20#top', 'CMC'],
  ])('%s → %s', (url, code) => {
    expect(campaignFromUrl(url)).toBe(code);
  });

  it.each([
    [null],
    ['https://udvasito.com/'],
    ['https://udvasito.com/?c='],
    ['https://udvasito.com/?c=<script>'],
    ['https://udvasito.com/?c=' + 'A'.repeat(33)],
    ['https://udvasito.com/#?c=CMC'],
  ])('%s → nothing', (url) => {
    expect(campaignFromUrl(url)).toBeNull();
  });
});
