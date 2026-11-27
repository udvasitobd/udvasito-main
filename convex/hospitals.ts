/**
 * Hospitals — specs §6.2 `hospitals.search` (CMP-PlacePicker). Public reference data loaded by `import-hospitals`
 * (DEP-01). Practice-area hospitals are never listed here (they arrive with the practice area, P5).
 */
import { v } from 'convex/values';

import type { Doc } from './_generated/dataModel';
import type { QueryCtx } from './_generated/server';
import { publicQuery } from './_lib/auth';
import { toLatinDigits } from './rules/validation';

/** specs §6.2: "top 10". */
const SEARCH_LIMIT = 10;
/** "Hospitals near you": every listed hospital of one district, sorted by distance on the device. */
const DISTRICT_LIMIT = 50;
/** Longer input is not a hospital name; it is cut rather than refused. */
const QUERY_MAX_LENGTH = 100;

async function shape(ctx: QueryCtx, hospital: Doc<'hospitals'>) {
  const upazila = await ctx.db.get(hospital.upazilaId);
  return {
    _id: hospital._id,
    nameEn: hospital.nameEn,
    nameBn: hospital.nameBn,
    type: hospital.type,
    divisionId: hospital.divisionId,
    districtId: hospital.districtId,
    upazila: upazila ? { _id: upazila._id, nameEn: upazila.nameEn, nameBn: upazila.nameBn } : null,
    lat: hospital.lat,
    lng: hospital.lng,
  };
}

/**
 * Names and aliases ("CMCH", "চমেক") through the `search_all` index. Empty text with a district lists that district's
 * hospitals (for "Hospitals near you"); empty text without one returns nothing.
 */
export const search = publicQuery({
  args: { text: v.string(), districtId: v.optional(v.id('places')) },
  handler: async (ctx, { text, districtId }) => {
    const query = toLatinDigits(text).toLowerCase().replace(/\s+/g, ' ').trim().slice(0, QUERY_MAX_LENGTH);
    let rows: Doc<'hospitals'>[];
    if (query === '') {
      if (!districtId) return [];
      rows = await ctx.db
        .query('hospitals')
        .withIndex('by_district', (q) => q.eq('isDemo', false).eq('active', true).eq('districtId', districtId))
        .take(DISTRICT_LIMIT);
    } else {
      rows = await ctx.db
        .query('hospitals')
        .withSearchIndex('search_all', (q) => {
          const base = q.search('searchText', query).eq('isDemo', false).eq('active', true);
          return districtId ? base.eq('districtId', districtId) : base;
        })
        .take(SEARCH_LIMIT);
    }
    return Promise.all(rows.map((row) => shape(ctx, row)));
  },
});
