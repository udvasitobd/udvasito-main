import { describe, expect, it } from 'vitest';

import { buildPlaces, exportTable, stripThana, type PlaceSources } from './places-build';

// Test fixtures in the shape of the source files (values illustrative).
const rec = (line: number, values: Record<string, string>) => ({ line, values });

function sources(overrides: Partial<PlaceSources> = {}): PlaceSources {
  return {
    divisions: [{ id: '1', name: 'Chattogram', bn_name: 'চট্টগ্রাম', bbs_code: 'BD20', lat: '22.7', lon: '91.7' }],
    districts: [{ id: '8', division_id: '1', name: 'Chattogram', bn_name: 'চট্টগ্রাম', bbs_code: 'BD2015', lat: '22.335109', lon: '91.834073' }],
    upazilas: [{ id: '1', district_id: '8', name: 'Hathazari ', bn_name: 'হাটহাজারী', bbs_code: 'BD20150037', lat: '22.5', lon: '91.8' }],
    bbsPoints: [rec(2, { v03_pcode: 'BD20150057', name: 'Panchlaish', adm2_pcode: 'BD2015', lat: '22.375716', lon: '91.82739' })],
    bdGeocodeUpazilas: [
      { id: '569', name: 'Panchlaish', bn_name: 'পাঁচলাইশ থানা', lat: '22.36', lng: '91.83' },
      { id: '571', name: 'Shodhorgat', bn_name: 'সদরঘাট থানা', lat: '22.32981900', lng: '91.83115300' },
      { id: '556', name: 'Akborsha', bn_name: 'আকবর শাহ', lat: null, lng: null },
    ],
    metroThanas: [
      rec(2, { code: 'BD20150057', nameEn: 'Panchlaish', nameBn: 'পাঁচলাইশ', bbsV03: 'BD20150057', bdGeocodeId: '569', lat: '', lng: '' }),
      rec(3, { code: 'X-SADARGHAT', nameEn: 'Sadarghat', nameBn: 'সদরঘাট', bbsV03: '', bdGeocodeId: '571', lat: '', lng: '' }),
      rec(4, { code: 'X-AKBARSHAH', nameEn: 'Akbar Shah', nameBn: 'আকবর শাহ', bbsV03: '', bdGeocodeId: '556', lat: '', lng: '' }),
    ],
    ...overrides,
  };
}

describe('exportTable and stripThana', () => {
  it('reads a phpMyAdmin JSON export table', () => {
    const file = [{ type: 'header' }, { type: 'database', name: 'x' }, { type: 'table', name: 'districts', data: [{ id: '1' }] }];
    expect(exportTable(file, 'districts')).toEqual([{ id: '1' }]);
    expect(() => exportTable(file, 'upazilas')).toThrow(/not found/);
    expect(() => exportTable({}, 'districts')).toThrow(/not a phpMyAdmin/);
  });

  it('removes the trailing থানা only', () => {
    expect(stripThana('পাঁচলাইশ থানা')).toBe('পাঁচলাইশ');
    expect(stripThana(' আকবর শাহ ')).toBe('আকবর শাহ');
  });
});

describe('buildPlaces', () => {
  it('maps the hierarchy by BBS code and trims names', () => {
    const { places } = buildPlaces(sources());
    const byCode = new Map(places.map((p) => [p.code, p]));
    expect(byCode.get('BD2015')).toMatchObject({ level: 'district', parentCode: 'BD20', lat: 22.335109 });
    expect(byCode.get('BD20150037')).toMatchObject({ nameEn: 'Hathazari', parentCode: 'BD2015', isMetroThana: false });
  });

  it('takes metro-thana centres from BBS first, then bd-geocode, and reports where', () => {
    const { places, report } = buildPlaces(sources());
    const byCode = new Map(places.map((p) => [p.code, p]));
    expect(byCode.get('BD20150057')).toMatchObject({ isMetroThana: true, parentCode: 'BD2015', lat: 22.375716, lng: 91.82739 });
    expect(byCode.get('X-SADARGHAT')).toMatchObject({ lat: 22.329819, lng: 91.831153 });
    expect(report.notes).toContain('chattogram-metro-thanas.csv line 3 (Sadarghat): centre from bd-geocode');
  });

  it('leaves out a thana with no centre anywhere instead of inventing one', () => {
    const { places, report } = buildPlaces(sources());
    expect(places.some((p) => p.code === 'X-AKBARSHAH')).toBe(false);
    expect(report.skipped.join()).toMatch(/Akbar Shah.*no centre/);
  });

  it('uses centres typed in the csv, and reports a Bangla name that differs from the source', () => {
    const s = sources();
    s.metroThanas[2] = rec(4, { code: 'X-AKBARSHAH', nameEn: 'Akbar Shah', nameBn: 'আকবরশাহ', bbsV03: '', bdGeocodeId: '556', lat: '22.37', lng: '91.79' });
    const { places, report } = buildPlaces(s);
    expect(places.find((p) => p.code === 'X-AKBARSHAH')).toMatchObject({ lat: 22.37, lng: 91.79 });
    expect(report.notes.join()).toMatch(/Bangla "আকবরশাহ" differs/);
  });

  it('fails on a reference that does not exist', () => {
    const s = sources();
    s.metroThanas[0] = rec(2, { code: 'C', nameEn: 'X', nameBn: 'এক্স', bbsV03: 'BD99999999', bdGeocodeId: '', lat: '', lng: '' });
    expect(() => buildPlaces(s)).toThrow(/not in the BBS points/);
    expect(() => buildPlaces(sources({ districts: [] }))).toThrow(/Chattogram not found/);
  });
});
