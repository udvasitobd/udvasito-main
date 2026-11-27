/**
 * Hospital text rules — pure TypeScript, no Convex imports (CLAUDE.md rule 10).
 * `searchText` feeds the `search_all` search index; it is written by scripts/import-hospitals.ts and admin edits.
 */

/** Splits the `;`-separated aliases column; trims, drops empties and repeats (case-insensitive), keeps order. */
export function splitAliases(text: string): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of text.split(';')) {
    const alias = raw.trim().replace(/\s+/g, ' ');
    const key = alias.toLowerCase();
    if (alias && !seen.has(key)) {
      seen.add(key);
      out.push(alias);
    }
  }
  return out;
}

/** Lower-case names + aliases, single-spaced, each term once (roadmap §5.1). */
export function hospitalSearchText(nameEn: string, nameBn: string, aliases: readonly string[]): string {
  const terms: string[] = [];
  const seen = new Set<string>();
  for (const raw of [nameEn, nameBn, ...aliases]) {
    const term = raw.trim().replace(/\s+/g, ' ').toLowerCase();
    if (term && !seen.has(term)) {
      seen.add(term);
      terms.push(term);
    }
  }
  return terms.join(' ');
}
