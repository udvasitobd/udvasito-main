/**
 * The requester's side of a request (specs §6.2 `requests.getForOwner` / `listMine` / `close`; SCR-M03, SCR-M04;
 * build prompt P1 item 13): live progress, the confirmed donors' contact cards, closing and "no longer needed".
 * Fake timers keep the push component from calling Expo.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { api, internal } from './_generated/api';
import type { Id } from './_generated/dataModel';
import { readAppError } from './_lib/errors';
import {
  donor,
  insertProfile,
  postRequest,
  requestArgs,
  setupMatching,
  signIn,
  type MatchPlaces,
  type T,
} from './test.setup';

const DAY = 24 * 60 * 60 * 1000;
const NOW = Date.UTC(2026, 10, 27, 4, 0); // 10:00 in Dhaka

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(NOW);
});
afterEach(() => {
  vi.useRealTimers();
});

const codeOf = async (promise: Promise<unknown>) => {
  try {
    await promise;
    return null;
  } catch (error) {
    return readAppError(error)?.code ?? `non-app error: ${String(error)}`;
  }
};

let people = 0;
async function signedInDonor(t: T, where: MatchPlaces, firstName: string) {
  people += 1;
  const { as, userId } = await signIn(t, `owner-test-donor${people}@example.com`);
  const ids = await donor(t, where, { authUserId: userId, profile: { firstName } });
  return { as, ...ids };
}

let taps = 0;
const acceptArgs = (requestId: Id<'requests'>, callMode: 'mutual' | 'donor_calls' = 'mutual') => {
  taps += 1;
  return { requestId, clientId: `owner-tap-${String(taps).padStart(4, '0')}`, selfCheck: true as const, callMode };
};

/** Four donors, a 1-bag request from Karim, wave 1 sent to all four. */
async function scene() {
  const { t, where } = await setupMatching();
  // The test seed alerts 3 donors in wave 1; these scenes need all four.
  await t.run(async (ctx) => {
    const row = await ctx.db
      .query('settings')
      .withIndex('by_key', (q) => q.eq('key', 'waveSizes'))
      .unique();
    await ctx.db.patch(row!._id, { value: [5, 5, 8] });
  });
  const nasrin = await signedInDonor(t, where, 'Nasrin');
  const tanvir = await signedInDonor(t, where, 'Tanvir');
  const sabbir = await signedInDonor(t, where, 'Sabbir');
  const mitu = await signedInDonor(t, where, 'Mitu');
  const { requestId, as: owner } = await postRequest(t, where, { unitsNeeded: 1, note: 'Second floor.' });
  await t.mutation(internal.matching.startRequest, { requestId });
  return { t, where, owner, requestId, nasrin, tanvir, sabbir, mitu };
}

const notificationsOf = (t: T, requestId: Id<'requests'>, template: string) =>
  t.run(async (ctx) =>
    (await ctx.db.query('notifications').collect()).filter((n) => n.requestId === requestId && n.template === template),
  );
const revealsOf = (t: T, requestId: Id<'requests'>) =>
  t.run((ctx) =>
    ctx.db
      .query('contactReveals')
      .withIndex('by_request', (q) => q.eq('requestId', requestId))
      .collect(),
  );
const page = { numItems: 10, cursor: null };

describe('access', () => {
  it('signed out is refused; anyone but the owner gets ERR_NOT_FOUND; the practice line holds', async () => {
    const { t, requestId, nasrin } = await scene();
    expect(await codeOf(t.query(api.requests.getForOwner, { requestId }))).toBe('ERR_UNAUTHENTICATED');
    expect(await codeOf(t.query(api.requests.listMine, { status: 'active', paginationOpts: page }))).toBe(
      'ERR_UNAUTHENTICATED',
    );
    expect(await codeOf(t.mutation(api.requests.close, { requestId, reason: 'fulfilled' }))).toBe(
      'ERR_UNAUTHENTICATED',
    );

    // A donor on the request is not its owner.
    expect(await codeOf(nasrin.as.query(api.requests.getForOwner, { requestId }))).toBe('ERR_NOT_FOUND');
    expect(await codeOf(nasrin.as.mutation(api.requests.close, { requestId, reason: 'fulfilled' }))).toBe(
      'ERR_NOT_FOUND',
    );
    expect((await nasrin.as.query(api.requests.listMine, { status: 'active', paginationOpts: page })).page).toEqual([]);
  });

  it('the owner’s own request across the practice line is not found', async () => {
    const { t, owner, requestId } = await scene();
    await t.run((ctx) => ctx.db.patch(requestId, { isDemo: true }));
    expect(await codeOf(owner.query(api.requests.getForOwner, { requestId }))).toBe('ERR_NOT_FOUND');
    expect(await codeOf(owner.mutation(api.requests.close, { requestId, reason: 'fulfilled' }))).toBe('ERR_NOT_FOUND');
    expect((await owner.query(api.requests.listMine, { status: 'active', paginationOpts: page })).page).toEqual([]);
  });
});

