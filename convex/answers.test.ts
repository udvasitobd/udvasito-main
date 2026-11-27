/**
 * A donor answers a request (specs §6.3 `responses.getForDonor` / `accept` / `decline`; SCR-D04) and the contact
 * exchange that follows (PRD §3.3, build prompt P1 items 11–12). Fake timers keep the push component from calling Expo.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { api, internal } from './_generated/api';
import type { Id } from './_generated/dataModel';
import { readAppError } from './_lib/errors';
import { donor, postRequest, setupMatching, signIn, type MatchPlaces, type T } from './test.setup';

const DAY = 24 * 60 * 60 * 1000;

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(Date.UTC(2026, 10, 27, 4, 0)); // 10:00 in Dhaka
});
afterEach(() => {
  vi.useRealTimers();
});

async function failure(promise: Promise<unknown>) {
  try {
    await promise;
    return null;
  } catch (error) {
    const data = readAppError(error);
    return data ? { code: data.code, params: data.params } : { code: `non-app error: ${String(error)}` };
  }
}
const codeOf = async (promise: Promise<unknown>) => (await failure(promise))?.code ?? null;

let people = 0;
async function signedInDonor(t: T, where: MatchPlaces, options: Parameters<typeof donor>[2] = {}) {
  people += 1;
  const { as, userId } = await signIn(t, `answer${people}@example.com`);
  const ids = await donor(t, where, { authUserId: userId, ...options });
  return { as, ...ids };
}

/** A request from Karim, posted and alerted (wave 1). */
async function alerted(t: T, where: MatchPlaces, overrides: Record<string, unknown> = {}) {
  const { requestId } = await postRequest(t, where, { note: 'Second floor, near the lift.', ...overrides });
  await t.mutation(internal.matching.startRequest, { requestId });
  const request = await t.run((ctx) => ctx.db.get(requestId));
  return { requestId, requesterId: request!.requesterId };
}

let taps = 0;
const tap = () => {
  taps += 1;
  return `accept-${String(taps).padStart(4, '0')}`;
};
const acceptArgs = (requestId: Id<'requests'>, callMode: 'mutual' | 'donor_calls' = 'mutual') => ({
  requestId,
  clientId: tap(),
  selfCheck: true as const,
  callMode,
});

const revealsOf = (t: T, requestId: Id<'requests'>) =>
  t.run((ctx) =>
    ctx.db
      .query('contactReveals')
      .withIndex('by_request', (q) => q.eq('requestId', requestId))
      .collect(),
  );
const eventsOf = (t: T, requestId: Id<'requests'>, name: string) =>
  t.run(async (ctx) =>
    (
      await ctx.db
        .query('events')
        .withIndex('by_request', (q) => q.eq('requestId', requestId))
        .collect()
    ).filter((e) => e.name === name),
  );

describe('access', () => {
  it('needs a signed-in donor who was alerted about this request', async () => {
    const { t, where } = await setupMatching();
    const { requestId } = await alerted(t, where);
    expect(await codeOf(t.query(api.responses.getForDonor, { requestId }))).toBe('ERR_UNAUTHENTICATED');
    expect(await codeOf(t.mutation(api.responses.accept, acceptArgs(requestId)))).toBe('ERR_UNAUTHENTICATED');
    expect(await codeOf(t.mutation(api.responses.decline, { requestId }))).toBe('ERR_UNAUTHENTICATED');

    const late = await signedInDonor(t, where); // became a donor after the wave
    expect(await codeOf(late.as.query(api.responses.getForDonor, { requestId }))).toBe('ERR_NOT_FOUND');
    expect(await codeOf(late.as.mutation(api.responses.accept, acceptArgs(requestId)))).toBe('ERR_NOT_FOUND');
    expect(await codeOf(late.as.mutation(api.responses.decline, { requestId }))).toBe('ERR_NOT_FOUND');
  });
});

describe('responses.getForDonor before an answer', () => {
  it('no phone number, no names; a number in the note is masked; the requester’s real track record', async () => {
    const { t, where } = await setupMatching();
    const me = await signedInDonor(t, where);
    const { requestId } = await alerted(t, where);
    // VAL-11 refuses numbers in a note; an old or imported row is masked anyway.
    await t.run((ctx) => ctx.db.patch(requestId, { note: 'Ward 5. Call 01711-223344 if lost.' }));
    const view = await me.as.query(api.responses.getForDonor, { requestId });
    expect(view.myResponse.state).toBe('notified');
    expect(view.requester).toBeNull();
    expect(view.patientName).toBeNull();
    expect(view.ward).toBeNull();
    expect(view.request.note).toBe('Ward 5. Call [phone] if lost.');
    expect(view.request.phoneVerified).toBe(false);
    expect(view.trackRecord).toMatchObject({ requests: 1, donations: 0 });
    expect(JSON.stringify(view)).not.toMatch(/Karim|Amina|01[3-9]\d{2}-?\d{6}|\+880/);
  });
});

