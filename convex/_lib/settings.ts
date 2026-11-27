/**
 * Typed settings reader (specs §5.2). Rows live in the `settings` table; defaults and ranges live in
 * `convex/rules/settings.ts`. Logic always reads values through here — never a typed-in number (CLAUDE.md rule 9).
 */
import type { QueryCtx } from '../_generated/server';
import {
  checkSetting,
  resolveSettings,
  SETTING_DEFS,
  type SettingKey,
  type Settings,
} from '../rules/settings';

/** All settings (≈60 small rows, read through the `by_key` index). */
export async function getSettings(ctx: QueryCtx): Promise<Settings> {
  const rows = await ctx.db.query('settings').withIndex('by_key').collect();
  const { settings, invalid } = resolveSettings(rows);
  if (invalid.length > 0) console.warn('settings: stored value out of range, default used', { keys: invalid });
  return settings;
}

/** One setting by key; a missing or out-of-range row falls back to its default. */
export async function getSetting<K extends SettingKey>(ctx: QueryCtx, key: K): Promise<Settings[K]> {
  const row = await ctx.db
    .query('settings')
    .withIndex('by_key', (q) => q.eq('key', key))
    .unique();
  if (row) {
    const check = checkSetting(key, row.value);
    if (check.ok) return check.value;
    console.warn('settings: stored value out of range, default used', { key });
  }
  return structuredClone(SETTING_DEFS[key].default) as Settings[K];
}
