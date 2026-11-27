/**
 * Donor setup and the Donate tab (SCR-D01, SCR-D02): `donors.upsert`, `donors.getMine`, `donors.setAvailability`,
 * `places.list`, and the `live` flag following phone verification (specs §5.4).
 */
import { describe, expect, it } from 'vitest';

import { api } from './_generated/api';
import type { Id } from './_generated/dataModel';
import { readAppError } from './_lib/errors';
import { insertProfile, makeT, signIn, type ProfileOverrides, type T } from './test.setup';

const CONSENT = '2026-11-28-pilot';

async function codeOf(promise: Promise<unknown>): Promise<string | null> {
  try {
    await promise;
    return null;
  } catch (error) {
    return readAppError(error)?.code ?? `non-app error: ${String(error)}`;
  }
}

async function fieldOf(promise: Promise<unknown>): Promise<string | undefined> {
  try {
    await promise;
    return undefined;
  } catch (error) {
    const data = readAppError(error);
    return data?.code === 'ERR_VALIDATION' ? data.messageKey : data?.code;
  }
}

/** Chattogram division → Chattogram district → Kotwali thana, and a second district. */
async function places(t: T) {
  return t.run(async (ctx) => {
    const base = {
      lat: 22.35,
      lng: 91.83,
      isMetroThana: false,
      neighbourIds: [],
    };
    const division = await ctx.db.insert('places', {
      ...base,
      level: 'division',
      code: '20',
      nameEn: 'Chattogram',
      nameBn: 'চট্টগ্রাম',
    });
    const district = await ctx.db.insert('places', {
      ...base,
      level: 'district',
      code: '2015',
      nameEn: 'Chattogram',
      nameBn: 'চট্টগ্রাম',
      parentId: division,
    });
    const upazila = await ctx.db.insert('places', {
      ...base,
      level: 'upazila',
      code: '201541',
      nameEn: 'Kotwali',
      nameBn: 'কোতোয়ালী',
      parentId: district,
      isMetroThana: true,
    });
    const otherDistrict = await ctx.db.insert('places', {
      ...base,
      level: 'district',
      code: '2022',
      nameEn: "Cox's Bazar",
      nameBn: 'কক্সবাজার',
      parentId: division,
    });
    return {
      divisionId: division,
      districtId: district,
      upazilaId: upazila,
      otherDistrict,
    };
  });
}

let people = 0;
async function member(t: T, overrides: ProfileOverrides = {}) {
  people += 1;
  const { as, userId } = await signIn(t, `donor${people}@example.com`);
  const profileId = await insertProfile(t, userId, overrides);
  return { as, profileId };
}

function setup(where: { divisionId: Id<'places'>; districtId: Id<'places'>; upazilaId: Id<'places'> }) {
  return {
    bloodGroup: 'O+' as const,
    gender: 'male' as const,
    divisionId: where.divisionId,
    districtId: where.districtId,
    upazilaId: where.upazilaId,
    travelRange: 'district' as const,
    neverDonated: false,
    lastDonationDate: '2026-10-01',
    lastDonationType: 'whole_blood' as const,
    plateletOptIn: true,
    callMode: 'mutual' as const,
    checklist: { weight: true, health: true, screening: true },
    healthConsentVersion: CONSENT,
  };
}

const donorOf = (t: T, profileId: Id<'profiles'>) =>
  t.run((ctx) =>
    ctx.db
      .query('donorProfiles')
      .withIndex('by_profile', (q) => q.eq('profileId', profileId))
      .unique(),
  );
const eventsNamed = (t: T, name: string) =>
  t.run((ctx) =>
    ctx.db
      .query('events')
      .withIndex('by_name', (q) => q.eq('name', name))
      .collect(),
  );

describe('access', () => {
  it('donor functions need a signed-in member; availability needs a donor profile', async () => {
    const t = makeT();
    const where = await places(t);
    expect(await codeOf(t.query(api.donors.getMine, {}))).toBe('ERR_UNAUTHENTICATED');
    expect(await codeOf(t.mutation(api.donors.upsert, setup(where)))).toBe('ERR_UNAUTHENTICATED');
    const { as } = await member(t);
    expect(
      await codeOf(
        as.mutation(api.donors.setAvailability, {
          availability: 'unavailable',
        }),
      ),
    ).toBe('ERR_FORBIDDEN');
  });

  it('a frozen account can look but not change', async () => {
    const t = makeT();
    const where = await places(t);
    const { as } = await member(t, { status: 'frozen' });
    expect(await as.query(api.donors.getMine, {})).toBeNull();
    expect(await codeOf(as.mutation(api.donors.upsert, setup(where)))).toBe('ERR_FROZEN');
  });

  it('places.list is public', async () => {
    const t = makeT();
    const where = await places(t);
    expect(await t.query(api.places.list, { level: 'division' })).toEqual([
      {
        _id: where.divisionId,
        nameEn: 'Chattogram',
        nameBn: 'চট্টগ্রাম',
        lat: 22.35,
        lng: 91.83,
        parentId: null,
      },
    ]);
    const districts = await t.query(api.places.list, {
      level: 'district',
      parentId: where.divisionId,
    });
    expect(districts.map((d) => d.nameEn)).toEqual(['Chattogram', "Cox's Bazar"]);
    expect((await t.query(api.places.list, { level: 'upazila' })).map((u) => u.parentId)).toEqual([where.districtId]);
  });
});

