import { describe, expect, it } from 'vitest';

import { CsvError, parseCsv, parseCsvRows } from './csv';

describe('parseCsvRows', () => {
  it('reads quoted commas, doubled quotes, line breaks, CRLF and a BOM', () => {
    const text = '﻿a,b,c\r\n"x, y","say ""hi""","two\nlines"\r\n\r\nlast,,\n';
    expect(parseCsvRows(text)).toEqual([
      { line: 1, cells: ['a', 'b', 'c'] },
      { line: 2, cells: ['x, y', 'say "hi"', 'two\nlines'] },
      { line: 5, cells: ['last', '', ''] },
    ]);
  });

  it('reads a last row without a final line break', () => {
    expect(parseCsvRows('a,b\n1,2')).toEqual([
      { line: 1, cells: ['a', 'b'] },
      { line: 2, cells: ['1', '2'] },
    ]);
  });

  it('keeps Bangla text unchanged', () => {
    expect(parseCsvRows('nameBn\n"চট্টগ্রাম মেডিকেল কলেজ হাসপাতাল"\n')[1]?.cells).toEqual(['চট্টগ্রাম মেডিকেল কলেজ হাসপাতাল']);
  });

  it('rejects an unclosed quote and a stray quote', () => {
    expect(() => parseCsvRows('a\n"open')).toThrow(CsvError);
    expect(() => parseCsvRows('a\nab"c')).toThrow(/quote inside an unquoted value/);
  });
});

describe('parseCsv', () => {
  it('maps rows to the header and checks required columns', () => {
    expect(parseCsv('nameEn,type\nA,hospital\n', ['nameEn', 'type']).records).toEqual([{ line: 2, values: { nameEn: 'A', type: 'hospital' } }]);
    expect(() => parseCsv('nameEn\nA\n', ['nameEn', 'type'])).toThrow(/missing column\(s\): type/);
  });

  it('rejects a row with the wrong number of values and an empty file', () => {
    expect(() => parseCsv('a,b\n1\n', [])).toThrow(/line 2: 1 values, but the header has 2/);
    expect(() => parseCsv('', [])).toThrow(/empty/);
  });

  it('accepts a header-only file', () => {
    expect(parseCsv('a,b\n', ['a']).records).toEqual([]);
  });
});
