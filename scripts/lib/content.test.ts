import { describe, expect, it } from 'vitest';

import { ContentError, markdownToDoc } from './content';

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