describe('requests.getForOwner', () => {
  it('right after wave 1: everyone alerted, nobody yet, no contact cards', async () => {
    const { owner, requestId } = await scene();
    const view = await owner.query(api.requests.getForOwner, { requestId });
    expect(view.progress).toEqual({ notified: 4, opened: 0, accepted: 0, confirmed: 0 });
    expect(view.confirmedDonors).toEqual([]);
    expect(view.request).toMatchObject({
      status: 'live',
      unitsNeeded: 1,
      unitsConfirmed: 0,
      note: 'Second floor.',
      closeReason: null,
    });
    expect(view.practice).toBe(false);
    // The owner's own contact number is not sent back to them either.
    expect(JSON.stringify(view)).not.toMatch(/\+880|01[3-9]\d{8}/);
  });

  it('counts each step; a number only for a donor who shares it ("I’ll call them" shows none)', async () => {
    const { owner, requestId, nasrin, tanvir, sabbir, mitu } = await scene();
    await nasrin.as.mutation(api.responses.accept, acceptArgs(requestId, 'mutual'));
    await tanvir.as.mutation(api.responses.accept, acceptArgs(requestId, 'donor_calls'));
    await sabbir.as.mutation(api.responses.decline, { requestId, reason: 'far' });
    await mitu.as.mutation(api.responses.markOpened, { requestId });

    const view = await owner.query(api.requests.getForOwner, { requestId });
    expect(view.progress).toEqual({ notified: 4, opened: 4, accepted: 2, confirmed: 2 });
    expect(view.request).toMatchObject({ status: 'covered', unitsConfirmed: 1 });
    expect(view.confirmedDonors.map((d) => [d.firstName, d.callMode, d.phone !== null])).toEqual([
      ['Nasrin', 'mutual', true],
      ['Tanvir', 'donor_calls', false],
    ]);
    expect(view.confirmedDonors[0]).toMatchObject({ group: 'B+', area: { en: 'Kotwali' } });
    expect(view.confirmedDonors[0]!.phone).toMatch(/^\+8801\d{9}$/);
    expect(typeof view.confirmedDonors[0]!.km).toBe('number');
  });

  it('paused contact details (a report under review) hide every number', async () => {
    const { t, owner, requestId, nasrin } = await scene();
    await nasrin.as.mutation(api.responses.accept, acceptArgs(requestId));
    await t.run((ctx) => ctx.db.patch(requestId, { revealsFrozen: true }));
    const view = await owner.query(api.requests.getForOwner, { requestId });
    expect(view.revealsFrozen).toBe(true);
    expect(view.confirmedDonors[0]!.phone).toBeNull();
    expect(JSON.stringify(view)).not.toMatch(/\+880/);
  });

  it('an expired reveal shows no number', async () => {
    const { t, owner, requestId, nasrin } = await scene();
    await nasrin.as.mutation(api.responses.accept, acceptArgs(requestId));
    for (const reveal of await revealsOf(t, requestId))
      await t.run((ctx) => ctx.db.patch(reveal._id, { expiresAt: NOW - 1 }));
    const view = await owner.query(api.requests.getForOwner, { requestId });
    expect(view.confirmedDonors[0]!.phone).toBeNull();
  });
});

