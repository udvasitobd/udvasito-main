/**
 * SCR-D02 · the donor setup form as data: its empty state, the checks each step runs before "Continue", the form
 * filled from an existing donor profile (setting up again), and the `donors.upsert` arguments. Pure, so unit-tested;
 * the server re-runs the same checks from `convex/rules/validation.ts`.
 */
import { BLOOD_GROUPS, type BloodGroup } from '@convex/rules/compatibility';
import {
  checkChoice,
  checkDonorChecklist,
  checkLastDonation,
  checkShortText,
  checkTicked,
  type Checked,
} from '@convex/rules/validation';

export const STEP_COUNT = 4;
export type Step = 1 | 2 | 3 | 4;

export const GENDERS = ['male', 'female', 'other', 'unspecified'] as const;
export type Gender = (typeof GENDERS)[number];
export const TRAVEL_RANGES = ['thana', 'district'] as const;
export type TravelRange = (typeof TRAVEL_RANGES)[number];
export type DonationType = 'whole_blood' | 'platelets';
export type CallMode = 'mutual' | 'donor_calls';
export type GroupChoice = BloodGroup | 'unknown';

export type SetupForm = {
  bloodGroup: GroupChoice | null;
  divisionId: string | null;
  districtId: string | null;
  upazilaId: string | null;
  areaText: string;
  institution: string;
  travelRange: TravelRange | null;
  gender: Gender | null;
  neverDonated: boolean;
  /** "YYYY-MM-DD" or "". */
  lastDonationDate: string;
  lastDonationType: DonationType;
  checklist: { weight: boolean; health: boolean; screening: boolean };
  plateletOptIn: boolean;
  callMode: CallMode;
  /** The health-data consent is never pre-ticked and never kept in the draft. */
  consent: boolean;
};

export const EMPTY_FORM: SetupForm = {
  bloodGroup: null,
  divisionId: null,
  districtId: null,
  upazilaId: null,
  areaText: '',
  institution: '',
  travelRange: null,
  gender: null,
  neverDonated: false,
  lastDonationDate: '',
  lastDonationType: 'whole_blood',
  checklist: { weight: false, health: false, screening: false },
  plateletOptIn: false,
  callMode: 'mutual',
  consent: false,
};

export type StepField =
  | 'bloodGroup'
  | 'upazilaId'
  | 'areaText'
  | 'institution'
  | 'travelRange'
  | 'gender'
  | 'lastDonationDate'
  | 'checklist'
  | 'consent';
export type StepErrors = Partial<Record<StepField, string>>;

function collect(errors: StepErrors, field: StepField, checked: Checked<unknown>) {
  if (!checked.ok) errors[field] = checked.error.messageKey;
}

/** Message keys for what blocks "Continue" on `step` (empty object = the step is fine). */
export function stepErrors(step: Step, form: SetupForm, today: string): StepErrors {
  const errors: StepErrors = {};
  if (step === 1) {
    collect(errors, 'bloodGroup', checkChoice(form.bloodGroup, [...BLOOD_GROUPS, 'unknown'] as const, 'bloodGroup'));
  }
  if (step === 2) {
    if (!form.divisionId || !form.districtId || !form.upazilaId) errors.upazilaId = 'validation.VAL-14a.invalid';
    collect(errors, 'areaText', checkShortText(form.areaText, 'areaText'));
    collect(errors, 'institution', checkShortText(form.institution, 'institution'));
    collect(errors, 'travelRange', checkChoice(form.travelRange, TRAVEL_RANGES, 'travelRange'));
  }
  if (step === 3) {
    collect(errors, 'gender', checkChoice(form.gender, GENDERS, 'gender'));
    collect(errors, 'lastDonationDate', checkLastDonation(form.neverDonated, form.lastDonationDate, today));
    collect(errors, 'checklist', checkDonorChecklist(form.checklist));
  }
  if (step === 4) {
    collect(errors, 'consent', checkTicked(form.consent));
  }
  return errors;
}

/** The first step with a problem, or null when every step passes (checked again before sending). */
export function firstInvalidStep(form: SetupForm, today: string): Step | null {
  for (const step of [1, 2, 3, 4] as const) {
    if (Object.keys(stepErrors(step, form, today)).length > 0) return step;
  }
  return null;
}

export type UpsertArgs = {
  bloodGroup: GroupChoice;
  gender: Gender;
  divisionId: string;
  districtId: string;
  upazilaId: string;
  areaText?: string;
  institution?: string;
  travelRange: TravelRange;
  neverDonated: boolean;
  lastDonationDate?: string;
  lastDonationType?: DonationType;
  plateletOptIn: boolean;
  callMode: CallMode;
  checklist: { weight: boolean; health: boolean; screening: boolean };
  healthConsentVersion: string;
};

