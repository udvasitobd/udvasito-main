/**
 * The 30-second path and "no donors yet" (build prompt P1 item 14; specs §6.6 `volunteerHotline`, SCR-M03 items 4
 * and 6; F-504): S-13 after publish without a "yes" the requester gets the helpline; with no matching donor at all
 * they are told at once, with the district's blood banks. Fake timers keep the push component from calling Expo.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { api, internal } from './_generated/api';
import type { Id } from './_generated/dataModel';
import { bloodBanksNear } from './_lib/bloodBanks';
import { donor, postRequest, setupMatching, signIn, type MatchPlaces, type T } from './test.setup';

const NOW = Date.UTC(2026, 10, 27, 4, 0); // 10:00 in Dhaka

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(NOW);
});
afterEach(() => {
  vi.useRealTimers();
});

const start = (t: T, requestId: Id<'requests'>) => t.mutation(internal.matching.startRequest, { requestId });
const hotline = (t: T, requestId: Id<'requests'>) => t.mutation(internal.matching.volunteerHotline, { requestId });
const scheduledHotlines = (t: T) =>
  t.run(async (ctx) =>
    (await ctx.db.system.query('_scheduled_functions').collect()).filter((s) => s.name === 'matching:volunteerHotline'),
  );

let taps = 0;
const acceptArgs = (requestId: Id<'requests'>) => {
  taps += 1;
  return {
    requestId,
    clientId: `fallback-tap-${String(taps).padStart(4, '0')}`,
    selfCheck: true as const,
    callMode: 'mutual' as const,
  };
};

async function signedInDonor(t: T, where: MatchPlaces, n: number) {
  const { as, userId } = await signIn(t, `fallback-donor${n}@example.com`);
  await donor(t, where, { authUserId: userId });
  return as;
}

/** A listed place in the test district (Kotwali sits at 22.35, 91.83). */
const place = (where: MatchPlaces, fields: Record<string, unknown>) => ({
  nameEn: 'Place',
  nameBn: 'স্থান',
  aliases: [],
  searchText: 'place',
  type: 'blood_bank' as const,
  divisionId: where.divisionId,
  districtId: where.districtId,
  upazilaId: where.upazilaId,
  lat: 22.35,
  lng: 91.83,
  active: true,
  isDemo: false,
  ...fields,
});

describe('volunteerHotline (S-13)', () => {
  it('is scheduled S-13 seconds after publish, from settings', async () => {
    const { t, where } = await setupMatching();
    await t.run(async (ctx) => {
      const row = await ctx.db
        .query('settings')
        .withIndex('by_key', (q) => q.eq('key', 'volunteerHotlineDelaySec'))
        .unique();
      if (row) await ctx.db.patch(row._id, { value: 45 });
      else await ctx.db.insert('settings', { key: 'volunteerHotlineDelaySec', value: 45 });
    });
    const { requestId } = await postRequest(t, where);
    await start(t, requestId);
    const jobs = await scheduledHotlines(t);
    expect(jobs.map((j) => [j.args, Math.round((j.scheduledTime - NOW) / 1000)])).toEqual([[[{ requestId }], 45]]);

    // startRequest runs once per request, so a retry does not schedule a second job.
    await start(t, requestId);
    expect(await scheduledHotlines(t)).toHaveLength(1);
  });

  it('no "yes" in time → the requester sees the helpline; nothing changes a second time', async () => {
    const { t, where } = await setupMatching();
    await signedInDonor(t, where, 1);
    const { requestId, as: owner } = await postRequest(t, where);
    await start(t, requestId);
    expect(await owner.query(api.requests.getForOwner, { requestId })).toMatchObject({
      fallbackShown: false,
      noDonors: { show: false, bloodBanks: [] },
    });

    await hotline(t, requestId);
    await hotline(t, requestId);
    const view = await owner.query(api.requests.getForOwner, { requestId });
    expect(view).toMatchObject({ fallbackShown: true, noDonors: { show: false } });
    // The helpline number is fetched on tap (D-R3), never sent with the request's status.
    expect(JSON.stringify(view)).not.toContain('+880');
  });

  it('a donor already said yes → no helpline', async () => {
    const { t, where } = await setupMatching();
    const nasrin = await signedInDonor(t, where, 2);
    const { requestId, as: owner } = await postRequest(t, where, { unitsNeeded: 2 });
    await start(t, requestId);
    await nasrin.mutation(api.responses.accept, acceptArgs(requestId));
    await hotline(t, requestId);
    expect(await t.run((ctx) => ctx.db.get(requestId))).toMatchObject({ fallbackShown: false });
    expect(await owner.query(api.requests.getForOwner, { requestId })).toMatchObject({ fallbackShown: false });
  });

  it('a closed request is left alone, and a shown helpline goes away when the request closes', async () => {
    const { t, where } = await setupMatching();
    await signedInDonor(t, where, 3);
    const first = await postRequest(t, where);
    await start(t, first.requestId);
    await first.as.mutation(api.requests.close, { requestId: first.requestId, reason: 'not_needed' });
    await hotline(t, first.requestId);
    expect(await t.run((ctx) => ctx.db.get(first.requestId))).toMatchObject({ fallbackShown: false });

    const second = await postRequest(t, where);
    await start(t, second.requestId);
    await hotline(t, second.requestId);
    await second.as.mutation(api.requests.close, { requestId: second.requestId, reason: 'fulfilled' });
    expect(await second.as.query(api.requests.getForOwner, { requestId: second.requestId })).toMatchObject({
      fallbackShown: false,
    });
  });

  it('a removed request does nothing', async () => {
    const { t, where } = await setupMatching();
    const { requestId } = await postRequest(t, where);
    await t.run((ctx) => ctx.db.delete(requestId));
    await expect(hotline(t, requestId)).resolves.toBeNull();
  });
});