describe('responses.accept', () => {
  it('5 donors accept a 1-bag request at once → exactly 2 confirmed (units + S-12), 3 on standby', async () => {
    const { t, where } = await setupMatching();
    await t.run(async (ctx) => {
      const row = await ctx.db
        .query('settings')
        .withIndex('by_key', (q) => q.eq('key', 'waveSizes'))
        .unique();
      await ctx.db.patch(row!._id, { value: [5, 5, 8] });
    });
    const donors = [];
    for (let i = 0; i < 5; i++) donors.push(await signedInDonor(t, where));
    const { requestId } = await alerted(t, where, { unitsNeeded: 1 });

    const results = await Promise.all(donors.map((d) => d.as.mutation(api.responses.accept, acceptArgs(requestId))));
    expect(results.filter((r) => r.state === 'confirmed')).toHaveLength(2);
    expect(results.filter((r) => r.state === 'standby')).toHaveLength(3);
    expect(await t.run((ctx) => ctx.db.get(requestId))).toMatchObject({ unitsConfirmed: 1, status: 'covered' });
    expect(await eventsOf(t, requestId, 'donor_accepted')).toHaveLength(5);
    expect(await eventsOf(t, requestId, 'donor_confirmed')).toHaveLength(2);
    expect(await eventsOf(t, requestId, 'donor_standby')).toHaveLength(3);
  });

  it('mutual: both numbers shared, each reveal with an audit entry; NTF-04 to the requester', async () => {
    const { t, where } = await setupMatching();
    const me = await signedInDonor(t, where);
    const other = await signedInDonor(t, where);
    const { requestId, requesterId } = await alerted(t, where);

    expect(await me.as.mutation(api.responses.accept, acceptArgs(requestId))).toEqual({
      state: 'confirmed',
      contactsPaused: false,
    });
    const reveals = await revealsOf(t, requestId);
    expect(reveals.map((r) => [r.viewerId, r.subjectId, r.subjectRole, r.reason]).sort()).toEqual(
      [
        [me.profileId, requesterId, 'requester', 'confirmed_slot'],
        [requesterId, me.profileId, 'donor', 'confirmed_slot'],
      ].sort(),
    );
    expect(reveals.every((r) => r.expiresAt > Date.now() + 7 * DAY)).toBe(true);
    const audits = await t.run((ctx) =>
      ctx.db
        .query('auditLog')
        .withIndex('by_action', (q) => q.eq('action', 'contact_revealed'))
        .collect(),
    );
    expect(audits).toHaveLength(2);
    expect(JSON.stringify(audits)).not.toMatch(/01[3-9]\d{8}|\+880/);
    expect((await eventsOf(t, requestId, 'contact_shared')).map((e) => e.props)).toEqual([{ mode: 'mutual' }]);

    const view = await me.as.query(api.responses.getForDonor, { requestId });
    expect(view.requester).toEqual({ firstName: 'Karim', phone: '+8801812345678' });
    expect(view.patientName).toBe('Amina Begum');

    // Another donor, still deciding, sees none of it.
    const theirs = await other.as.query(api.responses.getForDonor, { requestId });
    expect(theirs.requester).toBeNull();
    expect(theirs.patientName).toBeNull();

    const toRequester = await t.run((ctx) =>
      ctx.db
        .query('notifications')
        .withIndex('by_recipient', (q) => q.eq('recipientId', requesterId))
        .collect(),
    );
    expect(toRequester.map((n) => n.template)).toEqual(['NTF-04']);
  });

  it('"I\'ll call them": the donor gets the family’s number; the family never gets the donor’s', async () => {
    const { t, where } = await setupMatching();
    const me = await signedInDonor(t, where);
    const { requestId, requesterId } = await alerted(t, where);
    await me.as.mutation(api.responses.accept, acceptArgs(requestId, 'donor_calls'));
    const reveals = await revealsOf(t, requestId);
    expect(reveals.map((r) => [r.viewerId, r.subjectId])).toEqual([[me.profileId, requesterId]]);
    expect((await me.as.query(api.responses.getForDonor, { requestId })).requester?.phone).toBe('+8801812345678');
    expect((await eventsOf(t, requestId, 'contact_shared')).map((e) => e.props)).toEqual([{ mode: 'donor_calls' }]);
  });

  it('a standby donor sees no contact details', async () => {
    const { t, where } = await setupMatching();
    const donors = [await signedInDonor(t, where), await signedInDonor(t, where), await signedInDonor(t, where)];
    const { requestId } = await alerted(t, where, { unitsNeeded: 1 });
    for (const d of donors) await d.as.mutation(api.responses.accept, acceptArgs(requestId));
    const view = await donors[2]!.as.query(api.responses.getForDonor, { requestId });
    expect(view.myResponse.state).toBe('standby');
    expect(view.requester).toBeNull();
    expect(view.patientName).toBeNull();
  });

  it('a retry with the same clientId returns the first answer; a second answer is refused', async () => {
    const { t, where } = await setupMatching();
    const me = await signedInDonor(t, where);
    const { requestId } = await alerted(t, where);
    const args = acceptArgs(requestId);
    const first = await me.as.mutation(api.responses.accept, args);
    expect(await me.as.mutation(api.responses.accept, args)).toEqual(first);
    expect(await eventsOf(t, requestId, 'donor_accepted')).toHaveLength(1);
    expect(await codeOf(me.as.mutation(api.responses.accept, acceptArgs(requestId)))).toBe('ERR_ALREADY_RESPONDED');
    expect(await codeOf(me.as.mutation(api.responses.decline, { requestId }))).toBe('ERR_ALREADY_RESPONDED');
  });

  it('re-checks at the moment of the tap: closed request, not live, donated since', async () => {
    const { t, where } = await setupMatching();
    const me = await signedInDonor(t, where);
    const { requestId } = await alerted(t, where);

    await t.run((ctx) => ctx.db.patch(me.donorProfileId, { live: false }));
    expect(await failure(me.as.mutation(api.responses.accept, acceptArgs(requestId)))).toEqual({
      code: 'ERR_NOT_ELIGIBLE',
      params: { reason: 'notLive' },
    });

    await t.run((ctx) =>
      ctx.db.patch(me.donorProfileId, {
        live: true,
        neverDonated: false,
        lastDonationDate: '2026-11-01',
        lastDonationType: 'whole_blood',
      }),
    );
    const cooldown = await failure(me.as.mutation(api.responses.accept, acceptArgs(requestId)));
    expect(cooldown?.code).toBe('ERR_NOT_ELIGIBLE');
    expect(cooldown?.params).toMatchObject({ reason: 'cooldown' });
    expect(String(cooldown?.params?.date)).toMatch(/^2027-\d{2}-\d{2}$/);

    await t.run((ctx) => ctx.db.patch(requestId, { status: 'closed', closedAt: Date.now() }));
    expect(await codeOf(me.as.mutation(api.responses.accept, acceptArgs(requestId)))).toBe('ERR_REQUEST_CLOSED');
  });
});

