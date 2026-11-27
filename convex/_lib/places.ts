/** Place checks shared by donor setup and blood requests. */
import type { Doc, Id } from '../_generated/dataModel';
import type { QueryCtx } from '../_generated/server';
import { validationError } from './errors';

/**
 * VAL-14a / VAL-07: a division, one of its districts and one of that district's thanas/upazilas. Returns the thana
 * (its point is the request's location when no hospital is chosen).
 */
export async function checkPlaceChain(
  ctx: QueryCtx,
  ids: { divisionId: Id<'places'>; districtId: Id<'places'>; upazilaId: Id<'places'> },
  error: { field: string; messageKey: string },
): Promise<Doc<'places'>> {
  const [division, district, upazila] = await Promise.all([
    ctx.db.get(ids.divisionId),
    ctx.db.get(ids.districtId),
    ctx.db.get(ids.upazilaId),
  ]);
  const chain =
    division?.level === 'division' &&
    district?.level === 'district' &&
    district.parentId === division._id &&
    upazila?.level === 'upazila' &&
    upazila.parentId === district._id;
  if (!chain || !upazila) throw validationError(error);
  return upazila;
}
