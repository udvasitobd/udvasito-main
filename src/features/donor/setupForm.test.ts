import { distanceKm } from '@convex/rules/places';
import { describe, expect, it } from 'vitest';

import {
  choosePlace,
  draftOf,
  EMPTY_FORM,
  firstInvalidStep,
  formFromDonor,
  nearestPlace,
  parseDraft,
  stepErrors,
  toUpsertArgs,
  type SetupForm,
} from './setupForm';

const TODAY = '2026-11-27';

const filled: SetupForm = {
  ...EMPTY_FORM,
  bloodGroup: 'B+',
  divisionId: 'div',
  districtId: 'dist',
  upazilaId: 'upa',
  areaText: '  Jamal  Khan ',
  institution: '',
  travelRange: 'district',
  gender: 'female',
  neverDonated: false,
  lastDonationDate: '2026-10-01',
  lastDonationType: 'platelets',
  checklist: { weight: true, health: true, screening: true },
  plateletOptIn: true,
  callMode: 'donor_calls',
  consent: true,
};

describe('stepErrors', () => {
  it('step 1 needs a blood group or "I don\'t know"', () => {
    expect(stepErrors(1, EMPTY_FORM, TODAY)).toEqual({ bloodGroup: 'validation.VAL-14d.invalid' });
    expect(stepErrors(1, { ...EMPTY_FORM, bloodGroup: 'unknown' }, TODAY)).toEqual({});
    expect(stepErrors(1, { ...EMPTY_FORM, bloodGroup: 'O-' }, TODAY)).toEqual({});
  });

  it('step 2 needs the full place chain and a travel range; texts stay under 80', () => {
    expect(stepErrors(2, { ...filled, upazilaId: null }, TODAY)).toEqual({ upazilaId: 'validation.VAL-14a.invalid' });
    expect(stepErrors(2, { ...filled, travelRange: null }, TODAY)).toEqual({
      travelRange: 'validation.VAL-14d.invalid',
    });
    expect(stepErrors(2, { ...filled, institution: 'x'.repeat(81) }, TODAY)).toEqual({
      institution: 'validation.VAL-22.invalid',
    });
    expect(stepErrors(2, { ...filled, areaText: 'x'.repeat(81) }, TODAY)).toEqual({
      areaText: 'validation.VAL-23.invalid',
    });
    expect(stepErrors(2, filled, TODAY)).toEqual({});
  });

  it('step 3 checks gender, the last donation and all three checklist lines', () => {
    expect(stepErrors(3, { ...EMPTY_FORM }, TODAY)).toEqual({
      gender: 'validation.VAL-14d.invalid',
      lastDonationDate: 'validation.VAL-14b.missing',
      checklist: 'validation.VAL-14c.invalid',
    });
    expect(stepErrors(3, { ...filled, lastDonationDate: '2026-11-28' }, TODAY)).toEqual({
      lastDonationDate: 'validation.VAL-14b.future',
    });
    expect(stepErrors(3, { ...filled, neverDonated: true, lastDonationDate: '' }, TODAY)).toEqual({});
    expect(stepErrors(3, { ...filled, checklist: { weight: true, health: false, screening: true } }, TODAY)).toEqual({
      checklist: 'validation.VAL-14c.invalid',
    });
  });

  it('step 4 needs the consent box', () => {
    expect(stepErrors(4, { ...filled, consent: false }, TODAY)).toEqual({ consent: 'validation.VAL-15.invalid' });
    expect(stepErrors(4, filled, TODAY)).toEqual({});
  });

  it('firstInvalidStep finds the earliest problem', () => {
    expect(firstInvalidStep(EMPTY_FORM, TODAY)).toBe(1);
    expect(firstInvalidStep({ ...filled, gender: null }, TODAY)).toBe(3);
    expect(firstInvalidStep(filled, TODAY)).toBeNull();
  });
});

