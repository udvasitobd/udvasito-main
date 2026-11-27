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

/** The `---` header at the top of a file (roadmap §5.4). */
export type ContentMeta = { version?: string; effective?: string; reviewedBy?: string };

export type ContentDoc = { title: string; meta?: ContentMeta; blocks: Block[] };

export type LegalPage = 'privacy' | 'terms';

/** The four legal files (SCR-P06/P07): they ship together or not at all. */
export const LEGAL_IDS = ['legal/privacy.en', 'legal/privacy.bn', 'legal/terms.en', 'legal/terms.bn'] as const;

/**
 * True once member 4's privacy notice and terms are in the build (DEP-02). Until then the consent screen, the legal
 * pages and onboarding stay hidden (specs §1.9) — there is no consent without the notice (Q-009).
 */
export function legalReady(content: Readonly<Record<string, ContentDoc>>): boolean {
  return LEGAL_IDS.every((id) => id in content);
}

export function legalDoc(
  content: Readonly<Record<string, ContentDoc>>,
  page: LegalPage,
  lang: 'en' | 'bn',
): ContentDoc | undefined {
  return content[`legal/${page}.${lang}`];
}

/** The version every legal file carries; equals `settings.consentVersion` (checked by `npm run content:build`). */
export function legalVersion(content: Readonly<Record<string, ContentDoc>>): string | undefined {
  return content['legal/privacy.en']?.meta?.version;
}
