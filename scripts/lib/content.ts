/**
 * Markdown → ContentDoc (src/lib/content.ts) using the `marked` lexer (MIT). Pure; tested in content.test.ts.
 * The first `# Title` line becomes `title`; anything outside the supported subset is an error, so unsupported
 * formatting never silently disappears from a legal page.
 */
import { marked, type Token, type Tokens } from 'marked';

import type { Block, ContentDoc, Inline } from '../../src/lib/content';

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

export function markdownToDoc(markdown: string, where: string): ContentDoc {
  const tokens = marked.lexer(markdown);
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
  return { title, blocks };
}