describe('donors.upsert', () => {
  it('saves the donor with defaults, eligibility and the health consent; not live until the phone is verified', async () => {
    const t = makeT();
    const where = await places(t);
    const { as, profileId } = await member(t);
    expect(await as.mutation(api.donors.upsert, setup(where))).toEqual({
      live: false,
      notLiveReasons: ['phone'],
    });

    const donor = await donorOf(t, profileId);
    expect(donor).toMatchObject({
      bloodGroup: 'O+',
      availability: 'available',
      alertCapPerDay: 3,
      quietStart: '00:00',
      quietEnd: '07:00',
      urgentOverride: false,
      volunteersMayCall: false,
      verifiedRequestsOnly: false,
      hidden: false,
      live: false,
      isDemo: false,
      lastDonationDate: '2026-10-01',
      lastDonationType: 'whole_blood',
    });
    // 2026-10-01 + 90 days (men, S-04) at 00:00 Dhaka time.
    expect(donor?.eligibleFrom).toBe(Date.UTC(2026, 11, 30) - 6 * 3_600_000);
    expect(donor?.firstLiveAt).toBeUndefined();
    const consents = await t.run((ctx) =>
      ctx.db
        .query('consents')
        .withIndex('by_profile_kind', (q) => q.eq('profileId', profileId).eq('kind', 'donor_health_contact'))
        .collect(),
    );
    expect(consents).toMatchObject([{ version: CONSENT, lang: 'en' }]);
    expect(await eventsNamed(t, 'donor_profile_live')).toHaveLength(0);
  });

  it('a verified member goes live at once, and the event fires only the first time', async () => {
    const t = makeT();
    const where = await places(t);
    const { as, profileId } = await member(t, {
      phoneVerified: true,
      phoneVerifiedVia: 'in_person',
    });
    expect(await as.mutation(api.donors.upsert, setup(where))).toEqual({
      live: true,
      notLiveReasons: [],
    });
    expect((await donorOf(t, profileId))?.firstLiveAt).toBeTypeOf('number');
    await as.mutation(api.donors.upsert, {
      ...setup(where),
      bloodGroup: 'unknown',
    });
    expect(await as.mutation(api.donors.upsert, setup(where))).toEqual({
      live: true,
      notLiveReasons: [],
    });
    const events = await eventsNamed(t, 'donor_profile_live');
    expect(events.map((event) => event.props)).toEqual([{ bloodGroup: 'O+', plateletOptIn: true }]);
  });

  it('"I don\'t know my group" saves the profile but it is not live', async () => {
    const t = makeT();
    const where = await places(t);
    const { as } = await member(t, { phoneVerified: true });
    expect(
      await as.mutation(api.donors.upsert, {
        ...setup(where),
        bloodGroup: 'unknown',
      }),
    ).toEqual({
      live: false,
      notLiveReasons: ['group'],
    });
  });

  it('setting up again keeps availability and settings, updates the rest, removes cleared text', async () => {
    const t = makeT();
    const where = await places(t);
    const { as, profileId } = await member(t);
    await as.mutation(api.donors.upsert, {
      ...setup(where),
      institution: 'CU',
      areaText: 'Andarkilla',
    });
    await as.mutation(api.donors.setAvailability, {
      availability: 'unavailable',
    });
    await as.mutation(api.donors.upsert, {
      ...setup(where),
      neverDonated: true,
      lastDonationDate: undefined,
    });
    const donor = await donorOf(t, profileId);
    expect(donor).toMatchObject({
      availability: 'unavailable',
      neverDonated: true,
      eligibleFrom: 0,
    });
    expect(donor?.institution).toBeUndefined();
    expect(donor?.areaText).toBeUndefined();
    expect(donor?.lastDonationDate).toBeUndefined();
    expect(donor?.lastDonationType).toBeUndefined();
    const rows = await t.run((ctx) =>
      ctx.db
        .query('donorProfiles')
        .withIndex('by_profile', (q) => q.eq('profileId', profileId))
        .collect(),
    );
    expect(rows).toHaveLength(1);
  });

  it('checks every field on the server (VAL-14a/b/c, VAL-22, VAL-23)', async () => {
    const t = makeT();
    const where = await places(t);
    const { as } = await member(t);
    const run = (changes: Partial<ReturnType<typeof setup> & { institution: string; areaText: string }>) =>
      fieldOf(as.mutation(api.donors.upsert, { ...setup(where), ...changes }));
    expect(
      await run({
        checklist: { weight: true, health: true, screening: false },
      }),
    ).toBe('validation.VAL-14c.invalid');
    expect(await run({ lastDonationDate: undefined })).toBe('validation.VAL-14b.missing');
    expect(await run({ lastDonationDate: '2099-01-01' })).toBe('validation.VAL-14b.future');
    expect(await run({ institution: 'x'.repeat(81) })).toBe('validation.VAL-22.invalid');
    expect(await run({ areaText: 'x'.repeat(81) })).toBe('validation.VAL-23.invalid');
    expect(await run({ districtId: where.otherDistrict })).toBe('validation.VAL-14a.invalid');
    expect(await run({ upazilaId: where.districtId })).toBe('validation.VAL-14a.invalid');
    expect(await run({ healthConsentVersion: 'old' })).toBe('ERR_CONSENT_REQUIRED');
  });

  it('a date without a type counts as whole blood; platelets use their own interval', async () => {
    const t = makeT();
    const where = await places(t);
    const { as, profileId } = await member(t);
    await as.mutation(api.donors.upsert, {
      ...setup(where),
      lastDonationType: undefined,
    });
    expect((await donorOf(t, profileId))?.lastDonationType).toBe('whole_blood');
    await as.mutation(api.donors.upsert, {
      ...setup(where),
      lastDonationType: 'platelets',
    });
    const donor = await donorOf(t, profileId);
    // Platelets 2026-10-01: platelets again after 14 days (S-06), whole blood after S-07.
    expect(donor?.eligibleFromPlatelets).toBe(Date.UTC(2026, 9, 15) - 6 * 3_600_000);
  });

  it('a practice account makes a practice donor', async () => {
    const t = makeT();
    const where = await places(t);
    const { as, profileId } = await member(t, { isDemo: true });
    await as.mutation(api.donors.upsert, setup(where));
    expect((await donorOf(t, profileId))?.isDemo).toBe(true);
  });
});

