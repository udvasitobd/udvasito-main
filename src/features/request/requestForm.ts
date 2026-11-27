/**
 * SCR-M02 request form (form path) — pure state, checks and the `requests.create` arguments. The checks are the
 * server's own (`convex/rules/request.ts`, VAL-03 … VAL-11), so the form never accepts what the server would refuse.
 */
import {
  checkComponent,
  checkNeededBy,
  checkNote,
  checkPatientName,
  checkPlace,
  checkRequestGroup,
  checkUnits,
  checkWard,
  dhakaDateTime,
  neededByFor,
  type Component,
  type RequestGroup,
} from '@convex/rules/request';
import { dhakaDate } from '@convex/rules/time';
import { checkPhone, type Checked } from '@convex/rules/validation';

export type NeededByMode = 'now' | 'today' | 'tomorrow' | 'pick';
export const NEEDED_BY_MODES: readonly NeededByMode[] = ['now', 'today', 'tomorrow', 'pick'];

/** A hospital chosen from the list (what `hospitals.search` returns, minus what the form doesn't need). */
export type ChosenHospital = {
  _id: string;
  nameEn: string;
  nameBn: string;
  divisionId: string;
  districtId: string;
  upazila: { _id: string; nameEn: string; nameBn: string } | null;
};

export type RequestForm = {
  bloodGroup: RequestGroup | null;
  component: Component;
  isDengue: boolean;
  units: number;
  hospital: ChosenHospital | null;
  /** "My place isn't in the list": district → thana → place name. */
  notInList: boolean;
  divisionId: string | null;
  districtId: string | null;
  upazilaId: string | null;
  placeText: string;
  neededBy: NeededByMode | null;
  pickDate: string;
  pickTime: string;
  contactPhone: string;
  patientName: string;
  ward: string;
  note: string;
};

export type FormField =
  | 'bloodGroup'
  | 'component'
  | 'unitsNeeded'
  | 'place'
  | 'placeText'
  | 'neededBy'
  | 'contactPhone'
  | 'patientName'
  | 'ward'
  | 'note';
export type FormErrors = Partial<Record<FormField, string>>;

/** Field order on screen (the error summary counts and the first error is scrolled to in this order). */
export const FIELD_ORDER: readonly FormField[] = [
  'bloodGroup',
  'component',
  'unitsNeeded',
  'place',
  'placeText',
  'neededBy',
  'contactPhone',
  'patientName',
  'ward',
  'note',
];

/** National form of a stored number ("+8801712345678" → "01712345678") to pre-fill the contact field. */
export function nationalPhone(stored: string | undefined): string {
  if (!stored) return '';
  return stored.startsWith('+88') ? stored.slice(3) : stored;
}

/** A fresh form: `?dengue=1` pre-selects Platelets + the dengue chip; the contact is my own number (WCAG 3.3.7). */
export function emptyRequestForm(options: { dengue: boolean; myPhone?: string }): RequestForm {
  return {
    bloodGroup: null,
    component: options.dengue ? 'platelets' : 'whole_blood',
    isDengue: options.dengue,
    units: 1,
    hospital: null,
    notInList: false,
    divisionId: null,
    districtId: null,
    upazilaId: null,
    placeText: '',
    neededBy: null,
    pickDate: '',
    pickTime: '',
    contactPhone: nationalPhone(options.myPhone),
    patientName: '',
    ward: '',
    note: '',
  };
}

/** Where "Pick date & time" opens: the next full hour after 3 hours from now, in Dhaka. */
export function defaultPick(now: number): { pickDate: string; pickTime: string } {
  const HOUR = 60 * 60 * 1000;
  const DHAKA = 6 * HOUR;
  const at = Math.ceil((now + 3 * HOUR + DHAKA) / HOUR) * HOUR - DHAKA;
  const hours = new Date(at + DHAKA).getUTCHours();
  return { pickDate: dhakaDate(at), pickTime: `${String(hours).padStart(2, '0')}:00` };
}

