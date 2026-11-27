/**
 * `requests.create` (SCR-M02 form path) and `hospitals.search` (CMP-PlacePicker): access, idempotency (specs §9
 * "same clientId twice → one record"), S-22 limits, VAL-03…VAL-11 on the server, practice-area isolation.
 */
import { describe, expect, it, vi } from 'vitest';

import { api } from './_generated/api';
import type { Doc, Id } from './_generated/dataModel';
import { readAppError } from './_lib/errors';
import { dhakaMonthStart } from './rules/time';
import { insertPlaces, insertProfile, makeT, signIn, type ProfileOverrides, type T } from './test.setup';

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;
type Where = Awaited<ReturnType<typeof insertPlaces>>;

async function errorOf(promise: Promise<unknown>): Promise<string | null> {
  try {
    await promise;
    return null;
  } catch (error) {
    const data = readAppError(error);
    if (!data) return `non-app error: ${String(error)}`;
    return data.code === 'ERR_VALIDATION' ? (data.messageKey ?? data.code) : data.code;
  }
}

let people = 0;
async function member(t: T, overrides: ProfileOverrides = {}) {
  people += 1;
  const { as, userId } = await signIn(t, `requester${people}@example.com`);
  const profileId = await insertProfile(t, userId, overrides);
  return { as, profileId };
}

let clients = 0;
function form(where: Where, overrides: Record<string, unknown> = {}) {
  clients += 1;
  return {
    clientId: `client-${String(clients).padStart(4, '0')}`,
    bloodGroup: 'B+' as const,
    component: 'whole_blood' as const,
    isDengue: false,
    unitsNeeded: 2,
    divisionId: where.divisionId,
    districtId: where.districtId,
    upazilaId: where.upazilaId,
    placeText: 'Max Hospital, Mehedibag',
    neededBy: Date.now() + 2 * HOUR,
    contactPhone: '01712345678',
    source: 'form' as const,
    aiAssisted: false,
    lang: 'en' as const,
    ...overrides,
  };
}

const requestsOf = (t: T, requesterId: Id<'profiles'>) =>
  t.run((ctx) =>
    ctx.db
      .query('requests')
      .withIndex('by_requester_status', (q) => q.eq('requesterId', requesterId))
      .collect(),
  );

/** A request row written straight into the database (for limit counts and practice data). */
async function insertRequest(
  t: T,
  requesterId: Id<'profiles'>,
  where: Where,
  overrides: Partial<Doc<'requests'>> = {},
): Promise<Id<'requests'>> {
  clients += 1;
  return t.run((ctx) =>
    ctx.db.insert('requests', {
      requesterId,
      source: 'form',
      clientId: `seeded-${clients}`,
      bloodGroup: 'O+',
      component: 'whole_blood',
      isDengue: false,
      unitsNeeded: 1,
      unitsConfirmed: 0,
      divisionId: where.divisionId,
      districtId: where.districtId,
      upazilaId: where.upazilaId,
      approxLat: 22.35,
      approxLng: 91.83,
      neededBy: Date.now() + HOUR,
      urgency: 'now',
      contactPhone: '+8801712345678',
      contactPhoneVerified: false,
      lang: 'en',
      publicSlug: `seed${String(clients).padStart(6, '0')}`,
      status: 'live',
      wave: 0,
      volunteerShownIds: [],
      fallbackShown: false,
      zeroEligibleAtPublish: false,
      verifiedBadge: false,
      slipStatus: 'none',
      revealsFrozen: false,
      hiddenByModerator: false,
      aiAssisted: false,
      isDemo: false,
      ...overrides,
    }),
  );
}

async function insertHospital(t: T, where: Where, overrides: Partial<Doc<'hospitals'>> = {}) {
  return t.run((ctx) =>
    ctx.db.insert('hospitals', {
      nameEn: 'Chattogram Medical College Hospital',
      nameBn: 'চট্টগ্রাম মেডিকেল কলেজ হাসপাতাল',
      aliases: ['CMCH', 'চমেক'],
      searchText: 'chattogram medical college hospital চট্টগ্রাম মেডিকেল কলেজ হাসপাতাল cmch চমেক',
      type: 'hospital',
      divisionId: where.divisionId,
      districtId: where.districtId,
      upazilaId: where.upazilaId,
      lat: 22.359812,
      lng: 91.830634,
      active: true,
      isDemo: false,
      ...overrides,
    }),
  );
}

describe('access', () => {
  it('posting needs a signed-in member; a frozen account cannot post', async () => {
    const t = makeT();
    const where = await insertPlaces(t);
    expect(await errorOf(t.mutation(api.requests.create, form(where)))).toBe('ERR_UNAUTHENTICATED');
    const { as } = await member(t, { status: 'frozen' });
    expect(await errorOf(as.mutation(api.requests.create, form(where)))).toBe('ERR_FROZEN');
  });

  it('hospital search is public', async () => {
    const t = makeT();
    const where = await insertPlaces(t);
    await insertHospital(t, where);
    expect(await t.query(api.hospitals.search, { text: 'cmch' })).toHaveLength(1);
  });
});

