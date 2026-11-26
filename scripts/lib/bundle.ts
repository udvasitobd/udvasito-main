/**
 * Checks on the web build output (pure; scripts/check-bundle.ts does the file reading):
 * - specs §7.1: initial web shell JS ≤ 600 KB gzip;
 * - roadmap P0 DoD / D-R3: no phone number (the helpline included) in the HTML or the JS bundle. The only number
 *   allowed is the format example from the VAL-03 copy in specs (it is not anyone's number).
 */
import { findPhoneNumbers } from '../../src/lib/scrub';

export const SHELL_BUDGET_BYTES = 600 * 1024;

/** The example number in `validation.VAL-03.invalid` (EN and BN digits). */
export const ALLOWED_EXAMPLE_NUMBERS: ReadonlySet<string> = new Set(['01712345678', '০১৭১২৩৪৫৬৭৮']);

export type BundleFile = { path: string; text: string; gzipBytes: number; initial: boolean };

export type BundleReport = { initialGzipBytes: number; overBudget: boolean; phoneHits: { path: string; number: string }[] };

export function checkBundle(files: BundleFile[], budget = SHELL_BUDGET_BYTES): BundleReport {
  const initialGzipBytes = files.filter((f) => f.initial).reduce((sum, f) => sum + f.gzipBytes, 0);
  const phoneHits = files.flatMap((f) =>
    findPhoneNumbers(f.text)
      .filter((n) => !ALLOWED_EXAMPLE_NUMBERS.has(n))
      .map((number) => ({ path: f.path, number })),
  );
  return { initialGzipBytes, overBudget: initialGzipBytes > budget, phoneHits };
}

/** The scripts index.html loads directly (`<script src=…>`) are the initial shell; lazy chunks are not. */
export function initialScripts(html: string): string[] {
  return [...html.matchAll(/<script[^>]*\ssrc="([^"]+)"/g)].map((m) => (m[1] ?? '').replace(/^\//, ''));
}
