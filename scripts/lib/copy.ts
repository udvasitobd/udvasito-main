/**
 * Parser for the copy in docs/specs.md (specs §1.6, build-prompts P0 item 5). Pure functions — tested in copy.test.ts.
 *
 * Formats found in specs.md:
 *   A. Copy tables         | Key | English | বাংলা |            → key as written
 *   B. Error-code table    | Code | English | বাংলা |           → errors.<CODE>
 *   C. Validation table    | Rule | … | Case → message … |      → validation.<rule>.<case> (no case → "invalid")
 *   D. Notification table  | ID | To | Title EN / BN | Body EN / BN | Opens | → notifications.<ID>.title|body[.<label>]
 *   E. Inline copy in prose:  `some.key` "English" / "বাংলা"
 *   F. Copy without a key in specs (e.g. the practice badge): assigned a key in UNKEYED_COPY below by its exact
 *      English text; the strings themselves still come from specs.
 */

export type CopyEntry = { key: string; en: string; bn: string; line: number };
export type CopyIssue = { line: number; message: string };
export type ParseResult = { entries: CopyEntry[]; issues: CopyIssue[]; unkeyed: CopyIssue[] };

/**
 * Keys for copy that specs writes without a key. Map: exact English text → key.
 * Adding a key here is allowed; changing the English or Bangla text is not (edit docs/specs.md instead).
 */
export const UNKEYED_COPY: Record<string, string> = {
  PRACTICE: 'practice.badge',
  "This page doesn't exist.": 'notFound.body',
  'Use the web app': 'update.useWeb',
  'Contact details are paused while we review a report.': 'request.revealsFrozen',
  'Your confirmed donations will appear here.': 'donorHistory.empty',
  'Nothing to review. 🎉': 'admin.moderationEmpty',
  'This request is no longer active. Thank you for caring.': 'publicRequest.closed',
  'Please share your own number.': 'telegram.ownNumber',
  'Please fix 2 things above': '', // example of the form summary — the real key is validation.summary
  'in 2 h': '', // example of relative time formatting (§1.6 rule 3), produced by date-fns
};

const BENGALI = /[ঀ-৿]/;
const KEY_TEXT = String.raw`[a-zA-Z][a-zA-Z0-9]*(?:\.[a-zA-Z0-9_-]+)+`;
/** A double-quoted string. Copy never contains a straight double quote. */
const Q = String.raw`"([^"]*)"`;
const INLINE = new RegExp(String.raw`\x60(${KEY_TEXT})\x60\s*(?:[:=—-]\s*)?${Q}\s*/\s*${Q}`, 'g');
const QUOTED_PAIR = new RegExp(String.raw`${Q}\s*/\s*${Q}`, 'g');

export function splitRow(line: string): string[] {
  const trimmed = line.trim().replace(/^\|/, '').replace(/\|$/, '');
  return trimmed.split(/(?<!\\)\|/).map((cell) => cell.trim().replace(/\\\|/g, '|'));
}