describe('responses.decline', () => {
  it('records the reason; "donated recently" moves the donor’s next eligible date', async () => {
    const { t, where } = await setupMatching();
    const me = await signedInDonor(t, where);
    const { requestId } = await alerted(t, where);
    const before = await t.run((ctx) => ctx.db.get(me.donorProfileId));

    expect(
      await codeOf(me.as.mutation(api.responses.decline, { requestId, reason: 'donated', donatedDate: '2026-12-01' })),
    ).toBe('ERR_VALIDATION');
    await me.as.mutation(api.responses.decline, { requestId, reason: 'donated', donatedDate: '2026-11-20' });

    const after = await t.run((ctx) => ctx.db.get(me.donorProfileId));
    expect(after).toMatchObject({
      neverDonated: false,
      lastDonationDate: '2026-11-20',
      lastDonationType: 'whole_blood',
    });
    expect(after!.eligibleFrom).toBeGreaterThan(Math.max(before!.eligibleFrom, Date.now()));
    const view = await me.as.query(api.responses.getForDonor, { requestId });
    expect(view.myResponse.state).toBe('declined');
    expect((await eventsOf(t, requestId, 'donor_declined')).map((e) => e.props)).toEqual([{ reason: 'donated' }]);
  });

  it('works without a reason', async () => {
    const { t, where } = await setupMatching();
    const me = await signedInDonor(t, where);
    const { requestId } = await alerted(t, where);
    await me.as.mutation(api.responses.decline, { requestId });
    expect((await eventsOf(t, requestId, 'donor_declined')).map((e) => e.props)).toEqual([{ reason: null }]);
  });
});
