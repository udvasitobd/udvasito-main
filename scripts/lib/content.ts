/**
 * Markdown → ContentDoc (src/lib/content.ts) using the `marked` lexer (MIT). Pure; tested in content.test.ts.
 * The first `# Title` line becomes `title`; anything outside the supported subset is an error, so unsupported
 * formatting never silently disappears from a legal page.
 */
import { marked, type Token, type Tokens } from 'marked';

import { LEGAL_IDS, type Block, type ContentDoc, type ContentMeta, type Inline } from '../../src/lib/content';

export class ContentError extends Error {}

const SAFE_LINK = /^(https:\/\/|mailto:|\/)/;

function inline(tokens: Token[] | undefined, where: string): Inline[] {
  const out: Inline[] = [];
  for (const tok of tokens ?? []) {
    switch (tok.type) {
      case 'text': {
        const t = tok as Tokens.Text;
        if (t.tokens && t.tokens.length > 0) out.push(...inline(t.tokens, where));
        else out.push({ t: 'text', v: t.text });
        break;
      }
      case 'escape':
        out.push({ t: 'text', v: (tok as Tokens.Escape).text });
        break;
      case 'strong':
        out.push({ t: 'strong', c: inline((tok as Tokens.Strong).tokens, where) });
        break;
      case 'em':
        out.push({ t: 'em', c: inline((tok as Tokens.Em).tokens, where) });
        break;
      case 'link': {
        const l = tok as Tokens.Link;
        if (!SAFE_LINK.test(l.href)) throw new ContentError(`${where}: link "${l.href}" must start with https://, mailto: or /`);
        out.push({ t: 'link', href: l.href, c: inline(l.tokens, where) });
        break;
      }
      case 'br':
        out.push({ t: 'text', v: '\n' });
        break;
      default:
        throw new ContentError(`${where}: unsupported inline formatting "${tok.type}" (${JSON.stringify(tok.raw)})`);
    }
  }
  return out;
}

const META_KEYS = ['version', 'effective', 'reviewedBy'] as const;
type MetaKey = (typeof META_KEYS)[number];

/**
 * The optional header (roadmap §5.4):
 *   ---
 *   version: 2026-11-28-pilot
 *   effective: 2026-11-28
 *   ---
 */
export function splitFrontMatter(markdown: string, where: string): { meta?: ContentMeta; body: string } {
  const text = markdown.replace(/^﻿/, '').replace(/\r\n?/g, '\n');
  if (!text.startsWith('---\n')) return { body: text };
  const end = text.indexOf('\n---', 3);
  const afterEnd = end === -1 ? -1 : end + 4;
  if (end === -1 || (afterEnd < text.length && text[afterEnd] !== '\n')) {
    throw new ContentError(`${where}: the header that starts with "---" must end with a "---" line`);
  }
  const meta: ContentMeta = {};
  for (const line of text.slice(4, end).split('\n')) {
    if (line.trim() === '') continue;
    const match = /^([A-Za-z]+):\s*(.*?)\s*$/.exec(line);
    if (!match) throw new ContentError(`${where}: header line "${line}" must look like "version: 2026-11-28-pilot"`);
    const key = match[1] as string;
    if (!(META_KEYS as readonly string[]).includes(key)) {
      throw new ContentError(`${where}: unknown header "${key}" (allowed: ${META_KEYS.join(', ')})`);
    }
    if (match[2] === '') throw new ContentError(`${where}: header "${key}" is empty`);
    meta[key as MetaKey] = match[2];
  }
  return { meta, body: text.slice(afterEnd) };
}

export function markdownToDoc(markdown: string, where: string): ContentDoc {
  const { meta, body } = splitFrontMatter(markdown, where);
  const tokens = marked.lexer(body);
  let title = '';
  const blocks: Block[] = [];
  for (const tok of tokens) {
    switch (tok.type) {
      case 'space':
        break;
      case 'heading': {
        const h = tok as Tokens.Heading;
        if (h.depth === 1) {
          if (title) throw new ContentError(`${where}: only one "# Title" line is allowed`);
          title = h.text.trim();
        } else if (h.depth === 2 || h.depth === 3) {
          blocks.push({ t: 'heading', level: h.depth, c: inline(h.tokens, where) });
        } else {
          throw new ContentError(`${where}: only ## and ### headings are supported`);
        }
        break;
      }
      case 'paragraph':
        blocks.push({ t: 'paragraph', c: inline((tok as Tokens.Paragraph).tokens, where) });
        break;
      case 'list': {
        const l = tok as Tokens.List;
        const items = l.items.map((item) => {
          const parts: Inline[] = [];
          for (const child of item.tokens) {
            if (child.type === 'text' || child.type === 'paragraph') {
              parts.push(...inline((child as Tokens.Text).tokens ?? [{ type: 'text', raw: child.raw, text: (child as Tokens.Text).text } as Tokens.Text], where));
            } else if (child.type !== 'space') {
              throw new ContentError(`${where}: lists inside lists are not supported`);
            }
          }
          return parts;
        });
        blocks.push({ t: 'list', ordered: l.ordered, start: typeof l.start === 'number' ? l.start : 1, items });
        break;
      }
      default:
        throw new ContentError(`${where}: unsupported block "${tok.type}" (${JSON.stringify(tok.raw.slice(0, 40))})`);
    }
  }
  if (!title) throw new ContentError(`${where}: the file must start with a "# Title" line`);
  return meta ? { title, meta, blocks } : { title, blocks };
}

const DATE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * The legal pages are all-or-nothing (Q-009): none yet → the consent flow stays hidden; some but not all → the build
 * stops. Each carries `version` (= settings.consentVersion) and `effective` (YYYY-MM-DD), the same in all four.
 */
export function legalProblems(docs: Readonly<Record<string, ContentDoc>>, consentVersion: string): string[] {
  const present = LEGAL_IDS.filter((id) => id in docs);
  if (present.length === 0) return [];
  const problems: string[] = [];
  for (const id of LEGAL_IDS) if (!present.includes(id)) problems.push(`${id}.md is missing — the four legal files ship together`);
  for (const id of present) {
    const meta = docs[id]?.meta;
    if (meta?.version !== consentVersion) {
      problems.push(`${id}.md: version must be "${consentVersion}" (settings.consentVersion), found "${meta?.version ?? ''}"`);
    }
    if (!meta?.effective || !DATE.test(meta.effective)) problems.push(`${id}.md: effective must be a date like 2026-11-28`);
  }
  const effective = new Set(present.map((id) => docs[id]?.meta?.effective).filter(Boolean));
  if (effective.size > 1) problems.push('legal files: the four effective dates must be the same');
  return problems;
}
