import { describe, expect, it } from 'vitest';

import { defaultSettings } from './settings';
import { nextWaveSize } from './waves';

const S = defaultSettings(); // S-08 [10, 25, 50], S-10 3 waves

describe('nextWaveSize (PRD §5.4)', () => {
  it('uses the S-08 size of each wave', () => {
    expect([1, 2, 3].map((wave) => nextWaveSize(wave, 0, S))).toEqual(S.waveSizes.slice(0, 3));
  });

  it('subtracts donors who opened but have not answered, never below 0', () => {
    expect(nextWaveSize(2, 5, S)).toBe(S.waveSizes[1]! - 5);
    expect(nextWaveSize(1, 999, S)).toBe(0);
    expect(nextWaveSize(1, -3, S)).toBe(S.waveSizes[0]);
  });

  it('is 0 outside waves 1…S-10', () => {
    expect(nextWaveSize(0, 0, S)).toBe(0);
    expect(nextWaveSize(S.waveCount + 1, 0, S)).toBe(0);
    expect(nextWaveSize(1.5, 0, S)).toBe(0);
    expect(nextWaveSize(2, 0, { waveSizes: [10], waveCount: 2 })).toBe(0);
  });
});
