/**
 * Wave sizes — PRD §5.4, specs §6.10. Pure TypeScript, no Convex imports; sizes come from S-08 / S-10.
 * Matching v1 (P1) sends wave 1 only; the timing of waves 2–3 (`nextWaveAt`, S-09) arrives with them in P2.
 */
import type { Settings } from './settings';

/**
 * How many new donors wave `waveIndex` (1-based) alerts: its S-08 size minus the donors who opened an earlier alert
 * but have not answered yet (they are still deciding). 0 outside waves 1…S-10.
 */
export function nextWaveSize(
  waveIndex: number,
  openedUnanswered: number,
  settings: Pick<Settings, 'waveSizes' | 'waveCount'>,
): number {
  if (!Number.isInteger(waveIndex) || waveIndex < 1 || waveIndex > settings.waveCount) return 0;
  const size = settings.waveSizes[waveIndex - 1] ?? 0;
  return Math.max(0, size - Math.max(0, openedUnanswered));
}
