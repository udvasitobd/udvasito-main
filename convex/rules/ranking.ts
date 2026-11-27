/**
 * Who is alerted about a blood request, and in what order — PRD §5.3, specs §6.10. Pure TypeScript, no Convex imports.
 *
 * Matching v1 (P1, build prompt item 9): live donors in the request's district, available, eligible today for the
 * component, the right group, platelet opt-in for platelets, inside the donor's own travel range — nearest first.
 * P2 adds neighbouring-thana tiers, quiet hours (S-21), the daily cap (S-20), blocks and "verified requests only".
 */
import { groupsFor, type BloodGroup, type RequestGroup } from './compatibility';
import { canDonate, type Component, type DonationHistory, type EligibilityRules } from './eligibility';
import { distanceKm } from './places';
import type { Settings } from './settings';

type Point = { lat: number; lng: number };

/** A donor profile joined with the profile fields matching needs (ids are strings so this stays Convex-free). */
export type Candidate = DonationHistory & {
  donorProfileId: string;
  profileId: string;
  bloodGroup: BloodGroup | 'unknown';
  districtId: string;
  upazilaId: string;
  travelRange: 'thana' | 'district';
  availability: 'available' | 'paused' | 'unavailable';
  plateletOptIn: boolean;
  live: boolean;
  isDemo: boolean;
  /** "YYYY-MM-DD" from the profile (age is checked on the day of the alert). */
  dateOfBirth: string;
  lastActiveAt: number;
};

export type MatchRequest = {
  requesterId: string;
  bloodGroup: RequestGroup;
  component: Component;
  districtId: string;
  upazilaId: string;
  point: Point;
  isDemo: boolean;
};

export type Ranked = Candidate & { km: number; exact: boolean };

export type RankingRules = EligibilityRules & Pick<Settings, 'compatibleInFinalWave'>;

export type RankOptions = {
  /** Compatible groups join only in the final wave (S-11). Matching v1 sends wave 1 only, so it passes `false`. */
  finalWave: boolean;
  /** Donor profiles already alerted for this request. */
  alreadyNotified: ReadonlySet<string>;
};

/**
 * The donors to alert, best first: nearest (donor's thana centre to the hospital), then exact group before
 * compatible, then most recently active, then a stable id order. `places` maps a thana id to its centre.
 */
export function rankCandidates(
  candidates: readonly Candidate[],
  request: MatchRequest,
  places: ReadonlyMap<string, Point>,
  rules: RankingRules,
  now: number,
  options: RankOptions,
): Ranked[] {
  const { exact, compatible } = groupsFor(request.bloodGroup, request.component, options.finalWave, rules);
  const exactSet = new Set<string>(exact);
  const allowed = new Set<string>([...exact, ...compatible]);
  const ranked: Ranked[] = [];
  for (const c of candidates) {
    if (c.isDemo !== request.isDemo) continue; // practice and real never meet (CLAUDE.md rule 6)
    if (!c.live || c.availability !== 'available') continue;
    if (c.profileId === request.requesterId || options.alreadyNotified.has(c.donorProfileId)) continue;
    if (!allowed.has(c.bloodGroup)) continue;
    if (request.component === 'platelets' && !c.plateletOptIn) continue;
    if (c.districtId !== request.districtId) continue;
    if (c.travelRange === 'thana' && c.upazilaId !== request.upazilaId) continue;
    if (!canDonate(c, request.component, now, rules, c.dateOfBirth).ok) continue;
    const home = places.get(c.upazilaId);
    if (!home) continue; // every donor's thana is seeded; a missing one is a data error, never a guess
    ranked.push({ ...c, km: distanceKm(home, request.point), exact: exactSet.has(c.bloodGroup) });
  }
  return ranked.sort(
    (a, b) =>
      a.km - b.km ||
      Number(b.exact) - Number(a.exact) ||
      b.lastActiveAt - a.lastActiveAt ||
      (a.donorProfileId < b.donorProfileId ? -1 : a.donorProfileId > b.donorProfileId ? 1 : 0),
  );
}
