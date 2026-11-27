/**
 * Places — specs §6.2 `places.list` (division → district → thana/upazila pickers, SCR-D02 and the request form).
 * Public reference data (seed-places). `parentId` lets the app find a thana's district and division on the device,
 * so "Use my location once" never sends the location anywhere.
 */
import { v } from 'convex/values';

import { publicQuery } from './_lib/auth';

export const list = publicQuery({
  args: {
    level: v.union(v.literal('division'), v.literal('district'), v.literal('upazila')),
    parentId: v.optional(v.id('places')),
  },
  handler: async (ctx, { level, parentId }) => {
    const rows = await ctx.db
      .query('places')
      .withIndex('by_level_parent', (q) =>
        parentId === undefined ? q.eq('level', level) : q.eq('level', level).eq('parentId', parentId),
      )
      .collect();
    return rows.map((place) => ({
      _id: place._id,
      nameEn: place.nameEn,
      nameBn: place.nameBn,
      lat: place.lat,
      lng: place.lng,
      parentId: place.parentId ?? null,
    }));
  },
});