describe('no donors yet (F-504)', () => {
  it('no matching donor at publish → told at once, with the district’s blood banks nearest first', async () => {
    const { t, where } = await setupMatching();
    const ids = await t.run(async (ctx) => ({
      far: await ctx.db.insert(
        'hospitals',
        place(where, { nameEn: 'Far Bank', nameBn: 'দূরের ব্যাংক', lat: 22.45, bloodBankPhone: '031-222222' }),
      ),
      near: await ctx.db.insert(
        'hospitals',
        place(where, {
          nameEn: 'Near Hospital',
          nameBn: 'কাছের হাসপাতাল',
          type: 'hospital',
          lat: 22.36,
          bloodBankPhone: '031-111111',
        }),
      ),
      // Never listed: no blood-bank number, closed down, another district, practice place.
      noPhone: await ctx.db.insert('hospitals', place(where, { nameEn: 'No Phone' })),
      inactive: await ctx.db.insert('hospitals', place(where, { active: false, bloodBankPhone: '031-333333' })),
      elsewhere: await ctx.db.insert(
        'hospitals',
        place(where, { districtId: where.otherDistrict, bloodBankPhone: '031-444444' }),
      ),
      practice: await ctx.db.insert('hospitals', place(where, { isDemo: true, bloodBankPhone: '031-555555' })),
    }));
    // The only donor is A+, so nobody matches this B+ request.
    await donor(t, where, { bloodGroup: 'A+' });
    const { requestId, as: owner } = await postRequest(t, where);
    await start(t, requestId);

    const view = await owner.query(api.requests.getForOwner, { requestId });
    expect(view.noDonors).toEqual({
      show: true,
      bloodBanks: [
        { hospitalId: ids.near, name: { en: 'Near Hospital', bn: 'কাছের হাসপাতাল' }, phone: '031-111111', km: 1.1 },
        { hospitalId: ids.far, name: { en: 'Far Bank', bn: 'দূরের ব্যাংক' }, phone: '031-222222', km: 11 },
      ],
    });

    // A practice request sees practice places only, so nobody practising calls a real blood bank.
    const practice = await t.run(async (ctx) =>
      bloodBanksNear(ctx, { ...(await ctx.db.get(requestId))!, isDemo: true }),
    );
    expect(practice.map((b) => b.hospitalId)).toEqual([ids.practice]);

    // Closed → the panel goes away.
    await owner.mutation(api.requests.close, { requestId, reason: 'not_needed' });
    expect((await owner.query(api.requests.getForOwner, { requestId })).noDonors).toEqual({
      show: false,
      bloodBanks: [],
    });
  });

  it('"Not sure" alerts no donor, so the requester is told at once', async () => {
    const { t, where } = await setupMatching();
    await donor(t, where);
    const { requestId, as: owner } = await postRequest(t, where, { bloodGroup: 'not_sure' });
    await start(t, requestId);
    expect(await owner.query(api.requests.getForOwner, { requestId })).toMatchObject({
      noDonors: { show: true, bloodBanks: [] },
      progress: { notified: 0 },
    });
  });
});
