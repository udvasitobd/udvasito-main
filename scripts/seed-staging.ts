/**
 * npm run seed:staging [-- --prod] [-- --per-group <1-5>]
 *
 * FAKE data for staging and dev deployments only: donors in all 8 groups across every Chattogram upazila /
 * metropolitan thana (convex/admin/seedStaging.ts). The deployment itself refuses unless its SITE_URL is a staging
 * or local address — production can never be seeded (CLAUDE.md rule 17). `--prod` here means the prod deployment of
 * the configured project, which for `udvasito-staging` is staging.
 *
 * Run `npm run seed:places` first.
 */
import { argValue, parseTarget, runFunction } from './lib/convex-cli';

const argv = process.argv.slice(2);
const target = parseTarget(argv);
const perGroup = argValue(argv, '--per-group');

const result = runFunction<{ inserted: number; kept: number; places: number; groups: number }>(
  'admin/seedStaging:seedDonors',
  perGroup ? { perGroupPerPlace: Number(perGroup) } : {},
  target,
);
console.log(`staging donors: ${result.inserted} added, ${result.kept} already there (${result.groups} groups × ${result.places} Chattogram places)`);