const PLURAL_KEY = /^`([^`]+)_one`\s*\/\s*`(?:[^`]*)?_other`$/;

/** "one form / other form" → both; a single form is used for both (Bangla nouns do not change with number). */
function splitForms(cell: string): [string, string] {
  const parts = cell.split(' / ').map((x) => x.trim());
  return parts.length === 2 ? [parts[0] ?? '', parts[1] ?? ''] : [cell.trim(), cell.trim()];
}

const unquoteKey = (cell: string) => cell.replace(/^`|`$/g, '').trim();

type TableKind = 'copy' | 'errors' | 'validation' | 'notifications';

function tableKind(header: string[]): TableKind | null {
  const h = header.map((c) => c.toLowerCase());
  if (h[0] === 'key' && h[1] === 'english' && header[2] === 'বাংলা') return 'copy';
  if (h[0] === 'code' && h[1] === 'english' && header[2] === 'বাংলা') return 'errors';
  if (h[0] === 'rule' && h[1] === 'field' && (h[3] ?? '').startsWith('case')) return 'validation';
  if (h[0] === 'id' && h[1] === 'to' && (h[2] ?? '').startsWith('title en')) return 'notifications';
  return null;
}

const isSeparator = (line: string) => /^\|\s*:?-{3,}/.test(line.trim());

function caseName(label: string): string {
  const l = label.trim();
  if (l === '>100') return 'tooOld';
  return l;
}

/** VAL cell: `empty → "EN" / "BN" · short → "EN" / "BN"` or just `"EN" / "BN"`. */
export function parseValidationCell(cell: string): { name: string; en: string; bn: string }[] {
  const out: { name: string; en: string; bn: string }[] = [];
  const re = new RegExp(String.raw`(?:([^"·→]+?)\s*→\s*)?${Q}\s*/\s*${Q}`, 'g');
  for (const m of cell.matchAll(re)) {
    out.push({ name: m[1] ? caseName(m[1]) : 'invalid', en: m[2] ?? '', bn: m[3] ?? '' });
  }
  return out;
}

/**
 * Notification cell: base pair `EN` / `BN`, optional labelled variants (`(urgent = "…" / "…")`,
 * `— donor_calls: \`…\` / \`…\``, `(rejected: \`…\` / \`…\`)`), a single language-neutral template (`{{kind}}`),
 * or "same as NTF-01".
 */
export function parseNotificationCell(cell: string): { label: string | null; en: string; bn: string }[] | { sameAs: string } {
  const same = /^same as (NTF-\d+)/.exec(cell.trim());
  if (same?.[1]) return { sameAs: same[1] };
  const out: { label: string | null; en: string; bn: string }[] = [];
  const re = /(?:\x60([^\x60]*)\x60|"([^"]*)")\s*\/\s*(?:\x60([^\x60]*)\x60|"([^"]*)")/g;
  let last = 0;
  for (const m of cell.matchAll(re)) {
    const before = cell.slice(last, m.index);
    const label = /([a-zA-Z_]+)\s*[:=]\s*$/.exec(before)?.[1] ?? null;
    out.push({ label: out.length === 0 ? null : label ?? `variant${out.length}`, en: m[1] ?? m[2] ?? '', bn: m[3] ?? m[4] ?? '' });
    last = (m.index ?? 0) + m[0].length;
  }
  if (out.length === 0) {
    const single = /^\x60([^\x60]+)\x60$/.exec(cell.trim());
    if (single?.[1]) out.push({ label: null, en: single[1], bn: single[1] });
  }
  return out;
}

const camel = (label: string) => label.replace(/_([a-z])/g, (_, c: string) => c.toUpperCase());

export function parseSpecs(markdown: string): ParseResult {
  const lines = markdown.split(/\r?\n/);
  const entries: CopyEntry[] = [];
  const issues: CopyIssue[] = [];
  const unkeyed: CopyIssue[] = [];
  const ntfBodies = new Map<string, CopyEntry[]>();
  let kind: TableKind | null = null;
  let inCodeBlock = false;

  const add = (key: string, en: string, bn: string, line: number) => entries.push({ key, en, bn, line });

  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i] ?? '';
    const lineNo = i + 1;
    if (raw.trim().startsWith('```')) {
      inCodeBlock = !inCodeBlock;
      continue;
    }
    if (inCodeBlock) continue;
    const isRow = raw.trim().startsWith('|');

    if (isRow) {
      const cells = splitRow(raw);
      if (isSeparator(raw)) continue;
      const next = lines[i + 1] ?? '';
      if (isSeparator(next)) {
        kind = tableKind(cells);
        continue;
      }
      if (kind === 'copy') {
        const [k, en, bn] = cells;
        const plural = PLURAL_KEY.exec(k ?? '');
        if (plural?.[1]) {
          // `base_one` / `base_other` (or `_other`): English "one / other"; Bangla one form, or "one / other".
          const [enOne, enOther] = splitForms(en ?? '');
          const [bnOne, bnOther] = splitForms(bn ?? '');
          add(`${plural[1]}_one`, enOne, bnOne, lineNo);
          add(`${plural[1]}_other`, enOther, bnOther, lineNo);
          continue;
        }
        if (!k || !/^`[^`]+`$/.test(k)) issues.push({ line: lineNo, message: `copy row without a \`key\`: ${k}` });
        else add(unquoteKey(k), en ?? '', bn ?? '', lineNo);
        continue;
      }
      if (kind === 'errors') {
        const [code, en, bn] = cells;
        add(`errors.${unquoteKey(code ?? '')}`, en ?? '', bn ?? '', lineNo);
        continue;
      }
      if (kind === 'validation') {
        const [rules, , , messages] = cells;
        const ids = (rules ?? '').split('/').map((r) => r.trim()).filter(Boolean);
        const cases = parseValidationCell(messages ?? '');
        if (cases.length === 0) issues.push({ line: lineNo, message: `validation row without messages: ${rules}` });
        for (const id of ids) for (const c of cases) add(`validation.${id}.${c.name}`, c.en, c.bn, lineNo);
        continue;
      }
      if (kind === 'notifications') {
        const [id, , titleCell, bodyCell] = cells;
        if (!id) continue;
        for (const [part, cell] of [
          ['title', titleCell],
          ['body', bodyCell],
        ] as const) {
          const parsed = parseNotificationCell(cell ?? '');
          if ('sameAs' in parsed) {
            const source = ntfBodies.get(`${parsed.sameAs}.${part}`) ?? [];
            if (source.length === 0) issues.push({ line: lineNo, message: `${id} ${part}: "same as" an unknown template` });
            for (const s of source) add(s.key.replace(`notifications.${parsed.sameAs}.`, `notifications.${id}.`), s.en, s.bn, lineNo);
            continue;
          }
          if (parsed.length === 0) issues.push({ line: lineNo, message: `${id} ${part}: no template found` });
          const made: CopyEntry[] = [];
          for (const p of parsed) {
            const key = `notifications.${id}.${part}${p.label ? `.${camel(p.label)}` : ''}`;
            add(key, p.en, p.bn, lineNo);
            made.push({ key, en: p.en, bn: p.bn, line: lineNo });
          }
          ntfBodies.set(`${id}.${part}`, made);
        }
        continue;
      }
    } else {
      kind = null;
    }

    // Inline copy (prose, and cells of tables that are not copy tables).
    const keyedSpans: [number, number][] = [];
    for (const m of raw.matchAll(INLINE)) {
      add(m[1] ?? '', m[2] ?? '', m[3] ?? '', lineNo);
      keyedSpans.push([m.index ?? 0, (m.index ?? 0) + m[0].length]);
    }
    if (/^\*\*Form-level summary\*\*/.test(raw.trim())) {
      const m = new RegExp(Q + String.raw`\s*/\s*` + Q).exec(raw);
      if (m) {
        add('validation.summary', m[1] ?? '', m[2] ?? '', lineNo);
        keyedSpans.push([m.index, m.index + m[0].length]);
      }
    }
    for (const m of raw.matchAll(QUOTED_PAIR)) {
      const start = m.index ?? 0;
      if (keyedSpans.some(([a, b]) => start >= a && start < b)) continue;
      const en = m[1] ?? '';
      const bn = m[2] ?? '';
      if (!BENGALI.test(bn) || BENGALI.test(en)) continue; // an EN/EN example pair, not copy
      const key = UNKEYED_COPY[en];
      if (key === undefined) unkeyed.push({ line: lineNo, message: `"${en}" / "${bn}"` });
      else if (key !== '') add(key, en, bn, lineNo);
    }
  }
  return { entries, issues, unkeyed };
}

