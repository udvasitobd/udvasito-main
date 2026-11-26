/**
 * Reference-data loader for settings — run by `npm run seed:settings` (scripts/seed-settings.ts).
 * Idempotent: inserts missing keys only and never overwrites a value someone has set. The one exception is
 * `pilotDistrictIds` while it is still empty: it is filled once the Chattogram district exists (after seed-places).
 */
import { v } from 'convex/values';

import type { Id } from '../_generated/dataModel';
import { internalMutation, type MutationCtx } from '../_generated/server';
import { getSetting } from '../_lib/settings';
import { neighbourCodes, placeErrors } from '../rules/places';
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

// ── Places (npm run seed:places — scripts/seed-places.ts) ──────────────────────────────────────────────────────

const placeValidator = v.object({
  level: v.union(v.literal('division'), v.literal('district'), v.literal('upazila')),
  code: v.string(),
  nameEn: v.string(),
  nameBn: v.string(),
  parentCode: v.optional(v.string()),
  lat: v.number(),
  lng: v.number(),
  isMetroThana: v.boolean(),
});

async function placeByCode(ctx: MutationCtx, code: string) {
  return ctx.db
    .query('places')
    .withIndex('by_code', (q) => q.eq('code', code))
    .unique();
}

/**
 * Inserts places that are missing and updates names / centres that changed, matched by `code`. Never deletes a
 * place (people and requests point at them). The script sends batches in order — divisions, districts, upazilas —
 * so a parent always exists before its children. Neighbours are computed afterwards by `computeNeighbours`.
 */
export const upsertPlaces = internalMutation({
  args: { places: v.array(placeValidator) },
  handler: async (ctx, { places }) => {
    let inserted = 0;
    let updated = 0;
    let unchanged = 0;
    for (const p of places) {
      const problems = placeErrors(p);
      if (problems.length > 0) throw new Error(`invalid place: ${problems.join('; ')}`);
      let parentId: Id<'places'> | undefined;
      if (p.parentCode !== undefined) {
        const parent = await placeByCode(ctx, p.parentCode);
        if (!parent) throw new Error(`place ${p.code}: parent ${p.parentCode} is not loaded yet`);
        parentId = parent._id;
      }
      const fields = { level: p.level, code: p.code, nameEn: p.nameEn, nameBn: p.nameBn, parentId, lat: p.lat, lng: p.lng, isMetroThana: p.isMetroThana };
      const row = await placeByCode(ctx, p.code);
      if (!row) {
        await ctx.db.insert('places', { ...fields, neighbourIds: [] });
        inserted++;
      } else if (
        row.level !== fields.level || row.nameEn !== fields.nameEn || row.nameBn !== fields.nameBn || row.parentId !== fields.parentId ||
        row.lat !== fields.lat || row.lng !== fields.lng || row.isMetroThana !== fields.isMetroThana
      ) {
        await ctx.db.patch(row._id, fields);
        updated++;
      } else {
        unchanged++;
      }
    }
    return { inserted, updated, unchanged };
  },
});

/** Re-computes `neighbourIds` of every upazila / thana: centres within settings.neighbourKm (S-32). */
export const computeNeighbours = internalMutation({
  args: {},
  handler: async (ctx) => {
    const km = await getSetting(ctx, 'neighbourKm');
    const upazilas = await ctx.db
      .query('places')
      .withIndex('by_level_parent', (q) => q.eq('level', 'upazila'))
      .collect();
    const idByCode = new Map(upazilas.map((u) => [u.code, u._id]));
    const neighbours = neighbourCodes(upazilas, km);
    let changed = 0;
    for (const u of upazilas) {
      const ids = (neighbours.get(u.code) ?? []).map((code) => idByCode.get(code)!);
      if (ids.length !== u.neighbourIds.length || ids.some((id, i) => id !== u.neighbourIds[i])) {
        await ctx.db.patch(u._id, { neighbourIds: ids });
        changed++;
      }
    }
    const counts = { division: 0, district: 0, upazila: upazilas.length };
    for (const level of ['division', 'district'] as const) {
      counts[level] = (await ctx.db.query('places').withIndex('by_level_parent', (q) => q.eq('level', level)).collect()).length;
    }
    return { km, changed, counts, metroThanas: upazilas.filter((u) => u.isMetroThana).length };
  },
});

