/**
 * A donor's answer to a request — specs §6.3 `responses.accept` / `decline`, PRD §5.5. Pure TypeScript, no Convex
 * imports (CLAUDE.md rule 10).
 *
 * - Only a donor who has not answered yet can answer (`notified` / `opened`).
 * - Accepting re-checks the rules at that moment: a live donor profile, the right group, platelet opt-in, age and the
 *   donation interval. The reasons are the `ERR_NOT_ELIGIBLE` reasons of specs §6.7.
 * - The first `unitsNeeded + S-12` donors are confirmed; later ones wait on standby.
 * - A confirmed slot's contact details stay visible until S-18 days after the request closes; while it is open, the
 *   latest possible close is the auto-close time (S-17 after needed-by).
 */
import { groupsFor, type BloodGroup, type RequestGroup } from './compatibility';
import { canDonate, type Component, type DonationHistory } from './eligibility';
import type { Settings } from './settings';

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;

export type ResponseState =
  'notified' | 'opened' | 'accepted' | 'confirmed' | 'standby' | 'declined' | 'withdrew' | 'not_responding';

export function canAnswer(state: ResponseState): boolean {
  return state === 'notified' || state === 'opened';
}

export type NotEligible =
  | { reason: 'notLive' }
  | { reason: 'group' }
  | { reason: 'platelets' }
  | { reason: 'age'; min: number; max: number }
  | { reason: 'cooldown'; date: number };

export type AcceptingDonor = DonationHistory & {
  live: boolean;
  bloodGroup: BloodGroup | 'unknown';
  plateletOptIn: boolean;
  /** "YYYY-MM-DD" from the profile. */
  dateOfBirth: string;
};

/** Null when the donor may accept now; otherwise why not. */
export function whyNotEligible(
  donor: AcceptingDonor,
  request: { bloodGroup: RequestGroup; component: Component },
  now: number,
  settings: Settings,
): NotEligible | null {
  if (!donor.live) return { reason: 'notLive' };
  const { exact } = groupsFor(request.bloodGroup, request.component, false, settings);
  if (donor.bloodGroup === 'unknown' || !exact.includes(donor.bloodGroup)) return { reason: 'group' };
  if (request.component === 'platelets' && !donor.plateletOptIn) return { reason: 'platelets' };
  const result = canDonate(donor, request.component, now, settings, donor.dateOfBirth);
  if (result.ok) return null;
  if (result.reason === 'interval') return { reason: 'cooldown', date: result.date ?? now };
  return { reason: 'age', min: settings.minAge, max: settings.maxDonorAge };
}

/** Confirmed while fewer than `unitsNeeded + S-12` donors are confirmed (the extra slot covers a no-show). */
export function slotFor(
  confirmedSoFar: number,
  unitsNeeded: number,
  settings: Pick<Settings, 'extraConfirmedSlots'>,
): 'confirmed' | 'standby' {
  return confirmedSoFar < unitsNeeded + settings.extraConfirmedSlots ? 'confirmed' : 'standby';
}

/** `requests.unitsConfirmed` never counts the extra slot. */
export function unitsCovered(confirmed: number, unitsNeeded: number): number {
  return Math.min(confirmed, unitsNeeded);
}

/** When a confirmed slot's contact details stop showing (S-18 after close; an open request: after auto-close). */
export function contactExpiry(
  request: { neededBy: number; closedAt?: number },
  now: number,
  settings: Pick<Settings, 'autoCloseAfterNeededHours' | 'contactVisibleAfterCloseDays'>,
): number {
  const closesAt = request.closedAt ?? Math.max(request.neededBy, now) + settings.autoCloseAfterNeededHours * HOUR_MS;
  return closesAt + settings.contactVisibleAfterCloseDays * DAY_MS;
}

/** "Donated recently" while declining (SCR-D04): the later of the known and the new date counts. */
export function laterDonation(current: string | undefined, donated: string): string {
  return current !== undefined && current > donated ? current : donated;
}
