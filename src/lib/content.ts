/**
 * The JSON shape that `scripts/build-content.ts` writes and CMP-Markdown renders (specs §1.3.5).
 * Supported: `##`/`###` headings, paragraphs, bullet and numbered lists, **bold**, *italic*, links. No raw HTML.
 */
export type Inline =
  | { t: 'text'; v: string }
  | { t: 'strong'; c: Inline[] }
  | { t: 'em'; c: Inline[] }
  | { t: 'link'; href: string; c: Inline[] };

export type Block =
  | { t: 'heading'; level: 2 | 3; c: Inline[] }
  | { t: 'paragraph'; c: Inline[] }
  | { t: 'list'; ordered: boolean; start: number; items: Inline[][] };

export type ContentDoc = { title: string; blocks: Block[] };