describe('toUpsertArgs', () => {
  it('builds the mutation arguments with trimmed optional texts', () => {
    expect(toUpsertArgs(filled, TODAY, 'v1')).toEqual({
      bloodGroup: 'B+',
      gender: 'female',
      divisionId: 'div',
      districtId: 'dist',
      upazilaId: 'upa',
      areaText: 'Jamal  Khan',
      travelRange: 'district',
      neverDonated: false,
      lastDonationDate: '2026-10-01',
      lastDonationType: 'platelets',
      plateletOptIn: true,
      callMode: 'donor_calls',
      checklist: { weight: true, health: true, screening: true },
      healthConsentVersion: 'v1',
    });
  });

  it('"never donated" sends no date or type; an invalid form sends nothing', () => {
    const args = toUpsertArgs({ ...filled, neverDonated: true, lastDonationDate: '' }, TODAY, 'v1');
    expect(args).not.toHaveProperty('lastDonationDate');
    expect(args).not.toHaveProperty('lastDonationType');
    expect(toUpsertArgs({ ...filled, consent: false }, TODAY, 'v1')).toBeNull();
  });
});

describe('formFromDonor', () => {
  it('fills the form again but asks for the checklist and consent afresh', () => {
    const form = formFromDonor({
      bloodGroup: 'unknown',
      gender: 'male',
      divisionId: 'div',
      districtId: 'dist',
      upazilaId: 'upa',
      areaText: null,
      institution: 'CU',
      travelRange: 'thana',
      neverDonated: true,
      lastDonationDate: null,
      lastDonationType: null,
      plateletOptIn: false,
      callMode: 'mutual',
    });
    expect(form).toMatchObject({
      bloodGroup: 'unknown',
      institution: 'CU',
      areaText: '',
      lastDonationType: 'whole_blood',
    });
    expect(form.checklist).toEqual({ weight: false, health: false, screening: false });
    expect(form.consent).toBe(false);
  });
});

describe('choosePlace', () => {
  it('a new division clears district and thana; the same one keeps them', () => {
    expect(choosePlace(filled, 'division', 'other')).toMatchObject({
      divisionId: 'other',
      districtId: null,
      upazilaId: null,
    });
    expect(choosePlace(filled, 'division', 'div')).toBe(filled);
    expect(choosePlace(filled, 'district', 'd2')).toMatchObject({ districtId: 'd2', upazilaId: null });
    expect(choosePlace(filled, 'upazila', 'u2')).toMatchObject({ districtId: 'dist', upazilaId: 'u2' });
  });
});

describe('draft', () => {
  it('round-trips without the consent tick', () => {
    const raw = JSON.stringify(draftOf(3, filled));
    expect(raw).not.toContain('consent');
    expect(parseDraft(raw)).toEqual({ step: 3, form: { ...filled, consent: false } });
  });

  it('drops anything malformed', () => {
    expect(parseDraft(null)).toBeNull();
    expect(parseDraft('{oops')).toBeNull();
    expect(parseDraft(JSON.stringify({ step: 5, form: draftOf(1, filled).form }))).toBeNull();
    expect(parseDraft(JSON.stringify({ step: 1, form: { ...draftOf(1, filled).form, bloodGroup: 'C+' } }))).toBeNull();
    expect(parseDraft(JSON.stringify({ step: 1, form: { ...draftOf(1, filled).form, checklist: null } }))).toBeNull();
  });
});

describe('nearestPlace', () => {
  const kotwali = { id: 'kotwali', lat: 22.3364, lng: 91.8346 };
  const hathazari = { id: 'hathazari', lat: 22.5054, lng: 91.8094 };

  it('picks the closest one', () => {
    expect(nearestPlace({ lat: 22.34, lng: 91.83 }, [hathazari, kotwali], distanceKm)?.id).toBe('kotwali');
    expect(nearestPlace({ lat: 22.5, lng: 91.81 }, [hathazari, kotwali], distanceKm)?.id).toBe('hathazari');
    expect(nearestPlace({ lat: 22.5, lng: 91.81 }, [], distanceKm)).toBeNull();
  });
});