/** `donors.upsert` arguments, or null while any step still has a problem. */
export function toUpsertArgs(form: SetupForm, today: string, consentVersion: string): UpsertArgs | null {
  if (firstInvalidStep(form, today) !== null) return null;
  const { bloodGroup, gender, divisionId, districtId, upazilaId, travelRange } = form;
  if (!bloodGroup || !gender || !divisionId || !districtId || !upazilaId || !travelRange) return null;
  const areaText = form.areaText.trim();
  const institution = form.institution.trim();
  return {
    bloodGroup,
    gender,
    divisionId,
    districtId,
    upazilaId,
    ...(areaText ? { areaText } : {}),
    ...(institution ? { institution } : {}),
    travelRange,
    neverDonated: form.neverDonated,
    ...(form.neverDonated
      ? {}
      : { lastDonationDate: form.lastDonationDate.trim(), lastDonationType: form.lastDonationType }),
    plateletOptIn: form.plateletOptIn,
    callMode: form.callMode,
    checklist: form.checklist,
    healthConsentVersion: consentVersion,
  };
}

/** What `donors.getMine` returns as `donor` — the fields the form needs. */
export type SavedDonor = {
  bloodGroup: GroupChoice;
  gender: Gender;
  divisionId: string;
  districtId: string;
  upazilaId: string;
  areaText: string | null;
  institution: string | null;
  travelRange: TravelRange;
  neverDonated: boolean;
  lastDonationDate: string | null;
  lastDonationType: DonationType | null;
  plateletOptIn: boolean;
  callMode: CallMode;
};

/**
 * Setting up again starts from the saved profile. The checklist and the consent are asked again: they are
 * statements about today ("I am in good health"), not stored facts.
 */
export function formFromDonor(donor: SavedDonor): SetupForm {
  return {
    ...EMPTY_FORM,
    bloodGroup: donor.bloodGroup,
    gender: donor.gender,
    divisionId: donor.divisionId,
    districtId: donor.districtId,
    upazilaId: donor.upazilaId,
    areaText: donor.areaText ?? '',
    institution: donor.institution ?? '',
    travelRange: donor.travelRange,
    neverDonated: donor.neverDonated,
    lastDonationDate: donor.lastDonationDate ?? '',
    lastDonationType: donor.lastDonationType ?? 'whole_blood',
    plateletOptIn: donor.plateletOptIn,
    callMode: donor.callMode,
  };
}

/** Choosing a new division clears the district and thana under it; a new district clears the thana. */
export function choosePlace(form: SetupForm, level: 'division' | 'district' | 'upazila', id: string): SetupForm {
  if (level === 'division') {
    return form.divisionId === id ? form : { ...form, divisionId: id, districtId: null, upazilaId: null };
  }
  if (level === 'district') return form.districtId === id ? form : { ...form, districtId: id, upazilaId: null };
  return { ...form, upazilaId: id };
}

/** The draft kept on the device between steps (consent excluded). Anything malformed is dropped. */
export type Draft = { step: Step; form: Omit<SetupForm, 'consent'> };

export function draftOf(step: Step, form: SetupForm): Draft {
  const { consent: _consent, ...rest } = form;
  return { step, form: rest };
}

const isStep = (value: unknown): value is Step => value === 1 || value === 2 || value === 3 || value === 4;
const isString = (value: unknown): value is string => typeof value === 'string';
const isIdOrNull = (value: unknown) => value === null || isString(value);
const isBool = (value: unknown): value is boolean => typeof value === 'boolean';

export function parseDraft(raw: string | null): { step: Step; form: SetupForm } | null {
  if (!raw) return null;
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }
  const draft = parsed as { step?: unknown; form?: Record<string, unknown> } | null;
  const f = draft?.form;
  if (!draft || !isStep(draft.step) || !f || typeof f !== 'object') return null;
  const checklist = f.checklist as Record<string, unknown> | undefined;
  const valid =
    (f.bloodGroup === null || ([...BLOOD_GROUPS, 'unknown'] as unknown[]).includes(f.bloodGroup)) &&
    isIdOrNull(f.divisionId) &&
    isIdOrNull(f.districtId) &&
    isIdOrNull(f.upazilaId) &&
    isString(f.areaText) &&
    isString(f.institution) &&
    (f.travelRange === null || (TRAVEL_RANGES as readonly unknown[]).includes(f.travelRange)) &&
    (f.gender === null || (GENDERS as readonly unknown[]).includes(f.gender)) &&
    isBool(f.neverDonated) &&
    isString(f.lastDonationDate) &&
    (f.lastDonationType === 'whole_blood' || f.lastDonationType === 'platelets') &&
    !!checklist &&
    isBool(checklist.weight) &&
    isBool(checklist.health) &&
    isBool(checklist.screening) &&
    isBool(f.plateletOptIn) &&
    (f.callMode === 'mutual' || f.callMode === 'donor_calls');
  if (!valid) return null;
  return { step: draft.step, form: { ...(f as Omit<SetupForm, 'consent'>), consent: false } };
}

/** The nearest place to a point (straight-line), or null when there are none. */
export function nearestPlace<T extends { lat: number; lng: number }>(
  point: { lat: number; lng: number },
  places: readonly T[],
  distance: (a: { lat: number; lng: number }, b: { lat: number; lng: number }) => number,
): T | null {
  let best: T | null = null;
  let bestKm = Infinity;
  for (const place of places) {
    const km = distance(point, place);
    if (km < bestKm) {
      best = place;
      bestKm = km;
    }
  }
  return best;
}
