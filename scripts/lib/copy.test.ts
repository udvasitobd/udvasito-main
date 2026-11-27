import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import {
  buildDictionaries,
  parseNotificationCell,
  parseSpecs,
  parseValidationCell,
  splitBilingual,
  splitRow,
} from './copy';

describe('copy parser', () => {
  it('reads copy tables, error codes and inline copy', () => {
    const md = [
      '| Key | English | বাংলা |',
      '|---|---|---|',
      '| `common.back` | Back | পেছনে |',
      '| `units_one` / `units_other` | {{count}} bag / {{count}} bags | {{count}} ব্যাগ |',
      '',
      '| Code | English | বাংলা |',
      '|---|---|---|',
      '| `ERR_FORBIDDEN` | No access. | প্রবেশাধিকার নেই। |',
      '| ↳ reason `group` | group differs | গ্রুপ আলাদা |',
      '',
      '**Copy:** `update.title` "Please update" / "আপডেট করুন"; button `update.download` "Download" / "ডাউনলোড"',
      'Example only: "Whole blood" / "Platelets"',
    ].join('\n');
    const { entries, issues, unkeyed } = parseSpecs(md);
    expect(issues).toEqual([]);
    expect(unkeyed).toEqual([]);
    expect(entries.map((e) => [e.key, e.en, e.bn])).toEqual([
      ['common.back', 'Back', 'পেছনে'],
      ['units_one', '{{count}} bag', '{{count}} ব্যাগ'],
      ['units_other', '{{count}} bags', '{{count}} ব্যাগ'],
      ['errors.ERR_FORBIDDEN', 'No access.', 'প্রবেশাধিকার নেই।'],
      ['errors.ERR_FORBIDDEN.reason.group', 'group differs', 'গ্রুপ আলাদা'],
      ['update.title', 'Please update', 'আপডেট করুন'],
      ['update.download', 'Download', 'ডাউনলোড'],
    ]);
  });

  it('reads validation cases, unlabeled messages and the special >100 case', () => {
    expect(parseValidationCell('empty → "Enter it." / "দিন।" · >100 → "Check the year." / "সালটি যাচাই করুন।"')).toEqual(
      [
        { name: 'empty', en: 'Enter it.', bn: 'দিন।' },
        { name: 'tooOld', en: 'Check the year.', bn: 'সালটি যাচাই করুন।' },
      ],
    );
    expect(parseValidationCell('"Keep it short." / "ছোট রাখুন।"')).toEqual([
      { name: 'invalid', en: 'Keep it short.', bn: 'ছোট রাখুন।' },
    ]);
    const md = [
      '| Rule | Field | Rule details | Case → message |',
      '|---|---|---|---|',
      '| VAL-22 / VAL-23 | Text | ≤ 80 | "Short." / "ছোট।" |',
    ].join('\n');
    expect(parseSpecs(md).entries.map((e) => e.key)).toEqual([
      'validation.VAL-22.invalid',
      'validation.VAL-23.invalid',
    ]);
  });

  it('reads notification templates with variants and "same as"', () => {
    expect(
      parseNotificationCell('`{{x}} needed` / `{{x}} প্রয়োজন` (urgent = "URGENT · " / "জরুরি · " when now)'),
    ).toEqual([
      { label: null, en: '{{x}} needed', bn: '{{x}} প্রয়োজন' },
      { label: 'urgent', en: 'URGENT · ', bn: 'জরুরি · ' },
    ]);
    expect(parseNotificationCell('`{{kind}}`')).toEqual([{ label: null, en: '{{kind}}', bn: '{{kind}}' }]);
    const md = [
      '| ID | To | Title EN / BN | Body EN / BN | Opens |',
      '|---|---|---|---|---|',
      '| NTF-01 | Donor | `A` / `অ` | `B` / `ব` — donor_calls: `C` / `চ` | x |',
      '| NTF-02 | Donor | `D` / `ড` | same as NTF-01 | x |',
    ].join('\n');
    expect(parseSpecs(md).entries.map((e) => `${e.key}=${e.en}`)).toEqual([
      'notifications.NTF-01.title=A',
      'notifications.NTF-01.body=B',
      'notifications.NTF-01.body.donorCalls=C',
      'notifications.NTF-02.title=D',
      'notifications.NTF-02.body=B',
      'notifications.NTF-02.body.donorCalls=C',
    ]);
  });

  it('reads the account-status table', () => {
    const md = [
      '| Status | Title EN / BN | Body EN / BN | Actions |',
      '|---|---|---|---|',
      '| `banned` | Closed / বন্ধ | Reason: {{reason}}. / কারণ: {{reason}}। | Contact us |',
    ].join('\n');
    expect(parseSpecs(md).entries.map((e) => [e.key, e.en, e.bn])).toEqual([
      ['accountStatus.banned.title', 'Closed', 'বন্ধ'],
      ['accountStatus.banned.body', 'Reason: {{reason}}.', 'কারণ: {{reason}}।'],
    ]);
    expect(splitBilingual('Ward / bed / ওয়ার্ড / বেড')).toEqual({ en: 'Ward / bed', bn: 'ওয়ার্ড / বেড' });
  });

  it('reports copy that has no key', () => {
    expect(parseSpecs('Empty: "Nothing yet." / "এখনো কিছু নেই।"').unkeyed).toHaveLength(1);
  });

  it('splits table rows without breaking escaped pipes', () => {
    expect(splitRow('| a | b \\| c | d |')).toEqual(['a', 'b | c', 'd']);
  });
});

