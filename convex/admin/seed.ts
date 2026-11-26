/**
 * Reference-data loader for settings — run by `npm run seed:settings` (scripts/seed-settings.ts).
 * Idempotent: inserts missing keys only and never overwrites a value someone has set. The one exception is
 * `pilotDistrictIds` while it is still empty: it is filled once the Chattogram district exists (after seed-places).
 */
import { v } from 'convex/values';

import { internalMutation } from '../_generated/server';
import { SETTING_KEYS, seedValues } from '../rules/settings';

/** OQ-12: the pilot starts in Chattogram district. */
const PILOT_DISTRICT_NAME_EN = 'Chattogram';

export const seedSettings = internalMutation({
  args: {
    environment: v.union(v.literal('staging'), v.literal('production')),
    telegramBot: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const districts = await ctx.db
      .query('places')
      .withIndex('by_level_parent', (q) => q.eq('level', 'district'))
      .collect();
    const pilot = districts.find((d) => d.nameEn === PILOT_DISTRICT_NAME_EN);
    const pilotDistrictIds = pilot ? [String(pilot._id)] : [];

    const values = seedValues(args.environment, {
      ...(args.telegramBot !== undefined ? { telegramBot: args.telegramBot } : {}),
      pilotDistrictIds,
    });

    const inserted: string[] = [];
    const kept: string[] = [];
    const updated: string[] = [];
    for (const key of SETTING_KEYS) {
      const row = await ctx.db
        .query('settings')
        .withIndex('by_key', (q) => q.eq('key', key))
        .unique();
      if (!row) {
        await ctx.db.insert('settings', { key, value: values[key] });
        inserted.push(key);
      } else if (key === 'pilotDistrictIds' && Array.isArray(row.value) && row.value.length === 0 && pilotDistrictIds.length > 0) {
        await ctx.db.patch(row._id, { value: pilotDistrictIds });
        updated.push(key);
      } else {
        kept.push(key);
      }
    }
    return { inserted: inserted.length, updated, kept: kept.length, pilotDistrictFound: pilot !== undefined };
  },
});