export type BuildResult = {
  en: Record<string, string>;
  bn: Record<string, string>;
  duplicates: CopyIssue[];
  conflicts: CopyIssue[];
  missing: CopyIssue[];
  reviewedDiffers: string[];
};

/**
 * Builds the two flat dictionaries. A Bangla value whose key is in `reviewed` is kept from `existingBn` (member 3
 * has reviewed it); if specs now says something else, the key is reported instead of being overwritten.
 */
export function buildDictionaries(
  entries: CopyEntry[],
  existingBn: Record<string, string>,
  reviewed: readonly string[],
): BuildResult {
  const en: Record<string, string> = {};
  const bn: Record<string, string> = {};
  const firstLine = new Map<string, number>();
  const duplicates: CopyIssue[] = [];
  const conflicts: CopyIssue[] = [];
  const missing: CopyIssue[] = [];
  const reviewedDiffers: string[] = [];
  const reviewedSet = new Set(reviewed);

  for (const e of entries) {
    if (e.en.trim() === '' || e.bn.trim() === '') {
      missing.push({ line: e.line, message: `${e.key}: ${e.en.trim() === '' ? 'English' : 'Bangla'} missing` });
    }
    const seen = firstLine.get(e.key);
    if (seen !== undefined) {
      if (en[e.key] !== e.en || bn[e.key] !== e.bn) {
        conflicts.push({ line: e.line, message: `${e.key} differs from line ${seen}` });
      } else {
        duplicates.push({ line: e.line, message: `${e.key} also on line ${seen} (same text)` });
      }
      continue;
    }
    firstLine.set(e.key, e.line);
    en[e.key] = e.en;
    bn[e.key] = e.bn;
  }

  for (const key of Object.keys(bn)) {
    const kept = existingBn[key];
    if (reviewedSet.has(key) && kept !== undefined) {
      if (kept !== bn[key]) reviewedDiffers.push(key);
      bn[key] = kept;
    }
  }

  const sort = (o: Record<string, string>) => Object.fromEntries(Object.entries(o).sort(([a], [b]) => a.localeCompare(b)));
  return { en: sort(en), bn: sort(bn), duplicates, conflicts, missing, reviewedDiffers };
}
