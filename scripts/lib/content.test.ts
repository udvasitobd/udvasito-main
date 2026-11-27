import { describe, expect, it } from 'vitest';

import { legalReady, type ContentDoc } from '../../src/lib/content';
import { ContentError, legalProblems, markdownToDoc, splitFrontMatter } from './content';

describe('markdownToDoc', () => {
  it('converts the supported subset', () => {
    const doc = markdownToDoc(
      [
        '# Privacy notice',
        '',
        '## What we collect',
        '',
        'We keep **your number** and *nothing* else. See [terms](/terms).',
        '',
        '- one',
        '- two **bold**',
        '',
        '3. three',
        '4. four',
      ].join('\n'),
      'privacy.en.md',
    );
    expect(doc.title).toBe('Privacy notice');
    expect(doc.blocks).toEqual([
      { t: 'heading', level: 2, c: [{ t: 'text', v: 'What we collect' }] },
      {
        t: 'paragraph',
        c: [
          { t: 'text', v: 'We keep ' },
          { t: 'strong', c: [{ t: 'text', v: 'your number' }] },
          { t: 'text', v: ' and ' },
          { t: 'em', c: [{ t: 'text', v: 'nothing' }] },
          { t: 'text', v: ' else. See ' },
          { t: 'link', href: '/terms', c: [{ t: 'text', v: 'terms' }] },
          { t: 'text', v: '.' },
        ],
      },
      { t: 'list', ordered: false, start: 1, items: [[{ t: 'text', v: 'one' }], [{ t: 'text', v: 'two ' }, { t: 'strong', c: [{ t: 'text', v: 'bold' }] }]] },
      { t: 'list', ordered: true, start: 3, items: [[{ t: 'text', v: 'three' }], [{ t: 'text', v: 'four' }]] },
    ]);
  });

  it('keeps Bangla text intact', () => {
    expect(markdownToDoc('# গোপনীয়তা\n\nআমরা **আপনার নম্বর** রাখি।', 'x').blocks[0]).toEqual({
      t: 'paragraph',
      c: [{ t: 'text', v: 'আমরা ' }, { t: 'strong', c: [{ t: 'text', v: 'আপনার নম্বর' }] }, { t: 'text', v: ' রাখি।' }],
    });
  });

  it.each([
    ['raw HTML', '# T\n\n<script>alert(1)</script>'],
    ['inline HTML', '# T\n\nHello <b>x</b>'],
    ['code block', '# T\n\n```\ncode\n```'],
    ['image', '# T\n\n![x](https://a.b/c.png)'],
    ['table', '# T\n\n| a |\n|---|\n| b |'],
    ['h4', '# T\n\n#### deep'],
    ['javascript link', '# T\n\n[x](javascript:alert(1))'],
    ['http link', '# T\n\n[x](http://example.com)'],
    ['missing title', 'Just text'],
    ['two titles', '# A\n\n# B'],
  ])('rejects %s', (_, md) => {
    expect(() => markdownToDoc(md, 'x.md')).toThrow(ContentError);
  });
});

describe('splitFrontMatter (roadmap §5.4 header)', () => {
  it('reads version, effective and reviewedBy, and keeps the rest as the body', () => {
    const md = '---\nversion: 2026-11-28-pilot\neffective: 2026-11-28\n---\n# Privacy notice\n\nText.';
    expect(splitFrontMatter(md, 'x')).toEqual({
      meta: { version: '2026-11-28-pilot', effective: '2026-11-28' },
      body: '\n# Privacy notice\n\nText.',
    });
    expect(markdownToDoc(md, 'x')).toMatchObject({ title: 'Privacy notice', meta: { version: '2026-11-28-pilot' } });
  });

  it('accepts Windows line endings and a byte-order mark', () => {
    const md = '﻿---\r\nversion: v1\r\n---\r\n# T\r\n';
    expect(markdownToDoc(md, 'x')).toEqual({ title: 'T', meta: { version: 'v1' }, blocks: [] });
  });

  it('a file without a header has no meta', () => {
    expect(markdownToDoc('# T\n\nHi', 'x')).not.toHaveProperty('meta');
  });

  it.each([
    ['an unclosed header', '---\nversion: v1\n# T'],
    ['an unknown key', '---\nauthor: me\n---\n# T'],
    ['an empty value', '---\nversion:\n---\n# T'],
    ['a line that is not key: value', '---\njust words\n---\n# T'],
  ])('rejects %s', (_, md) => {
    expect(() => markdownToDoc(md, 'x')).toThrow(ContentError);
  });
});

describe('legalProblems (Q-009: all four legal files or none)', () => {
  const doc = (meta?: ContentDoc['meta']): ContentDoc => ({ title: 'T', blocks: [], ...(meta ? { meta } : {}) });
  const good = { version: '2026-11-28-pilot', effective: '2026-11-28' };
  const all = (meta = good) => ({
    'legal/privacy.en': doc(meta),
    'legal/privacy.bn': doc(meta),
    'legal/terms.en': doc(meta),
    'legal/terms.bn': doc(meta),
  });

  it('none yet is fine (the consent flow stays hidden); all four with the right header is fine', () => {
    expect(legalProblems({ 'en/learn': doc() }, '2026-11-28-pilot')).toEqual([]);
    expect(legalProblems(all(), '2026-11-28-pilot')).toEqual([]);
    expect(legalReady(all())).toBe(true);
    expect(legalReady({ 'legal/privacy.en': doc(good) })).toBe(false);
  });

  it('a partial set names each missing file', () => {
    const { 'legal/terms.bn': _missing, ...three } = all();
    expect(legalProblems(three, '2026-11-28-pilot')).toEqual(['legal/terms.bn.md is missing — the four legal files ship together']);
  });

  it('the version must equal settings.consentVersion and the effective date must be a date', () => {
    expect(legalProblems(all({ version: 'draft', effective: '28 Nov' }), '2026-11-28-pilot')).toHaveLength(8);
    expect(legalProblems({ ...all(), 'legal/terms.bn': doc() }, '2026-11-28-pilot')).toHaveLength(2);
  });

  it('all four effective dates must match', () => {
    const problems = legalProblems({ ...all(), 'legal/terms.bn': doc({ ...good, effective: '2026-12-01' }) }, '2026-11-28-pilot');
    expect(problems).toEqual(['legal files: the four effective dates must be the same']);
  });
});
