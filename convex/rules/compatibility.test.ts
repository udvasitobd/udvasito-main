import { describe, expect, it } from 'vitest';

import { BLOOD_GROUPS, groupsFor, type BloodGroup } from './compatibility';
import { defaultSettings } from './settings';

const S = defaultSettings();

/** PRD §5.2 whole-blood table, row by row. */
const TABLE: [BloodGroup, BloodGroup[]][] = [
  ['O-', []],
  ['O+', ['O-']],
  ['A-', ['O-']],
  ['A+', ['A-', 'O+', 'O-']],
  ['B-', ['O-']],
  ['B+', ['B-', 'O+', 'O-']],
  ['AB-', ['A-', 'B-', 'O-']],
  ['AB+', ['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB-']],
];

describe('groupsFor (PRD §5.2)', () => {
  it('covers all eight groups', () => {
    expect(TABLE.map(([g]) => g).sort()).toEqual([...BLOOD_GROUPS].sort());
  });

  it.each(TABLE)('whole blood %s: exact only before the final wave', (group) => {
    expect(groupsFor(group, 'whole_blood', false, S)).toEqual({ exact: [group], compatible: [] });
  });

  it.each(TABLE)('whole blood %s: final wave adds %j', (group, compatible) => {
    const result = groupsFor(group, 'whole_blood', true, S);
    expect(result.exact).toEqual([group]);
    expect([...result.compatible].sort()).toEqual([...compatible].sort());
    expect(result.compatible).not.toContain(group);
  });

  it.each(TABLE)('whole blood %s: no compatible groups when S-11 is off', (group) => {
    expect(groupsFor(group, 'whole_blood', true, { compatibleInFinalWave: false })).toEqual({ exact: [group], compatible: [] });
  });

  it.each(TABLE)('platelets %s: exact ABO and Rh only, even in the final wave', (group) => {
    expect(groupsFor(group, 'platelets', true, S)).toEqual({ exact: [group], compatible: [] });
  });

  it('"any group" matches every group; "not sure" alerts no donor', () => {
    for (const component of ['whole_blood', 'platelets'] as const) {
      for (const isFinalWave of [false, true]) {
        expect(groupsFor('any', component, isFinalWave, S)).toEqual({ exact: [...BLOOD_GROUPS], compatible: [] });
        expect(groupsFor('not_sure', component, isFinalWave, S)).toEqual({ exact: [], compatible: [] });
      }
    }
  });
});
