/**
 * Blood banks for the SCR-M03 "no donors yet" panel (specs SCR-M03 item 6, `hospitals.bloodBanksNear` in §6.2):
 * listed places in the request's district that have a public blood-bank number, nearest first. These are
 * institutional numbers from `import-hospitals` (which warns on a mobile number), never a person's.
 *
 * A practice request only sees practice places, so nobody practising calls a real blood bank (specs §1.9).
 */
import type { Doc } from '../_generated/dataModel';
import type { QueryCtx } from '../_generated/server';
import { distanceKm } from '../rules/places';

import { roundKm } from './alertText';

/** One district's listed places — the same bound as `hospitals.search` without text. */
const DISTRICT_LIMIT = 50;

export type BloodBank = {
  hospitalId: Doc<'hospitals'>['_id'];
  name: { en: string; bn: string };
  phone: string;
  km: number;
};

export async function bloodBanksNear(ctx: QueryCtx, request: Doc<'requests'>): Promise<BloodBank[]> {
  const point = { lat: request.approxLat, lng: request.approxLng };
  const rows = await ctx.db
    .query('hospitals')
    .withIndex('by_district', (q) =>
      q.eq('isDemo', request.isDemo).eq('active', true).eq('districtId', request.districtId),
    )
    .take(DISTRICT_LIMIT);
  const banks: BloodBank[] = [];
  for (const row of rows) {
    if (!row.bloodBankPhone) continue;
    banks.push({
      hospitalId: row._id,
      name: { en: row.nameEn, bn: row.nameBn },
      phone: row.bloodBankPhone,
      km: roundKm(distanceKm(row, point)),
    });
  }
  return banks.sort((a, b) => a.km - b.km);
}