describe('requests.create', () => {
  it('stores the request with derived fields and logs a phone-free event', async () => {
    const t = makeT();
    const where = await insertPlaces(t);
    const { as, profileId } = await member(t);
    const result = await as.mutation(api.requests.create, form(where, { note: 'Gate 2, ask for ward 5' }));
    expect(result.existing).toBe(false);

    const [request] = await requestsOf(t, profileId);
    expect(request).toMatchObject({
      _id: result.requestId,
      bloodGroup: 'B+',
      unitsNeeded: 2,
      unitsConfirmed: 0,
      urgency: 'now',
      status: 'live',
      wave: 0,
      placeText: 'Max Hospital, Mehedibag',
      note: 'Gate 2, ask for ward 5',
      contactPhone: '+8801712345678',
      contactPhoneVerified: false,
      approxLat: 22.35,
      approxLng: 91.83,
      isDemo: false,
    });
    expect(request?.publicSlug).toMatch(/^[a-z2-9]{10}$/);

    const events = await t.run((ctx) =>
      ctx.db
        .query('events')
        .withIndex('by_name', (q) => q.eq('name', 'request_published'))
        .collect(),
    );
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({ requestId: result.requestId, props: { aiAssisted: false, source: 'form' } });
    expect(JSON.stringify(events[0])).not.toMatch(/1712345678/);
  });

  it('the same clientId twice → one record', async () => {
    const t = makeT();
    const where = await insertPlaces(t);
    const { as, profileId } = await member(t);
    const args = form(where);
    const first = await as.mutation(api.requests.create, args);
    const second = await as.mutation(api.requests.create, args);
    expect(second).toEqual({ requestId: first.requestId, existing: true });
    expect(await requestsOf(t, profileId)).toHaveLength(1);

    const other = await member(t);
    expect(await errorOf(other.as.mutation(api.requests.create, args))).toBe('ERR_FORBIDDEN');
  });

  it('marks the contact verified only when it is my own verified number', async () => {
    const t = makeT();
    const where = await insertPlaces(t);
    const { as, profileId } = await member(t, { phoneVerified: true });
    await as.mutation(api.requests.create, form(where, { contactPhone: '+880 1712-345678' }));
    await as.mutation(api.requests.create, form(where, { contactPhone: '01812345678' }));
    const rows = await requestsOf(t, profileId);
    expect(rows.map((row) => row.contactPhoneVerified).sort()).toEqual([false, true]);
  });

  it('a hospital sets the place and point; practice or closed hospitals are refused', async () => {
    const t = makeT();
    const where = await insertPlaces(t);
    const hospitalId = await insertHospital(t, where);
    const { as, profileId } = await member(t);
    await as.mutation(
      api.requests.create,
      form(where, { hospitalId, districtId: where.otherDistrict, placeText: undefined }),
    );
    const [request] = await requestsOf(t, profileId);
    expect(request).toMatchObject({ hospitalId, districtId: where.districtId, approxLat: 22.36, approxLng: 91.831 });
    expect(request?.placeText).toBeUndefined();

    const practice = await insertHospital(t, where, { isDemo: true });
    expect(await errorOf(as.mutation(api.requests.create, form(where, { hospitalId: practice })))).toBe(
      'ERR_DEMO_ISOLATION',
    );
    const closed = await insertHospital(t, where, { active: false });
    expect(await errorOf(as.mutation(api.requests.create, form(where, { hospitalId: closed })))).toBe(
      'validation.VAL-07.empty',
    );
  });

  it('a practice account makes practice requests', async () => {
    const t = makeT();
    const where = await insertPlaces(t);
    const { as, profileId } = await member(t, { isDemo: true });
    await as.mutation(api.requests.create, form(where));
    const [request] = await requestsOf(t, profileId);
    expect(request?.isDemo).toBe(true);
  });

  it('checks every field on the server (VAL-03 … VAL-11)', async () => {
    const t = makeT();
    const where = await insertPlaces(t);
    const { as } = await member(t);
    const post = (overrides: Record<string, unknown>) =>
      errorOf(as.mutation(api.requests.create, form(where, overrides)));
    expect(await post({ clientId: 'x' })).toBe('errors.ERR_VALIDATION');
    expect(await post({ bloodGroup: 'any', component: 'platelets' })).toBe('validation.VAL-05.combo');
    expect(await post({ unitsNeeded: 0 })).toBe('validation.VAL-06.range');
    expect(await post({ unitsNeeded: 11 })).toBe('validation.VAL-06.range');
    expect(await post({ neededBy: Date.now() - HOUR })).toBe('validation.VAL-08.past');
    expect(await post({ neededBy: Date.now() + 31 * DAY })).toBe('validation.VAL-08.far');
    expect(await post({ contactPhone: '12345' })).toBe('validation.VAL-03.invalid');
    expect(await post({ contactPhone: '' })).toBe('validation.VAL-03.empty');
    expect(await post({ patientName: 'Bed 12' })).toBe('validation.VAL-01.chars');
    expect(await post({ ward: 'x'.repeat(41) })).toBe('validation.VAL-10.long');
    expect(await post({ note: 'call 01812345678' })).toBe('validation.VAL-11.phone');
    expect(await post({ placeText: 'ab' })).toBe('validation.VAL-07.placeText');
    expect(await post({ districtId: where.otherDistrict })).toBe('validation.VAL-07.empty');
  });
});