/** The `neededBy` timestamp the form stands for, or null when nothing (or no full date and time) is chosen. */
export function neededByOf(form: RequestForm, now: number): number | null {
  if (!form.neededBy) return null;
  if (form.neededBy === 'pick') return dhakaDateTime(form.pickDate, form.pickTime);
  return neededByFor(form.neededBy, now);
}

/** Choosing a hospital clears the typed place; leaving the list clears the hospital. */
export function chooseHospital(form: RequestForm, hospital: ChosenHospital | null): RequestForm {
  return hospital
    ? { ...form, hospital, notInList: false, divisionId: null, districtId: null, upazilaId: null, placeText: '' }
    : { ...form, hospital: null };
}

/** A new district clears the thana. */
export function chooseDistrict(
  form: RequestForm,
  district: { _id: string; parentId: string | null } | null,
): RequestForm {
  return {
    ...form,
    districtId: district?._id ?? null,
    divisionId: district?.parentId ?? null,
    upazilaId: form.districtId === (district?._id ?? null) ? form.upazilaId : null,
  };
}

function put(errors: FormErrors, result: Checked<unknown>, field?: FormField) {
  if (!result.ok) errors[(field ?? result.error.field) as FormField] = result.error.messageKey;
}

/** Every field error, keyed by field, in the server's words. Empty object = ready to post. */
export function formErrors(form: RequestForm, now: number): FormErrors {
  const errors: FormErrors = {};
  const group = checkRequestGroup(form.bloodGroup);
  put(errors, group);
  put(errors, checkComponent(group.ok ? group.value : null, form.component));
  put(errors, checkUnits(form.units));
  if (!form.hospital && !form.notInList) errors.place = 'validation.VAL-07.empty';
  else if (!form.hospital) {
    put(errors, checkPlace({ districtId: form.districtId, upazilaId: form.upazilaId, placeText: form.placeText }));
  }
  const neededBy = neededByOf(form, now);
  if (neededBy === null) errors.neededBy = 'validation.VAL-08.empty';
  else put(errors, checkNeededBy(neededBy, now));
  put(errors, checkPhone(form.contactPhone, 'contactPhone'));
  put(errors, checkPatientName(form.patientName));
  put(errors, checkWard(form.ward));
  put(errors, checkNote(form.note));
  return errors;
}

export function errorCount(errors: FormErrors): number {
  return Object.keys(errors).length;
}

export function firstErrorField(errors: FormErrors): FormField | null {
  return FIELD_ORDER.find((field) => errors[field] !== undefined) ?? null;
}

const optional = (text: string) => (text.trim() === '' ? undefined : text.trim());

/**
 * `requests.create` arguments (ids are strings here; the screen casts them). Call only when `formErrors` is empty.
 * With a hospital, its own place ids are sent (the server uses the hospital's place anyway).
 */
export function toCreateArgs(form: RequestForm, now: number, clientId: string, lang: 'en' | 'bn') {
  const neededBy = neededByOf(form, now);
  if (!form.bloodGroup || neededBy === null) throw new Error('toCreateArgs: form is not complete');
  const where = form.hospital
    ? {
        hospitalId: form.hospital._id,
        divisionId: form.hospital.divisionId,
        districtId: form.hospital.districtId,
        upazilaId: form.hospital.upazila?._id ?? '',
      }
    : {
        divisionId: form.divisionId ?? '',
        districtId: form.districtId ?? '',
        upazilaId: form.upazilaId ?? '',
        placeText: form.placeText.trim().replace(/\s+/g, ' '),
      };
  const patientName = optional(form.patientName);
  const ward = optional(form.ward);
  const note = optional(form.note);
  return {
    clientId,
    bloodGroup: form.bloodGroup,
    component: form.component,
    isDengue: form.isDengue,
    unitsNeeded: form.units,
    ...where,
    neededBy,
    contactPhone: form.contactPhone,
    ...(patientName ? { patientName } : {}),
    ...(ward ? { ward } : {}),
    ...(note ? { note } : {}),
    source: 'form' as const,
    aiAssisted: false,
    lang,
  };
}
