/**
 * Reference-data loader for settings — run by `npm run seed:settings` (scripts/seed-settings.ts).
 * Idempotent: inserts missing keys only and never overwrites a value someone has set. The one exception is
 * `pilotDistrictIds` while it is still empty: it is filled once the Chattogram district exists (after seed-places).
 */
import { v } from 'convex/values';

import type { Doc, Id } from '../_generated/dataModel';
import { internalMutation, type MutationCtx } from '../_generated/server';
import { deploymentEnvironment } from '../_lib/environment';
import { getSetting } from '../_lib/settings';
import { hospitalSearchText } from '../rules/hospitals';
import { insideBangladesh, neighbourCodes, placeErrors } from '../rules/places';
import { SETTING_KEYS, seedValues } from '../rules/settings';

/** OQ-12: the pilot starts in Chattogram district. */
const PILOT_DISTRICT_NAME_EN = 'Chattogram';

/**
 * The environment (staging or production values) comes from the deployment's SITE_URL, not from the CLI: staging is
 * the prod deployment of the `udvasito-staging` project, so `--prod` cannot tell them apart.
 */
export const seedSettings = internalMutation({
  args: {
    telegramBot: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const environment = deploymentEnvironment();
    const districts = await ctx.db
      .query('places')
      .withIndex('by_level_parent', (q) => q.eq('level', 'district'))
      .collect();
    const pilot = districts.find((d) => d.nameEn === PILOT_DISTRICT_NAME_EN);
    const pilotDistrictIds = pilot ? [String(pilot._id)] : [];

    const values = seedValues(environment, {
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
    return { environment, inserted: inserted.length, updated, kept: kept.length, pilotDistrictFound: pilot !== undefined };
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

// ── Hospitals (npm run import:hospitals — scripts/import-hospitals.ts, roadmap §5.1) ───────────────────────────

const hospitalValidator = v.object({
  nameEn: v.string(),
  nameBn: v.string(),
  aliases: v.array(v.string()),
  type: v.union(v.literal('hospital'), v.literal('blood_bank'), v.literal('clinic')),
  districtCode: v.string(),
  upazilaCode: v.string(),
  address: v.optional(v.string()),
  bloodBankPhone: v.optional(v.string()),
  lat: v.number(),
  lng: v.number(),
  active: v.boolean(),
});

/**
 * Real (not practice-area) hospitals, matched by English name inside their district, so running the import again
 * updates rows instead of adding copies. Rows missing from the file are left as they are (set active=false to hide one).
 * The script has already checked each row; this re-checks what the database depends on.
 */
export const upsertHospitals = internalMutation({
  args: { rows: v.array(hospitalValidator) },
  handler: async (ctx, { rows }) => {
    let inserted = 0;
    let updated = 0;
    let unchanged = 0;
    for (const r of rows) {
      const where = `hospital "${r.nameEn}"`;
      if (!r.nameEn.trim() || !r.nameBn.trim()) throw new Error(`${where}: names are required`);
      if (!insideBangladesh(r.lat, r.lng)) throw new Error(`${where}: lat/lng outside Bangladesh`);
      const district = await placeByCode(ctx, r.districtCode);
      const upazila = await placeByCode(ctx, r.upazilaCode);
      if (!district || district.level !== 'district' || !district.parentId) throw new Error(`${where}: district ${r.districtCode} not loaded`);
      if (!upazila || upazila.level !== 'upazila' || upazila.parentId !== district._id) {
        throw new Error(`${where}: upazila ${r.upazilaCode} is not in district ${r.districtCode}`);
      }
      const fields = {
        nameEn: r.nameEn,
        nameBn: r.nameBn,
        aliases: r.aliases,
        searchText: hospitalSearchText(r.nameEn, r.nameBn, r.aliases),
        type: r.type,
        divisionId: district.parentId,
        districtId: district._id,
        upazilaId: upazila._id,
        address: r.address,
        bloodBankPhone: r.bloodBankPhone,
        lat: r.lat,
        lng: r.lng,
        active: r.active,
      };
      const name = r.nameEn.trim().toLowerCase();
      let existing: Doc<'hospitals'> | undefined;
      for (const active of [true, false]) {
        const inDistrict = await ctx.db
          .query('hospitals')
          .withIndex('by_district', (q) => q.eq('isDemo', false).eq('active', active).eq('districtId', district._id))
          .collect();
        existing ??= inDistrict.find((h) => h.nameEn.trim().toLowerCase() === name);
      }
      if (!existing) {
        await ctx.db.insert('hospitals', { ...fields, isDemo: false });
        inserted++;
      } else if (
        (Object.keys(fields) as (keyof typeof fields)[]).some((k) => JSON.stringify(existing[k]) !== JSON.stringify(fields[k]))
      ) {
        await ctx.db.patch(existing._id, fields);
        updated++;
      } else {
        unchanged++;
      }
    }
    return { inserted, updated, unchanged };
  },
});