describe('limits (S-22)', () => {
  it('unverified phone: 1 open request; verified: 2', async () => {
    const t = makeT();
    const where = await insertPlaces(t);
    const unverified = await member(t);
    await unverified.as.mutation(api.requests.create, form(where));
    const refused = unverified.as.mutation(api.requests.create, form(where));
    expect(await errorOf(refused)).toBe('ERR_OPEN_REQUEST_LIMIT');

    const verified = await member(t, { phoneVerified: true });
    await verified.as.mutation(api.requests.create, form(where));
    await verified.as.mutation(api.requests.create, form(where));
    expect(await errorOf(verified.as.mutation(api.requests.create, form(where)))).toBe('ERR_OPEN_REQUEST_LIMIT');
  });

  it('closed requests do not count as open, but count towards 5 a month', async () => {
    const t = makeT();
    const where = await insertPlaces(t);
    const { as, profileId } = await member(t);
    for (let i = 0; i < 4; i += 1)
      await insertRequest(t, profileId, where, { status: 'closed', closeReason: 'fulfilled' });
    await as.mutation(api.requests.create, form(where));
    await t.run(async (ctx) => {
      const live = await ctx.db
        .query('requests')
        .withIndex('by_requester_status', (q) => q.eq('requesterId', profileId).eq('status', 'live'))
        .collect();
      for (const row of live) await ctx.db.patch(row._id, { status: 'closed', closeReason: 'fulfilled' });
    });
    expect(await errorOf(as.mutation(api.requests.create, form(where)))).toBe('ERR_MONTHLY_REQUEST_LIMIT');
  });

  it('requests from last month (Dhaka time) do not count', async () => {
    // 1 Nov 2026, 00:30 in Dhaka is still 31 Oct in UTC — the month is counted in Dhaka time.
    const novemberInDhaka = Date.UTC(2026, 9, 31, 18, 30);
    const octoberInDhaka = Date.UTC(2026, 9, 31, 17, 50); // 31 Oct, 23:50 in Dhaka
    vi.useFakeTimers({ toFake: ['Date'] });
    try {
      // convex-test creation times only move forward, so everything starts in October.
      vi.setSystemTime(octoberInDhaka);
      const t = makeT();
      const where = await insertPlaces(t);
      const { as, profileId } = await member(t);
      for (let i = 0; i < 5; i += 1) {
        await insertRequest(t, profileId, where, { status: 'closed', closeReason: 'expired' });
      }
      vi.setSystemTime(novemberInDhaka);
      const rows = await requestsOf(t, profileId);
      expect(rows.every((row) => row._creationTime < dhakaMonthStart(Date.now()))).toBe(true);
      await expect(as.mutation(api.requests.create, form(where))).resolves.toMatchObject({ existing: false });
    } finally {
      vi.useRealTimers();
    }
  });
});

describe('hospitals.search', () => {
  it('finds names and aliases; hides practice and closed hospitals; lists a district when the text is empty', async () => {
    const t = makeT();
    const where = await insertPlaces(t);
    await insertHospital(t, where);
    await insertHospital(t, where, { nameEn: 'Practice Hospital', searchText: 'practice hospital cmch', isDemo: true });
    await insertHospital(t, where, { nameEn: 'Old Clinic', searchText: 'old clinic cmch', active: false });

    const found = await t.query(api.hospitals.search, { text: '  CMCH ' });
    expect(found.map((h) => h.nameEn)).toEqual(['Chattogram Medical College Hospital']);
    expect(found[0]?.upazila?.nameEn).toBe('Kotwali');
    expect(await t.query(api.hospitals.search, { text: 'চমেক' })).toHaveLength(1);
    expect(await t.query(api.hospitals.search, { text: 'cmch', districtId: where.otherDistrict })).toHaveLength(0);
    expect(await t.query(api.hospitals.search, { text: '' })).toEqual([]);
    expect(await t.query(api.hospitals.search, { text: '', districtId: where.districtId })).toHaveLength(1);
  });
});