describe('requests.close', () => {
  it('fulfilled: closed now; donors still deciding or on standby get NTF-09; numbers stay S-18 days', async () => {
    const { t, owner, requestId, nasrin, tanvir, sabbir, mitu } = await scene();
    await nasrin.as.mutation(api.responses.accept, acceptArgs(requestId)); // confirmed
    await tanvir.as.mutation(api.responses.accept, acceptArgs(requestId)); // confirmed (units + S-12)
    await sabbir.as.mutation(api.responses.accept, acceptArgs(requestId)); // standby
    await mitu.as.mutation(api.responses.decline, { requestId }); // declined

    vi.setSystemTime(NOW + 60 * 60 * 1000);
    expect(await owner.mutation(api.requests.close, { requestId, reason: 'fulfilled' })).toBeNull();

    const request = await t.run((ctx) => ctx.db.get(requestId));
    expect(request).toMatchObject({ status: 'closed', closeReason: 'fulfilled', closedAt: NOW + 60 * 60 * 1000 });
    expect(request!.nextWaveAt).toBeUndefined();

    const told = await notificationsOf(t, requestId, 'NTF-09');
    expect(told.map((n) => n.recipientId)).toEqual([sabbir.profileId]);
    expect(told[0]).toMatchObject({ isDemo: false });

    const reveals = await revealsOf(t, requestId);
    expect(reveals.length).toBeGreaterThan(0);
    for (const reveal of reveals) expect(reveal.expiresAt).toBe(NOW + 60 * 60 * 1000 + 7 * DAY);

    const events = await t.run(async (ctx) =>
      (
        await ctx.db
          .query('events')
          .withIndex('by_request', (q) => q.eq('requestId', requestId))
          .collect()
      ).filter((e) => e.name === 'request_closed'),
    );
    expect(events).toHaveLength(1);
    expect(events[0]!.props).toEqual({ reason: 'fulfilled' });

    expect(await codeOf(owner.mutation(api.requests.close, { requestId, reason: 'not_needed' }))).toBe(
      'ERR_REQUEST_CLOSED',
    );
    // The donor's own screen shows it closed, and a late tap is refused.
    expect((await mitu.as.query(api.responses.getForDonor, { requestId })).request.closed).toBe(true);
  });

  it('no longer needed: every donor who has not answered is told, in their own language', async () => {
    const { t, owner, requestId, nasrin, tanvir } = await scene();
    await t.run((ctx) => ctx.db.patch(tanvir.profileId, { language: 'bn' }));
    await nasrin.as.mutation(api.responses.markOpened, { requestId });
    await owner.mutation(api.requests.close, { requestId, reason: 'not_needed' });

    const told = await notificationsOf(t, requestId, 'NTF-09');
    expect(told).toHaveLength(4);
    expect(await t.run((ctx) => ctx.db.get(requestId))).toMatchObject({ closeReason: 'not_needed' });
    // A wave job that runs after the close finds nothing to do.
    await t.mutation(internal.matching.startRequest, { requestId });
    expect(await notificationsOf(t, requestId, 'NTF-01')).toHaveLength(4);
  });
});

describe('requests.listMine', () => {
  it('active and closed apart, newest first; only the caller’s own requests', async () => {
    const { t, where, owner, requestId } = await scene();
    // A second request from the same person (verified phone → two open requests allowed, S-22).
    const ownerProfile = await t.run(async (ctx) => (await ctx.db.get(requestId))!.requesterId);
    await t.run((ctx) => ctx.db.patch(ownerProfile, { phoneVerified: true }));
    vi.setSystemTime(NOW + 1000);
    const { requestId: second } = await owner.mutation(api.requests.create, requestArgs(where, { bloodGroup: 'O-' }));
    // Someone else's request never shows.
    await postRequest(t, where);

    const active = await owner.query(api.requests.listMine, { status: 'active', paginationOpts: page });
    expect(active.page.map((r) => r.requestId)).toEqual([second, requestId]);
    expect(active.page[0]).toMatchObject({ bloodGroup: 'O-', status: 'live', unitsConfirmed: 0 });
    expect(active.page[1]!.place.en).not.toBe('');
    expect(JSON.stringify(active)).not.toMatch(/\+880/);

    await owner.mutation(api.requests.close, { requestId, reason: 'fulfilled' });
    const closed = await owner.query(api.requests.listMine, { status: 'closed', paginationOpts: page });
    expect(closed.page.map((r) => [r.requestId, r.closeReason])).toEqual([[requestId, 'fulfilled']]);
    const stillActive = await owner.query(api.requests.listMine, { status: 'active', paginationOpts: page });
    expect(stillActive.page.map((r) => r.requestId)).toEqual([second]);
  });

  it('a member who never asked for blood sees an empty list', async () => {
    const { t } = await setupMatching();
    const { as, userId } = await signIn(t, 'owner-test-nobody@example.com');
    await insertProfile(t, userId);
    const list = await as.query(api.requests.listMine, { status: 'closed', paginationOpts: page });
    expect(list.page).toEqual([]);
    expect(list.isDone).toBe(true);
  });
});
