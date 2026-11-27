import { describe, expect, it } from 'vitest';

import type { PlaceInput } from '../../convex/rules/places';
import { checkHospitals, searchTextOf } from './hospitals-csv';

// Test fixtures only. The example row is the illustrative one from roadmap §5.1; its phone column is a placeholder shape.
const places: PlaceInput[] = [
  { level: 'division', code: 'BD20', nameEn: 'Chattogram', nameBn: 'চট্টগ্রাম', lat: 22.7, lng: 91.7, isMetroThana: false },
  { level: 'district', code: 'BD2015', nameEn: 'Chattogram', nameBn: 'চট্টগ্রাম', parentCode: 'BD20', lat: 22.33, lng: 91.83, isMetroThana: false },
  { level: 'upazila', code: 'BD20150057', nameEn: 'Panchlaish', nameBn: 'পাঁচলাইশ', parentCode: 'BD2015', lat: 22.37, lng: 91.82, isMetroThana: true },
];

const good = {
  nameEn: 'Chittagong Medical College Hospital',
  nameBn: 'চট্টগ্রাম মেডিকেল কলেজ হাসপাতাল',
  aliases: 'CMCH;চমেক;Chittagong Medical;Medical',
  type: 'hospital',
  district: 'Chattogram',
  upazila: 'Panchlaish',
  address: 'K.B. Fazlul Kader Road',
  bloodBankPhone: '',
  lat: '22.35950',
  lng: '91.83090',
  active: 'true',
  source: 'hospital website',
  checkedOn: '2026-11-25',
};

const rows = (...list: Record<string, string>[]) => list.map((values, i) => ({ line: i + 2, values }));

describe('checkHospitals', () => {
  it('accepts the roadmap example and resolves place codes', () => {
    const r = checkHospitals(rows(good), places);
    expect(r.rejected).toEqual([]);
    expect(r.rows[0]).toEqual({
      nameEn: 'Chittagong Medical College Hospital',
      nameBn: 'চট্টগ্রাম মেডিকেল কলেজ হাসপাতাল',
      aliases: ['CMCH', 'চমেক', 'Chittagong Medical', 'Medical'],
      type: 'hospital',
      districtCode: 'BD2015',
      upazilaCode: 'BD20150057',
      address: 'K.B. Fazlul Kader Road',
      lat: 22.3595,
      lng: 91.8309,
      active: true,
    });
    expect(searchTextOf(r.rows[0]!)).toContain('cmch');
  });

  it('matches district and upazila names without caring about case or spaces', () => {
    expect(checkHospitals(rows({ ...good, district: ' chattogram ', upazila: 'PANCHLAISH' }), places).rows).toHaveLength(1);
  });

  it.each<[string, Record<string, string>, RegExp]>([
    ['unknown district', { district: 'Chittagong' }, /unknown district "Chittagong"/],
    ['unknown upazila', { upazila: 'Panchlais' }, /unknown upazila\/thana "Panchlais" in Chattogram/],
    ['swapped coordinates', { lat: '91.8309', lng: '22.3595' }, /outside Bangladesh/],
    ['bad coordinates', { lat: '22,35' }, /decimal numbers/],
    ['bad type', { type: 'Hospital ' }, /type must be one of/],
    ['no Bangla', { nameBn: 'CMCH' }, /no Bangla/],
    ['bad active', { active: 'yes' }, /true or false/],
    ['no source', { source: ' ' }, /source is empty/],
    ['bad date', { checkedOn: '2026-02-30' }, /YYYY-MM-DD/],
    ['bad phone', { bloodBankPhone: 'call the ward' }, /not a phone number/],
  ])('rejects %s', (_, change, reason) => {
    const r = checkHospitals(rows({ ...good, ...change }), places);
    expect(r.rows).toEqual([]);
    expect(r.rejected[0]?.reasons.join('\n')).toMatch(reason);
  });

  it('rejects the second row with the same name in the same district, keeps the first', () => {
    const r = checkHospitals(rows(good, { ...good, nameEn: 'chittagong medical college hospital ' }), places);
    expect(r.rows).toHaveLength(1);
    expect(r.rejected).toEqual([{ line: 3, reasons: ['same nameEn and district as line 2'] }]);
  });

  it('warns about a mobile number without ever printing it, and accepts a landline', () => {
    const mobile = checkHospitals(rows({ ...good, bloodBankPhone: '01712-345678' }), places);
    expect(mobile.rows).toHaveLength(1);
    expect(mobile.warnings).toHaveLength(1);
    expect(JSON.stringify(mobile.warnings)).not.toMatch(/345678/);
    const landline = checkHospitals(rows({ ...good, bloodBankPhone: '031-123456' }), places);
    expect(landline.warnings).toEqual([]);
    expect(landline.rows[0]?.bloodBankPhone).toBe('031-123456');
  });

  it('accepts an empty aliases column and an inactive row', () => {
    const r = checkHospitals(rows({ ...good, aliases: '', active: 'FALSE' }), places);
    expect(r.rows[0]).toMatchObject({ aliases: [], active: false });
  });
});
