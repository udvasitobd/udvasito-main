import { describe, expect, it } from 'vitest';

import { rankCandidates, type Candidate, type MatchRequest } from './ranking';
import { defaultSettings } from './settings';

const S = defaultSettings();
const HOUR = 60 * 60 * 1000;
/** 27 Nov 2026, 10:00 in Dhaka. */
const NOW = Date.UTC(2026, 10, 27, 4, 0);

const PLACES = new Map([
  ['u1', { lat: 22.35, lng: 91.83 }],
  ['u2', { lat: 22.4, lng: 91.83 }], // ≈ 5.6 km north of u1
  ['u3', { lat: 22.3, lng: 91.83 }], // ≈ 5.6 km south
  ['u4', { lat: 22.5, lng: 91.83 }], // ≈ 16.7 km north
]);

const REQUEST: MatchRequest = {
  requesterId: 'requester',
  bloodGroup: 'B+',
  component: 'whole_blood',
  districtId: 'd1',
  upazilaId: 'u1',
  point: { lat: 22.35, lng: 91.83 },
  isDemo: false,
};

let ids = 0;
function donor(overrides: Partial<Candidate> = {}): Candidate {
  ids += 1;
  const id = String(ids).padStart(3, '0');
  return {
    donorProfileId: `dp${id}`,
    profileId: `p${id}`,
    bloodGroup: 'B+',
    gender: 'male',
    neverDonated: true,
    districtId: 'd1',
    upazilaId: 'u1',
    travelRange: 'district',
    availability: 'available',
    plateletOptIn: false,
    live: true,
    isDemo: false,
    dateOfBirth: '1999-04-12',
    lastActiveAt: NOW - HOUR,
    ...overrides,
  };
}

const NONE = new Set<string>();
const rank = (candidates: Candidate[], request: Partial<MatchRequest> = {}, finalWave = false, notified = NONE) =>
  rankCandidates(candidates, { ...REQUEST, ...request }, PLACES, S, NOW, { finalWave, alreadyNotified: notified });
const idsOf = (list: { donorProfileId: string }[]) => list.map((c) => c.donorProfileId);

describe('rankCandidates — order', () => {
  it('nearest thana first, then the most recently active, then a stable id order', () => {
    const far = donor({ upazilaId: 'u4' });
    const near = donor({ upazilaId: 'u2' });
    const hereOld = donor({ lastActiveAt: NOW - 10 * HOUR });
    const hereNew = donor({ lastActiveAt: NOW - HOUR });
    const hereNewToo = donor({ lastActiveAt: NOW - HOUR });
    const ranked = rank([far, near, hereOld, hereNewToo, hereNew]);
    expect(idsOf(ranked)).toEqual(idsOf([hereNew, hereNewToo, hereOld, near, far]));
    expect(ranked[0]?.km).toBe(0);
    expect(ranked[3]?.km).toBeCloseTo(5.56, 1);
    expect(ranked.every((c) => c.exact)).toBe(true);
  });

  it('final wave: compatible groups join after exact donors at the same distance (S-11)', () => {
    const exact = donor({ bloodGroup: 'B+', lastActiveAt: NOW - 5 * HOUR });
    const oNeg = donor({ bloodGroup: 'O-' });
    const aPos = donor({ bloodGroup: 'A+' });
    expect(idsOf(rank([oNeg, aPos, exact]))).toEqual(idsOf([exact]));
    const final = rank([oNeg, aPos, exact], {}, true);
    expect(idsOf(final)).toEqual(idsOf([exact, oNeg]));
    expect(final.map((c) => c.exact)).toEqual([true, false]);
    expect(
      idsOf(
        rankCandidates([oNeg, exact], REQUEST, PLACES, { ...S, compatibleInFinalWave: false }, NOW, {
          finalWave: true,
          alreadyNotified: NONE,
        }),
      ),
    ).toEqual(idsOf([exact]));
  });
});

describe('rankCandidates — who is left out (PRD §5.3)', () => {
  it('"Any group" alerts every group; "Not sure" alerts nobody', () => {
    const all = (['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'] as const).map((g) => donor({ bloodGroup: g }));
    expect(rank(all, { bloodGroup: 'any' })).toHaveLength(8);
    expect(rank(all, { bloodGroup: 'not_sure' })).toEqual([]);
    expect(rank([donor({ bloodGroup: 'unknown' })], { bloodGroup: 'any' })).toEqual([]);
  });

  it('practice and real never meet', () => {
    const practice = donor({ isDemo: true });
    const real = donor();
    expect(idsOf(rank([practice, real]))).toEqual(idsOf([real]));
    expect(idsOf(rank([practice, real], { isDemo: true }))).toEqual(idsOf([practice]));
  });

  it('not live, paused or not available', () => {
    expect(
      rank([donor({ live: false }), donor({ availability: 'paused' }), donor({ availability: 'unavailable' })]),
    ).toEqual([]);
  });

  it('never the requester themself, never a donor already alerted', () => {
    const self = donor({ profileId: 'requester' });
    const told = donor();
    const fresh = donor();
    expect(idsOf(rank([self, told, fresh], {}, false, new Set([told.donorProfileId])))).toEqual(idsOf([fresh]));
  });

  it('the exact group only before the final wave; platelets only to opted-in donors, exact group', () => {
    expect(rank([donor({ bloodGroup: 'O-' })])).toEqual([]);
    const optedIn = donor({ plateletOptIn: true });
    const notOptedIn = donor();
    const oNegOptedIn = donor({ bloodGroup: 'O-', plateletOptIn: true });
    expect(idsOf(rank([optedIn, notOptedIn, oNegOptedIn], { component: 'platelets' }, true))).toEqual(idsOf([optedIn]));
  });

  it('same district only, and inside the donor’s own travel range', () => {
    const otherDistrict = donor({ districtId: 'd2' });
    const thanaOnlyHere = donor({ travelRange: 'thana', upazilaId: 'u1' });
    const thanaOnlyElsewhere = donor({ travelRange: 'thana', upazilaId: 'u2' });
    const districtWide = donor({ upazilaId: 'u3' });
    expect(idsOf(rank([otherDistrict, thanaOnlyHere, thanaOnlyElsewhere, districtWide]))).toEqual(
      idsOf([thanaOnlyHere, districtWide]),
    );
  });

  it('eligible today: age 18–65 on the day, and the donation interval passed', () => {
    const tooYoung = donor({ dateOfBirth: '2009-01-01' });
    const tooOld = donor({ dateOfBirth: '1950-01-01' });
    const recent = donor({ neverDonated: false, lastDonationDate: '2026-11-01', lastDonationType: 'whole_blood' });
    const rested = donor({ neverDonated: false, lastDonationDate: '2026-06-01', lastDonationType: 'whole_blood' });
    expect(idsOf(rank([tooYoung, tooOld, recent, rested]))).toEqual(idsOf([rested]));
  });

  it('a donor whose thana is missing from the places table is skipped, not guessed', () => {
    expect(rank([donor({ upazilaId: 'nowhere', travelRange: 'district' })])).toEqual([]);
  });
});