describe('buildDictionaries', () => {
  const e = (key: string, en: string, bn: string, line = 1) => ({ key, en, bn, line });

  it('reports missing languages, conflicts and same-text duplicates', () => {
    const r = buildDictionaries(
      [e('a', 'A', 'অ'), e('a', 'A', 'অ', 2), e('b', 'B', 'ব'), e('b', 'B2', 'ব', 3), e('c', 'C', '')],
      {},
      [],
    );
    expect(r.duplicates).toHaveLength(1);
    expect(r.conflicts).toEqual([{ line: 3, message: 'b differs from line 1' }]);
    expect(r.missing).toEqual([{ line: 1, message: 'c: Bangla missing' }]);
  });

  it('never overwrites reviewed Bangla and reports when specs moved on', () => {
    const r = buildDictionaries([e('a', 'A', 'নতুন'), e('b', 'B', 'খসড়া')], { a: 'পর্যালোচিত', b: 'পুরোনো' }, ['a']);
    expect(r.bn).toEqual({ a: 'পর্যালোচিত', b: 'খসড়া' });
    expect(r.reviewedDiffers).toEqual(['a']);
  });
});

describe('docs/specs.md → src/i18n (the real files)', () => {
  const root = join(__dirname, '..', '..');
  const specs = readFileSync(join(root, 'docs', 'specs.md'), 'utf8');
  const en = JSON.parse(readFileSync(join(root, 'src', 'i18n', 'en.json'), 'utf8')) as Record<string, string>;
  const bn = JSON.parse(readFileSync(join(root, 'src', 'i18n', 'bn.json'), 'utf8')) as Record<string, string>;

  it('parses cleanly: every key has English and Bangla, no conflicts', () => {
    const { entries, issues } = parseSpecs(specs);
    const r = buildDictionaries(entries, {}, []);
    expect(issues).toEqual([]);
    expect(r.missing).toEqual([]);
    expect(r.conflicts).toEqual([]);
    expect(Object.keys(r.en).length).toBeGreaterThan(400);
  });

  it('en.json and bn.json have the same keys and no empty values', () => {
    expect(Object.keys(bn).sort()).toEqual(Object.keys(en).sort());
    for (const [key, value] of Object.entries(en)) {
      expect(value.trim(), key).not.toBe('');
      expect((bn[key] ?? '').trim(), key).not.toBe('');
    }
  });

  it('placeholders match between the two languages', () => {
    const vars = (s: string) => [...s.matchAll(/\{\{(\w+)\}\}/g)].map((m) => m[1]).sort();
    for (const key of Object.keys(en)) expect(vars(bn[key] ?? ''), key).toEqual(vars(en[key] ?? ''));
  });
});
