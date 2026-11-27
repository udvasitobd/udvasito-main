/**
 * Reads a Cloudflare `_headers` file (ADR-024) the way Cloudflare applies it to static assets, so the local server
 * (scripts/serve-dist.ts) and the tests see the production headers. Supported: `#` comments, path rules with `*`
 * (splat) and `:name` (one segment), `Name: value` lines, and `! Name` to detach a header set by an earlier rule.
 * A header set by several matching rules is joined with ", " (Cloudflare's documented behaviour).
 */

export type HeaderRule = { pattern: string; test: RegExp; set: [name: string, value: string][]; detach: string[] };

/** Cloudflare's limits for `_headers` (Workers static assets). */
export const HEADERS_FILE_LIMITS = { rules: 100, lineLength: 2000 } as const;

function patternToRegExp(pattern: string): RegExp {
  const source = pattern
    .split(/(\*|:[A-Za-z]\w*)/)
    .map((part) => {
      if (part === '*') return '.*';
      if (part.startsWith(':')) return '[^/]+';
      return part.replace(/[.+?^${}()|[\]\\]/g, '\\$&');
    })
    .join('');
  return new RegExp(`^${source}$`);
}

export function parseHeadersFile(text: string): HeaderRule[] {
  const rules: HeaderRule[] = [];
  for (const [i, raw] of text.split(/\r?\n/).entries()) {
    if (!raw.trim() || raw.trimStart().startsWith('#')) continue;
    if (!/^\s/.test(raw)) {
      const pattern = raw.trim();
      rules.push({ pattern, test: patternToRegExp(pattern), set: [], detach: [] });
      continue;
    }
    const rule = rules.at(-1);
    if (!rule) throw new Error(`_headers line ${i + 1}: a header before any path`);
    const line = raw.trim();
    if (line.startsWith('!')) {
      rule.detach.push(line.slice(1).trim().toLowerCase());
      continue;
    }
    const colon = line.indexOf(':');
    if (colon < 1) throw new Error(`_headers line ${i + 1}: expected "Name: value"`);
    rule.set.push([line.slice(0, colon).trim(), line.slice(colon + 1).trim()]);
  }
  return rules;
}

/** The headers for one request path; names are lower-case. */
export function headersFor(rules: HeaderRule[], urlPath: string): Map<string, string> {
  const out = new Map<string, string>();
  for (const rule of rules) {
    if (!rule.test.test(urlPath)) continue;
    for (const name of rule.detach) out.delete(name);
    for (const [name, value] of rule.set) {
      const key = name.toLowerCase();
      const existing = out.get(key);
      out.set(key, existing === undefined ? value : `${existing}, ${value}`);
    }
  }
  return out;
}

/** Problems Cloudflare would reject or silently ignore. */
export function checkHeadersFile(text: string): string[] {
  const problems: string[] = [];
  text.split(/\r?\n/).forEach((line, i) => {
    if (line.length > HEADERS_FILE_LIMITS.lineLength) problems.push(`line ${i + 1} is longer than ${HEADERS_FILE_LIMITS.lineLength} characters`);
  });
  const rules = parseHeadersFile(text);
  if (rules.length > HEADERS_FILE_LIMITS.rules) problems.push(`${rules.length} rules (limit ${HEADERS_FILE_LIMITS.rules})`);
  return problems;
}
