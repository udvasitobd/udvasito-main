/**
 * Checks `data/hospitals.csv` (roadmap §5.1, DEP-01) against the places dataset. Pure. Bad rows are rejected with
 * reasons (by line number); good rows are imported. Reports never print a phone number (CLAUDE.md rule 3).
 */
import { hospitalSearchText, splitAliases } from '../../convex/rules/hospitals';
import { insideBangladesh, type PlaceInput } from '../../convex/rules/places';
import { findPhoneNumbers } from '../../src/lib/scrub';
import type { CsvRecord } from './csv';

export const HOSPITAL_COLUMNS = [
  'nameEn',
  'nameBn',
  'aliases',
  'type',
  'district',
  'upazila',
  'address',
  'bloodBankPhone',
  'lat',
  'lng',
  'active',
  'source',
  'checkedOn',
] as const;

export const HOSPITAL_TYPES = ['hospital', 'blood_bank', 'clinic'] as const;
export type HospitalType = (typeof HOSPITAL_TYPES)[number];

/** One checked row, as sent to `admin/seed:upsertHospitals` (the server writes `searchText` and the place ids). */
export type HospitalRow = {
  nameEn: string;
  nameBn: string;
  aliases: string[];
  type: HospitalType;
  districtCode: string;
  upazilaCode: string;
  address?: string;
  bloodBankPhone?: string;
  lat: number;
  lng: number;
  active: boolean;
};

export type HospitalCheck = {
  rows: HospitalRow[];
  rejected: { line: number; reasons: string[] }[];
  warnings: { line: number; message: string }[];
};

const BENGALI = /[ঀ-৿]/;
const PHONE_CHARS = /^[0-9০-৯+\-() ]+$/;
const DIGITS = /[0-9০-৯]/g;

const clean = (s: string | undefined) => (s ?? '').trim().replace(/\s+/g, ' ');
const key = (s: string) => clean(s).toLowerCase();

function validDate(s: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const d = new Date(`${s}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s;
}

function decimal(s: string): number | undefined {
  return /^-?\d+(\.\d+)?$/.test(s) ? Number(s) : undefined;
}

export function checkHospitals(records: readonly CsvRecord[], places: readonly PlaceInput[]): HospitalCheck {
  const districts = new Map(places.filter((p) => p.level === 'district').map((p) => [key(p.nameEn), p]));
  const upazilas = new Map(places.filter((p) => p.level === 'upazila').map((p) => [`${p.parentCode}|${key(p.nameEn)}`, p]));
  const seen = new Map<string, number>();
  const out: HospitalCheck = { rows: [], rejected: [], warnings: [] };

  for (const { line, values: r } of records) {
    const reasons: string[] = [];
    const nameEn = clean(r.nameEn);
    const nameBn = clean(r.nameBn);
    if (!nameEn) reasons.push('nameEn is empty');
    if (!BENGALI.test(nameBn)) reasons.push('nameBn has no Bangla text');

    const type = clean(r.type) as HospitalType;
    if (!HOSPITAL_TYPES.includes(type)) reasons.push(`type must be one of ${HOSPITAL_TYPES.join(', ')}`);

    const district = districts.get(key(r.district ?? ''));
    if (!district) reasons.push(`unknown district "${clean(r.district)}"`);
    const upazila = district ? upazilas.get(`${district.code}|${key(r.upazila ?? '')}`) : undefined;
    if (district && !upazila) reasons.push(`unknown upazila/thana "${clean(r.upazila)}" in ${district.nameEn}`);

    const lat = decimal(clean(r.lat));
    const lng = decimal(clean(r.lng));
    if (lat === undefined || lng === undefined) reasons.push('lat and lng must be decimal numbers');
    else if (!insideBangladesh(lat, lng)) reasons.push('lat/lng are outside Bangladesh (swapped?)');

    const active = key(r.active ?? '');
    if (active !== 'true' && active !== 'false') reasons.push('active must be true or false');
    if (!clean(r.source)) reasons.push('source is empty');
    if (!validDate(clean(r.checkedOn))) reasons.push('checkedOn must be a date YYYY-MM-DD');

    const phone = clean(r.bloodBankPhone);
    if (phone) {
      const digits = phone.match(DIGITS)?.length ?? 0;
      if (!PHONE_CHARS.test(phone) || digits < 6 || digits > 15) reasons.push('bloodBankPhone is not a phone number');
      else if (findPhoneNumbers(phone).length > 0) {
        out.warnings.push({ line, message: "bloodBankPhone is a mobile number — confirm it is the blood bank's public number, never a person's" });
      }
    }

    const dupKey = district ? `${district.code}|${key(nameEn)}` : '';
    if (nameEn && district) {
      const first = seen.get(dupKey);
      if (first !== undefined) reasons.push(`same nameEn and district as line ${first}`);
      else seen.set(dupKey, line);
    }

    if (reasons.length > 0 || !district || !upazila || lat === undefined || lng === undefined) {
      out.rejected.push({ line, reasons });
      continue;
    }
    const address = clean(r.address);
    out.rows.push({
      nameEn,
      nameBn,
      aliases: splitAliases(r.aliases ?? ''),
      type,
      districtCode: district.code,
      upazilaCode: upazila.code,
      ...(address ? { address } : {}),
      ...(phone ? { bloodBankPhone: phone } : {}),
      lat,
      lng,
      active: active === 'true',
    });
  }
  return out;
}

/** The `searchText` the server stores for a row (exported for the report and tests). */
export const searchTextOf = (row: HospitalRow) => hospitalSearchText(row.nameEn, row.nameBn, row.aliases);
