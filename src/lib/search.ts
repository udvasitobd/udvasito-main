/**
 * Search matching for CMP-SearchSelect (specs §1.3.5: "Bangla + English matching"). Case- and space-insensitive
 * substring match on every name an option has; Bangla digits are read as Latin digits.
 */
import { toLatinDigits } from './phone';

export function normaliseSearch(text: string): string {
  return toLatinDigits(text).toLowerCase().replace(/\s+/g, ' ').trim();
}

/** True when every word of `query` appears in one of `names`. An empty query matches everything. */
export function matchesSearch(query: string, names: readonly string[]): boolean {
  const words = normaliseSearch(query).split(' ').filter(Boolean);
  if (words.length === 0) return true;
  const haystack = names.map(normaliseSearch).join(' | ');
  return words.every((word) => haystack.includes(word));
}