describe('donors.getMine', () => {
  it('returns the own donor profile, eligibility and reasons, never a phone number', async () => {
    const t = makeT();
    const where = await places(t);
    const { as } = await member(t);
    expect(await as.query(api.donors.getMine, {})).toBeNull();
    await as.mutation(api.donors.upsert, {
      ...setup(where),
      bloodGroup: 'unknown',
      institution: 'CU',
    });
    const mine = await as.query(api.donors.getMine, {});
    expect(mine).toMatchObject({
      donor: {
        bloodGroup: 'unknown',
        institution: 'CU',
        areaText: null,
        availability: 'available',
      },
      live: false,
      notLiveReasons: ['phone', 'group'],
    });
    expect(JSON.stringify(mine)).not.toContain('+880');
  });
});

describe('donors.setAvailability', () => {
  it('changes availability and logs the change once', async () => {
    const t = makeT();
    const where = await places(t);
    const { as, profileId } = await member(t);
    await as.mutation(api.donors.upsert, setup(where));
    await as.mutation(api.donors.setAvailability, {
      availability: 'unavailable',
    });
    await as.mutation(api.donors.setAvailability, {
      availability: 'unavailable',
    });
    expect((await donorOf(t, profileId))?.availability).toBe('unavailable');
    expect((await eventsNamed(t, 'availability_changed')).map((event) => event.props)).toEqual([
      { state: 'unavailable' },
    ]);
  });
});

describe('phone verification makes a donor live', () => {
  it('in person: the donor goes live when the volunteer confirms', async () => {
    const t = makeT();
    const where = await places(t);
    const donor = await member(t);
    await donor.as.mutation(api.donors.upsert, setup(where));
    const admin = await member(t, {
      role: 'admin',
      phone: '+8801812345678',
      phoneVerified: true,
    });
    await t.run((ctx) =>
      ctx.db.insert('settings', {
        key: 'verification',
        value: {
          telegram: false,
          whatsapp: false,
          inPerson: true,
          telegramBot: '',
          whatsappNumber: '',
        },
      }),
    );
    const { code } = await donor.as.mutation(api.phoneVerification.startInPerson, {});
    const found = await admin.as.query(api.phoneVerification.lookupInPerson, {
      code,
    });
    await admin.as.mutation(api.phoneVerification.confirmInPerson, {
      verificationId: found.verificationId,
      matches: true,
    });
    expect((await donorOf(t, donor.profileId))?.live).toBe(true);
    expect(await donor.as.query(api.donors.getMine, {})).toMatchObject({
      live: true,
      notLiveReasons: [],
    });
    expect(await eventsNamed(t, 'donor_profile_live')).toHaveLength(1);
  });
});
