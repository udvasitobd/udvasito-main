/**
 * Donor eligibility 🩺 — PRD §5.1, specs §5.4 / §6.10. Pure TypeScript, no Convex imports; every number comes from
 * `Settings` (CLAUDE.md rule 9). The app shows these rules as general guidance; the blood bank decides.
 */
import type { Settings } from './settings';
import { dhakaDate, dhakaMidnightAfter } from './time';
import { ageOn } from './validation';

export type Component = 'whole_blood' | 'platelets';
export type Gender = 'male' | 'female' | 'other' | 'unspecified';

/** The donor fields eligibility depends on (a subset of `donorProfiles`). */
export type DonationHistory = {
  gender: Gender;
  neverDonated: boolean;
  /** "YYYY-MM-DD" (Dhaka calendar date); VAL-14b makes it required unless `neverDonated`. */
  lastDonationDate?: string;
  lastDonationType?: Component;
};

export type EligibilityRules = Pick<
  Settings,
  'minAge' | 'maxDonorAge' | 'intervalWholeMaleDays' | 'intervalWholeOtherDays' | 'intervalPlateletDays' | 'intervalPlateletToWholeDays'
>;

/** Whole-blood interval by gender: S-04 for men, S-05 for women, other and "prefer not to say" (OQ-14). */
function wholeBloodIntervalDays(gender: Gender, rules: EligibilityRules): number {
  return gender === 'male' ? rules.intervalWholeMaleDays : rules.intervalWholeOtherDays;
}

/**
 * When the donor may next give whole blood (`eligibleFrom`) and platelets (`eligibleFromPlatelets`), as timestamps of
 * 00:00 Dhaka time. Never donated (or no date) → 0.
 * - after whole blood: whole blood + S-04/S-05; platelets + the same whole-blood interval (S-07, conservative);
 * - after platelets: platelets + S-06; whole blood + S-07.
 * A date without a type counts as whole blood — the longer, safer interval.
 */
export function computeEligibility(
  donor: DonationHistory,
  rules: EligibilityRules,
): { eligibleFrom: number; eligibleFromPlatelets: number } {
  if (donor.neverDonated || !donor.lastDonationDate) return { eligibleFrom: 0, eligibleFromPlatelets: 0 };
  const date = donor.lastDonationDate;
  if (donor.lastDonationType === 'platelets') {
    return {
      eligibleFrom: dhakaMidnightAfter(date, rules.intervalPlateletToWholeDays),
      eligibleFromPlatelets: dhakaMidnightAfter(date, rules.intervalPlateletDays),
    };
  }
  const wholeDays = wholeBloodIntervalDays(donor.gender, rules);
  return {
    eligibleFrom: dhakaMidnightAfter(date, wholeDays),
    eligibleFromPlatelets: dhakaMidnightAfter(date, wholeDays),
  };
}

export type IneligibleReason = 'too_young' | 'too_old' | 'interval';
export type CanDonate = { ok: true } | { ok: false; reason: IneligibleReason; date?: number };

/**
 * Whether the donor may give `component` at `now`: age S-01..S-02 from the date of birth (in whole years, Dhaka date),
 * then the donation interval. `date` (for `interval`) is when they become eligible again.
 * Weight and the health checklist are self-declared (VAL-14c), not decided here.
 */
export function canDonate(
  donor: DonationHistory,
  component: Component,
  now: number,
  rules: EligibilityRules,
  dateOfBirth: string,
): CanDonate {
  const age = ageOn(dateOfBirth, dhakaDate(now));
  if (age < rules.minAge) return { ok: false, reason: 'too_young' };
  if (age > rules.maxDonorAge) return { ok: false, reason: 'too_old' };
  const { eligibleFrom, eligibleFromPlatelets } = computeEligibility(donor, rules);
  const from = component === 'platelets' ? eligibleFromPlatelets : eligibleFrom;
  if (now < from) return { ok: false, reason: 'interval', date: from };
  return { ok: true };
}
