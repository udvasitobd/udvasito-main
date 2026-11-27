import { describe, expect, it } from 'vitest';

import {
  chooseDistrict,
  chooseHospital,
  defaultPick,
  emptyRequestForm,
  errorCount,
  firstErrorField,
  formErrors,
  nationalPhone,
  neededByOf,
  toCreateArgs,
  type ChosenHospital,
  type RequestForm,
} from './requestForm';

const HOUR = 60 * 60 * 1000;
/** 27 Nov 2026, 10:00 in Dhaka. */
const NOW = Date.UTC(2026, 10, 27, 4, 0);

const HOSPITAL: ChosenHospital = {
  _id: 'h1',
  nameEn: 'Chattogram Medical College Hospital',
  nameBn: 'চট্টগ্রাম মেডিকেল কলেজ হাসপাতাল',
  divisionId: 'div',
  districtId: 'dist',
  upazila: { _id: 'upa', nameEn: 'Kotwali', nameBn: 'কোতোয়ালী' },
};

function complete(overrides: Partial<RequestForm> = {}): RequestForm {
  return {
    ...emptyRequestForm({ dengue: false, myPhone: '+8801712345678' }),
    bloodGroup: 'B+',
    units: 2,
    hospital: HOSPITAL,
    neededBy: 'now',
    ...overrides,
  };
}

describe('a fresh form', () => {
  it('pre-fills my number; dengue=1 pre-selects platelets and the dengue chip', () => {
    const form = emptyRequestForm({ dengue: true, myPhone: '+8801712345678' });
    expect(form).toMatchObject({ component: 'platelets', isDengue: true, units: 1, contactPhone: '01712345678' });
    expect(emptyRequestForm({ dengue: false }).component).toBe('whole_blood');
    expect(nationalPhone(undefined)).toBe('');
  });

  it('lists every missing required field, in screen order', () => {
    const errors = formErrors(emptyRequestForm({ dengue: false }), NOW);
    expect(errors).toEqual({
      bloodGroup: 'validation.VAL-04.empty',
      place: 'validation.VAL-07.empty',
      neededBy: 'validation.VAL-08.empty',
      contactPhone: 'validation.VAL-03.empty',
    });
    expect(errorCount(errors)).toBe(4);
    expect(firstErrorField(errors)).toBe('bloodGroup');
    expect(firstErrorField({})).toBeNull();
  });
});

describe('checks', () => {
  it('a complete form has no errors', () => {
    expect(formErrors(complete(), NOW)).toEqual({});
  });

  it('platelets cannot go with "any group"', () => {
    expect(formErrors(complete({ bloodGroup: 'any', component: 'platelets' }), NOW)).toEqual({
      component: 'validation.VAL-05.combo',
    });
  });

  it('"not in the list" needs district, thana and a place name', () => {
    const base = complete({ hospital: null, notInList: true });
    expect(formErrors(base, NOW)).toEqual({ place: 'validation.VAL-07.empty' });
    const named = { ...base, districtId: 'd', divisionId: 'v', upazilaId: 'u', placeText: 'ab' };
    expect(formErrors(named, NOW)).toEqual({ placeText: 'validation.VAL-07.placeText' });
    expect(formErrors({ ...named, placeText: 'Max Hospital' }, NOW)).toEqual({});
  });

  it('optional texts follow VAL-09 … VAL-11', () => {
    expect(formErrors(complete({ note: 'call 01812345678' }), NOW)).toEqual({ note: 'validation.VAL-11.phone' });
    expect(formErrors(complete({ ward: 'x'.repeat(41) }), NOW)).toEqual({ ward: 'validation.VAL-10.long' });
    expect(formErrors(complete({ patientName: 'Bed 4' }), NOW)).toEqual({ patientName: 'validation.VAL-01.chars' });
    expect(formErrors(complete({ contactPhone: '123' }), NOW)).toEqual({ contactPhone: 'validation.VAL-03.invalid' });
  });
});

