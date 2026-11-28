import { describe, expect, it, vi } from 'vitest';

import { appFontsLoaded } from './fonts';

vi.mock('expo-font', () => ({ isLoaded: () => false }));

describe('appFontsLoaded', () => {
  it('is true only when all six Noto faces are loaded', () => {
    expect(appFontsLoaded(() => true)).toBe(true);
    expect(appFontsLoaded((face) => face !== 'NotoSansBengali_700Bold')).toBe(false);
    expect(appFontsLoaded()).toBe(false);
  });
});
