/**
 * Blood-group compatibility 🩺 — PRD §5.2, specs §6.10. Pure TypeScript, no Convex imports.
 * Waves before the last ask exact matches only; the final wave adds red-cell-compatible groups when
 * `compatibleInFinalWave` (S-11) is on, labelled "compatible — hospital will cross-match".
 */
import type { Settings } from './settings';

export const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'] as const;
export type BloodGroup = (typeof BLOOD_GROUPS)[number];
/** What a request may ask for: a group, "any group (replacement donor)" or "not sure". */
export type RequestGroup = BloodGroup | 'any' | 'not_sure';

/** Whole blood — groups that may give to each patient group besides the exact match (PRD §5.2 table). */
const ALSO_COMPATIBLE: Readonly<Record<BloodGroup, readonly BloodGroup[]>> = {
  'O-': [],
  'O+': ['O-'],
  'A-': ['O-'],
  'A+': ['A-', 'O+', 'O-'],
  'B-': ['O-'],
  'B+': ['B-', 'O+', 'O-'],
  'AB-': ['A-', 'B-', 'O-'],
  'AB+': ['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB-'],
};

/**
 * Donor groups to alert for a request.
 * - `any`: every group matches (the blood bank exchanges the donation); `not_sure`: no donor is alerted.
 * - Platelets: exact ABO and Rh only.
 * - Whole blood: exact; plus the compatible groups in the final wave when S-11 is on.
 */
export function groupsFor(
  patientGroup: RequestGroup,
  component: 'whole_blood' | 'platelets',
  isFinalWave: boolean,
  settings: Pick<Settings, 'compatibleInFinalWave'>,
): { exact: BloodGroup[]; compatible: BloodGroup[] } {
  if (patientGroup === 'not_sure') return { exact: [], compatible: [] };
  if (patientGroup === 'any') return { exact: [...BLOOD_GROUPS], compatible: [] };
  const exact: BloodGroup[] = [patientGroup];
  if (component === 'platelets' || !isFinalWave || !settings.compatibleInFinalWave) return { exact, compatible: [] };
  return { exact, compatible: [...ALSO_COMPATIBLE[patientGroup]] };
}
