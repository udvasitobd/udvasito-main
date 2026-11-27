/**
 * Matching v1 (specs §6.6, build prompt P1 item 9): `requests.create` schedules `internal.matching.startRequest`,
 * which alerts wave 1 — nearest eligible exact-group donors in the district — with `responses`, NTF-01 and events.
 * Fake timers keep the push component from calling Expo; the tests run `startRequest` themselves.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { formatDhakaDeadline } from '../src/lib/dates';

import { api, internal } from './_generated/api';
import type { Doc, Id } from './_generated/dataModel';
import type { MutationCtx } from './_generated/server';
import { pushNotifications } from './_lib/push';
import { insertPlaces, insertProfile, makeT, signIn, type ProfileOverrides, type T } from './test.setup';

const HOUR = 60 * 60 * 1000;
type Where = Awaited<ReturnType<typeof insertPlaces>> & { panchlaish: Id<'places'>; farThana: Id<'places'> };

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(Date.UTC(2026, 10, 27, 4, 0)); // 10:00 in Dhaka
});
afterEach(() => {
  vi.useRealTimers();
});

async function setup() {
  const t = makeT();
  const base = await insertPlaces(t);
  const more = await t.run(async (ctx) => {
    const thana = {
      level: 'upazila' as const,
      parentId: base.districtId,
      lng: 91.83,
      isMetroThana: true,
      neighbourIds: [],
    };
    return {
      panchlaish: await ctx.db.insert('places', {
        ...thana,
        code: '201557',
        nameEn: 'Panchlaish',
        nameBn: 'পাঁচলাইশ',
        lat: 22.37,
      }),
      farThana: await ctx.db.insert('places', { ...thana, code: '201599', nameEn: 'Far', nameBn: 'দূর', lat: 22.45 }),
    };
  });
  // Small waves keep the tests readable: S-08 = [3, 5, 8].
  await t.run((ctx) => ctx.db.insert('settings', { key: 'waveSizes', value: [3, 5, 8] }));
  return { t, where: { ...base, ...more } as Where };
}

let people = 0;
type DonorOptions = Partial<
  Pick<
    Doc<'donorProfiles'>,
    'bloodGroup' | 'upazilaId' | 'districtId' | 'live' | 'availability' | 'plateletOptIn' | 'isDemo'
  >
> & {
  profile?: ProfileOverrides;
  authUserId?: string;
};

async function donor(t: T, where: Where, options: DonorOptions = {}) {
  people += 1;
  const { profile = {}, authUserId = `auth-donor-${people}`, ...fields } = options;
  const isDemo = fields.isDemo ?? false;
  const profileId = await insertProfile(t, authUserId, {
    name: `Donor ${people}`,
    firstName: 'Donor',
    phone: `+88017${String(people).padStart(8, '0')}`,
    phoneVerified: true,
    isDemo,
    ...profile,
  });
  const donorProfileId = await t.run((ctx) =>
    ctx.db.insert('donorProfiles', {
      profileId,
      bloodGroup: 'B+',
      gender: 'male',
      divisionId: where.divisionId,
      districtId: where.districtId,
      upazilaId: where.upazilaId,
      travelRange: 'district',
      neverDonated: true,
      plateletOptIn: false,
      availability: 'available',
      availabilityConfirmedAt: Date.now(),
      eligibleFrom: 0,
      eligibleFromPlatelets: 0,
      callMode: 'mutual',
      volunteersMayCall: false,
      verifiedRequestsOnly: false,
      alertCapPerDay: 3,
      quietStart: '00:00',
      quietEnd: '07:00',
      urgentOverride: true,
      hidden: false,
      live: true,
      selfCheckAt: Date.now(),
      healthConsentVersion: '2026-11-28-pilot',
      noShowAt: [],
      isDemo,
      ...fields,
    }),
  );
  return { profileId, donorProfileId };
}

let clients = 0;
function requestArgs(where: Where, overrides: Record<string, unknown> = {}) {
  clients += 1;
  return {
    clientId: `match-${String(clients).padStart(4, '0')}`,
    bloodGroup: 'B+' as const,
    component: 'whole_blood' as const,
    isDengue: false,
    unitsNeeded: 2,
    divisionId: where.divisionId,
    districtId: where.districtId,
    upazilaId: where.upazilaId,
    placeText: 'Max Hospital, Mehedibag',
    neededBy: Date.now() + 2 * HOUR,
    contactPhone: '01812345678',
    patientName: 'Amina Begum',
    source: 'form' as const,
    aiAssisted: false,
    lang: 'en' as const,
    ...overrides,
  };
}

async function postRequest(
  t: T,
  where: Where,
  overrides: Record<string, unknown> = {},
  profile: ProfileOverrides = {},
) {
  people += 1;
  const { as, userId } = await signIn(t, `requester${people}@example.com`);
  await insertProfile(t, userId, { name: 'Karim Hossain', firstName: 'Karim', ...profile });
  const { requestId } = await as.mutation(api.requests.create, requestArgs(where, overrides));
  return { requestId };
}

const start = (t: T, requestId: Id<'requests'>) => t.mutation(internal.matching.startRequest, { requestId });
const responsesOf = (t: T, requestId: Id<'requests'>) =>
  t.run((ctx) =>
    ctx.db
      .query('responses')
      .withIndex('by_request_donor', (q) => q.eq('requestId', requestId))
      .collect(),
  );
const eventsOf = (t: T, requestId: Id<'requests'>) =>
  t.run((ctx) =>
    ctx.db
      .query('events')
      .withIndex('by_request', (q) => q.eq('requestId', requestId))
      .collect(),
  );
const notified = async (t: T, requestId: Id<'requests'>) =>
  (await responsesOf(t, requestId)).map((r) => r.donorProfileId).sort();

describe('requests.create → startRequest', () => {
  it('schedules matching straight after publish', async () => {
    const { t, where } = await setup();
    const { requestId } = await postRequest(t, where);
    const scheduled = await t.run((ctx) => ctx.db.system.query('_scheduled_functions').collect());
    expect(scheduled.map((s) => [s.name, s.args])).toContainEqual(['matching:startRequest', [{ requestId }]]);
  });
});

describe('wave 1', () => {
  it('alerts the S-08 nearest eligible exact-group donors in the district, recently active first', async () => {
    const { t, where } = await setup();
    const hereRecent = await donor(t, where, { profile: { lastActiveAt: Date.now() - HOUR } });
    const hereOlder = await donor(t, where, { profile: { lastActiveAt: Date.now() - 9 * HOUR } });
    const near = await donor(t, where, { upazilaId: where.panchlaish });
    const far = await donor(t, where, { upazilaId: where.farThana });
    // Never alerted: wrong group, other district, practice donor, not live, paused.
    await donor(t, where, { bloodGroup: 'O-' });
    await donor(t, where, { districtId: where.otherDistrict });
    await donor(t, where, { isDemo: true });
    await donor(t, where, { live: false });
    await donor(t, where, { availability: 'paused' });

    const { requestId } = await postRequest(t, where);
    await start(t, requestId);

    const responses = await responsesOf(t, requestId);
    expect(responses.map((r) => r.donorProfileId).sort()).toEqual(
      [hereRecent, hereOlder, near].map((d) => d.donorProfileId).sort(),
    );
    expect(responses.every((r) => r.state === 'notified' && r.wave === 1 && !r.isDemo)).toBe(true);
    expect(responses.map((r) => r.donorProfileId)).not.toContain(far.donorProfileId);

    const request = await t.run((ctx) => ctx.db.get(requestId));
    expect(request).toMatchObject({ wave: 1, zeroEligibleAtPublish: false });

    const events = await eventsOf(t, requestId);
    expect(events.filter((e) => e.name === 'wave_sent').map((e) => e.props)).toEqual([{ n: 1, size: 3 }]);
    expect(events.filter((e) => e.name === 'notification_sent')).toHaveLength(3);
    // No device registered → the alert waits in the app.
    const notifications = await t.run((ctx) =>
      ctx.db
        .query('notifications')
        .withIndex('by_request', (q) => q.eq('requestId', requestId))
        .collect(),
    );
    expect(notifications.map((n) => [n.template, n.channel, n.status])).toEqual(
      Array(3).fill(['NTF-01', 'inapp', 'sent']),
    );
  });

  it('pushes NTF-01 in the donor’s language — no phone number, no patient or requester name (P-13)', async () => {
    const { t, where } = await setup();
    const en = await donor(t, where, { upazilaId: where.panchlaish });
    const bn = await donor(t, where, { upazilaId: where.panchlaish, profile: { language: 'bn' } });
    for (const d of [en, bn]) {
      await t.run((ctx) =>
        pushNotifications.recordToken(ctx as unknown as MutationCtx, {
          userId: d.profileId,
          pushToken: `ExponentPushToken[token-${d.profileId}]`,
        }),
      );
    }
    const { requestId } = await postRequest(t, where, { neededBy: Date.now() + HOUR });
    await start(t, requestId);

    const pushed = async (profileId: Id<'profiles'>) => {
      const list = await t.run((ctx) =>
        pushNotifications.getNotificationsForUser(ctx as unknown as MutationCtx, { userId: profileId }),
      );
      expect(list).toHaveLength(1);
      return list[0]!;
    };
    const time = (lang: 'en' | 'bn') => formatDhakaDeadline(Date.now() + HOUR, Date.now(), lang);
    const english = await pushed(en.profileId);
    expect(english.title).toBe('URGENT · B+ Whole blood needed · Max Hospital, Mehedibag');
    expect(english.body).toBe(`2 bag(s) by ${time('en')} · 2.2 km. Tap to answer.`);
    expect(english.channelId).toBe('blood-requests');
    expect(english.data.url).toBe(`/alerts/${requestId}`);
    const bangla = await pushed(bn.profileId);
    expect(bangla.title).toBe('জরুরি · B+ সম্পূর্ণ রক্ত প্রয়োজন · Max Hospital, Mehedibag');
    expect(bangla.body).toBe(`২ ব্যাগ, ${time('bn')}-এর মধ্যে · ২.২ কিমি। উত্তর দিতে ট্যাপ করুন।`);

    for (const text of [english, bangla].flatMap((n) => [n.title, n.body])) {
      expect(text).not.toMatch(/Karim|Amina|01[3-9]\d{8}|\+880/);
    }
    const rows = await t.run((ctx) =>
      ctx.db
        .query('notifications')
        .withIndex('by_recipient', (q) => q.eq('recipientId', en.profileId))
        .collect(),
    );
    expect(rows.map((n) => [n.channel, n.status])).toEqual([['expo', 'queued']]);
    expect(english.data.notificationId).toBe(rows[0]!._id);
  });

  it('never alerts the requester about their own request; platelets only reach opted-in donors', async () => {
    const { t, where } = await setup();
    const { as, userId } = await signIn(t, 'self@example.com');
    await donor(t, where, { authUserId: userId, plateletOptIn: true });
    const optedIn = await donor(t, where, { plateletOptIn: true });
    await donor(t, where);
    const { requestId } = await as.mutation(
      api.requests.create,
      requestArgs(where, { component: 'platelets', isDengue: true }),
    );
    await start(t, requestId);
    expect(await notified(t, requestId)).toEqual([optedIn.donorProfileId]);
  });

  it('practice and real never meet', async () => {
    const { t, where } = await setup();
    const real = await donor(t, where);
    const practice = await donor(t, where, { isDemo: true });
    const realRequest = await postRequest(t, where);
    const practiceRequest = await postRequest(t, where, {}, { isDemo: true, practiceId: 'P-01' });
    await start(t, realRequest.requestId);
    await start(t, practiceRequest.requestId);
    expect(await notified(t, realRequest.requestId)).toEqual([real.donorProfileId]);
    expect(await notified(t, practiceRequest.requestId)).toEqual([practice.donorProfileId]);
    const practiceResponses = await responsesOf(t, practiceRequest.requestId);
    expect(practiceResponses.every((r) => r.isDemo)).toBe(true);
  });

  it('no matching donor → zeroEligibleAtPublish; "Not sure" alerts nobody', async () => {
    const { t, where } = await setup();
    await donor(t, where, { bloodGroup: 'O+' });
    const rare = await postRequest(t, where, { bloodGroup: 'AB-' });
    await start(t, rare.requestId);
    expect(await t.run((ctx) => ctx.db.get(rare.requestId))).toMatchObject({ wave: 1, zeroEligibleAtPublish: true });
    expect((await eventsOf(t, rare.requestId)).filter((e) => e.name === 'wave_sent').map((e) => e.props)).toEqual([
      { n: 1, size: 0 },
    ]);

    const unsure = await postRequest(t, where, { bloodGroup: 'not_sure' });
    await start(t, unsure.requestId);
    expect(await t.run((ctx) => ctx.db.get(unsure.requestId))).toMatchObject({ wave: 0, zeroEligibleAtPublish: true });
    expect(await responsesOf(t, unsure.requestId)).toEqual([]);
  });

  it('runs once: a retry or a closed request alerts nobody new', async () => {
    const { t, where } = await setup();
    await donor(t, where);
    const first = await postRequest(t, where);
    await start(t, first.requestId);
    await donor(t, where);
    await start(t, first.requestId);
    expect(await responsesOf(t, first.requestId)).toHaveLength(1);

    const closed = await postRequest(t, where);
    await t.run((ctx) =>
      ctx.db.patch(closed.requestId, { status: 'closed', closeReason: 'not_needed', closedAt: Date.now() }),
    );
    await start(t, closed.requestId);
    expect(await responsesOf(t, closed.requestId)).toEqual([]);
    await t.run(async (ctx) => {
      await ctx.db.delete(closed.requestId);
    });
    await start(t, closed.requestId); // a deleted request is a no-op too
  });
});