describe('needed by', () => {
  it('chips map to times; Pick needs a full date and time in range', () => {
    expect(neededByOf(complete({ neededBy: 'now' }), NOW)).toBe(NOW + 2 * HOUR);
    expect(neededByOf(complete({ neededBy: null }), NOW)).toBeNull();
    const pick = complete({ neededBy: 'pick', pickDate: '2026-11-28', pickTime: '' });
    expect(formErrors(pick, NOW)).toEqual({ neededBy: 'validation.VAL-08.empty' });
    expect(formErrors({ ...pick, pickDate: '2026-11-26', pickTime: '09:00' }, NOW)).toEqual({
      neededBy: 'validation.VAL-08.past',
    });
    expect(formErrors({ ...pick, pickDate: '2027-01-15', pickTime: '09:00' }, NOW)).toEqual({
      neededBy: 'validation.VAL-08.far',
    });
    expect(neededByOf({ ...pick, pickTime: '09:30' }, NOW)).toBe(Date.UTC(2026, 10, 28, 3, 30));
  });

  it('Pick opens at the next full hour after 3 hours, in Dhaka', () => {
    expect(defaultPick(NOW)).toEqual({ pickDate: '2026-11-27', pickTime: '13:00' });
    // 22:20 in Dhaka → 01:20 tomorrow → 02:00 tomorrow
    expect(defaultPick(Date.UTC(2026, 10, 27, 16, 20))).toEqual({ pickDate: '2026-11-28', pickTime: '02:00' });
  });
});

describe('place choices', () => {
  it('a hospital clears the typed place; a new district clears the thana', () => {
    const typed = complete({
      hospital: null,
      notInList: true,
      districtId: 'd',
      divisionId: 'v',
      upazilaId: 'u',
      placeText: 'X',
    });
    expect(chooseHospital(typed, HOSPITAL)).toMatchObject({
      hospital: HOSPITAL,
      notInList: false,
      districtId: null,
      upazilaId: null,
      placeText: '',
    });
    expect(chooseHospital(complete(), null).hospital).toBeNull();
    expect(chooseDistrict(typed, { _id: 'd', parentId: 'v' }).upazilaId).toBe('u');
    expect(chooseDistrict(typed, { _id: 'e', parentId: 'v' })).toMatchObject({ districtId: 'e', upazilaId: null });
    expect(chooseDistrict(typed, null)).toMatchObject({ districtId: null, divisionId: null, upazilaId: null });
  });
});

describe('toCreateArgs', () => {
  it('sends the hospital and its place, and leaves out empty optional texts', () => {
    const args = toCreateArgs(complete({ ward: '  ' }), NOW, 'client-1', 'bn');
    expect(args).toEqual({
      clientId: 'client-1',
      bloodGroup: 'B+',
      component: 'whole_blood',
      isDengue: false,
      unitsNeeded: 2,
      hospitalId: 'h1',
      divisionId: 'div',
      districtId: 'dist',
      upazilaId: 'upa',
      neededBy: NOW + 2 * HOUR,
      contactPhone: '01712345678',
      source: 'form',
      aiAssisted: false,
      lang: 'bn',
    });
  });

  it('sends the typed place when it is not in the list', () => {
    const form = complete({
      hospital: null,
      notInList: true,
      divisionId: 'v',
      districtId: 'd',
      upazilaId: 'u',
      placeText: '  Max   Hospital ',
      note: ' Gate 2 ',
    });
    expect(toCreateArgs(form, NOW, 'c', 'en')).toMatchObject({
      divisionId: 'v',
      districtId: 'd',
      upazilaId: 'u',
      placeText: 'Max Hospital',
      note: 'Gate 2',
    });
    expect(() => toCreateArgs(complete({ bloodGroup: null }), NOW, 'c', 'en')).toThrow();
  });
});
