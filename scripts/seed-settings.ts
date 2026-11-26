/**
 * npm run seed:settings [-- --prod] [-- --telegram-bot <username>]
 *
 * Writes the §5.2 settings rows that are missing (never overwrites a value that was set). Safe to run again.
 * One of the three loaders allowed against production (CLAUDE.md rule 17).
 */
import { argValue, parseTarget, runFunction } from './lib/convex-cli';

const argv = process.argv.slice(2);
const target = parseTarget(argv);
const telegramBot = argValue(argv, '--telegram-bot');

const result = runFunction<{ inserted: number; updated: string[]; kept: number; pilotDistrictFound: boolean }>(
  'admin/seed:seedSettings',
  { environment: target.prod ? 'production' : 'staging', ...(telegramBot ? { telegramBot } : {}) },
  target,
);

console.log(`settings: ${result.inserted} added, ${result.kept} kept as they were` +
  (result.updated.length ? `, filled: ${result.updated.join(', ')}` : ''));
if (!result.pilotDistrictFound) {
  console.log('note: places are not loaded yet — run `npm run seed:places`, then this again to fill pilotDistrictIds.');
}
