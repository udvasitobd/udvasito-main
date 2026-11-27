/**
 * The donor's inbox and "opened" (specs §6.3 `responses.inbox` / `responses.markOpened`, §6.4
 * `notifications.markOpened`; SCR-D03). Fake timers keep the push component from calling Expo.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { api, internal } from './_generated/api';
import type { Id } from './_generated/dataModel';
import { readAppError } from './_lib/errors';
import { donor, insertProfile, postRequest, setupMatching, signIn, type MatchPlaces, type T } from './test.setup';

const HOUR = 60 * 60 * 1000;

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(Date.UTC(2026, 10, 27, 4, 0)); // 10:00 in Dhaka
});
afterEach(() => {
  vi.useRealTimers();
});

async function codeOf(promise: Promise<unknown>): Promise<string | null> {
  try {
    await promise;
    return null;
  } catch (error) {
    return readAppError(error)?.code ?? `non-app error: ${String(error)}`;
  }
}

let signIns = 0;
/** A signed-in donor in Kotwali (or `upazilaId`). */
async function signedInDonor(t: T, where: MatchPlaces, upazilaId?: Id<'places'>) {
  signIns += 1;
  const { as, userId } = await signIn(t, `donor${signIns}@example.com`);
  const ids = await donor(t, where, { authUserId: userId, ...(upazilaId ? { upazilaId } : {}) });
  return { as, ...ids };
}

/** Posts a request and sends wave 1. */
async function alerted(t: T, where: MatchPlaces, overrides: Record<string, unknown> = {}) {
  const { requestId } = await postRequest(t, where, overrides);
  await t.mutation(internal.matching.startRequest, { requestId });
  return requestId;
}

const responseOf = (t: T, requestId: Id<'requests'>, donorProfileId: Id<'donorProfiles'>) =>
  t.run((ctx) =>
    ctx.db
      .query('responses')
      .withIndex('by_request_donor', (q) => q.eq('requestId', requestId).eq('donorProfileId', donorProfileId))
      .unique(),
  );

const notificationsOf = (t: T, requestId: Id<'requests'>) =>
  t.run((ctx) =>
    ctx.db
      .query('notifications')
      .withIndex('by_request', (q) => q.eq('requestId', requestId))
      .collect(),
  );

describe('access', () => {
  it('every function needs a signed-in member; "opened" needs a donor profile', async () => {
    const { t, where } = await setupMatching();
    const requestId = await alerted(t, where);
    expect(await codeOf(t.query(api.responses.inbox, {}))).toBe('ERR_UNAUTHENTICATED');
    expect(await codeOf(t.mutation(api.responses.markOpened, { requestId }))).toBe('ERR_UNAUTHENTICATED');
    const { as, userId } = await signIn(t, 'member@example.com');
    await insertProfile(t, userId);
    expect(await as.query(api.responses.inbox, {})).toEqual({ needsAnswer: [], saidYes: [], earlier: [] });
    expect(await codeOf(as.mutation(api.responses.markOpened, { requestId }))).toBe('ERR_FORBIDDEN');
  });

  it('notifications.markOpened changes only the recipient’s own alert', async () => {
    const { t, where } = await setupMatching();
    const me = await signedInDonor(t, where);
    const requestId = await alerted(t, where);
    const [alert] = await notificationsOf(t, requestId);
    const notificationId = alert!._id;
    expect(await codeOf(t.mutation(api.notifications.markOpened, { notificationId }))).toBe('ERR_UNAUTHENTICATED');

    const { as: stranger, userId } = await signIn(t, 'stranger@example.com');
    await insertProfile(t, userId);
    await stranger.mutation(api.notifications.markOpened, { notificationId });
    expect((await t.run((ctx) => ctx.db.get(notificationId)))?.openedAt).toBeUndefined();

    const tapped = Date.now();
    await me.as.mutation(api.notifications.markOpened, { notificationId });
    const opened = (await t.run((ctx) => ctx.db.get(notificationId)))?.openedAt;
    expect(opened).toBeGreaterThanOrEqual(tapped);
    expect(opened).toBeLessThan(tapped + 1000);
    vi.setSystemTime(Date.now() + HOUR);
    await me.as.mutation(api.notifications.markOpened, { notificationId });
    expect((await t.run((ctx) => ctx.db.get(notificationId)))?.openedAt).toBe(opened); // the first tap counts
  });
});

describe('responses.inbox (SCR-D03)', () => {
  it('groups my requests — Needs your answer, You said yes, Earlier — newest first', async () => {
    const { t, where } = await setupMatching();
    const me = await signedInDonor(t, where, where.panchlaish);

    const older = await alerted(t, where);
    vi.setSystemTime(Date.now() + HOUR);
    const newer = await alerted(t, where, { placeText: 'Chevron, O.R. Nizam Road' });
    vi.setSystemTime(Date.now() + HOUR);
    const yes = await alerted(t, where);
    vi.setSystemTime(Date.now() + HOUR);
    const closed = await alerted(t, where);

    const mine = await responseOf(t, yes, me.donorProfileId);
    await t.run(async (ctx) => {
      await ctx.db.patch(mine!._id, { state: 'confirmed' });
      await ctx.db.patch(closed, { status: 'closed', closedAt: Date.now() });
    });

    const inbox = await me.as.query(api.responses.inbox, {});
    expect(inbox.needsAnswer.map((i) => i.requestId)).toEqual([newer, older]);
    expect(inbox.saidYes.map((i) => [i.requestId, i.state])).toEqual([[yes, 'confirmed']]);
    expect(inbox.earlier.map((i) => [i.requestId, i.closed])).toEqual([[closed, true]]);

    expect(inbox.needsAnswer[0]).toMatchObject({
      state: 'notified',
      bloodGroup: 'B+',
      component: 'whole_blood',
      urgency: 'now',
      place: { en: 'Chevron, O.R. Nizam Road', bn: 'Chevron, O.R. Nizam Road' },
      area: { en: 'Kotwali', bn: 'কোতোয়ালী' },
      km: 2.2,
      verified: false,
      closed: false,
    });
  });

  it('shows no phone number, requester name or patient name', async () => {
    const { t, where } = await setupMatching();
    const me = await signedInDonor(t, where);
    await alerted(t, where);
    const text = JSON.stringify(await me.as.query(api.responses.inbox, {}));
    expect(text).not.toMatch(/Karim|Amina|01[3-9]\d{8}|\+880|contactPhone|patientName/);
  });

  it('lists only my own requests, never another donor’s; declined ones drop out', async () => {
    const { t, where } = await setupMatching();
    const me = await signedInDonor(t, where);
    const other = await signedInDonor(t, where);
    const first = await alerted(t, where);
    const second = await alerted(t, where);
    const theirs = await responseOf(t, first, other.donorProfileId);
    const myFirst = await responseOf(t, first, me.donorProfileId);
    await t.run(async (ctx) => {
      await ctx.db.patch(theirs!._id, { state: 'confirmed' });
      await ctx.db.patch(myFirst!._id, { state: 'declined', declineReason: 'busy' });
    });
    const inbox = await me.as.query(api.responses.inbox, {});
    expect(inbox.needsAnswer.map((i) => i.requestId)).toEqual([second]);
    expect(inbox.saidYes).toEqual([]);
    expect(inbox.earlier).toEqual([]);
  });

  it('leaves out a request a moderator removed (it cannot be opened any more)', async () => {
    const { t, where } = await setupMatching();
    const me = await signedInDonor(t, where);
    const removed = await alerted(t, where);
    const kept = await alerted(t, where);
    await t.run((ctx) => ctx.db.patch(removed, { hiddenByModerator: true }));
    const inbox = await me.as.query(api.responses.inbox, {});
    expect(inbox.needsAnswer.map((i) => i.requestId)).toEqual([kept]);
    expect(inbox.earlier).toEqual([]);
    expect(await codeOf(me.as.query(api.responses.getForDonor, { requestId: removed }))).toBe('ERR_NOT_FOUND');
  });

  it('never mixes practice and real rows', async () => {
    const { t, where } = await setupMatching();
    const me = await signedInDonor(t, where);
    const requestId = await alerted(t, where);
    const mine = await responseOf(t, requestId, me.donorProfileId);
    await t.run((ctx) => ctx.db.patch(mine!._id, { isDemo: true })); // a row that should never exist
    expect((await me.as.query(api.responses.inbox, {})).needsAnswer).toEqual([]);
  });
});

describe('responses.markOpened', () => {
  it('notified → opened once, with one notification_opened event and my alert marked opened', async () => {
    const { t, where } = await setupMatching();
    const me = await signedInDonor(t, where);
    const other = await signedInDonor(t, where);
    const requestId = await alerted(t, where);
    const alerts = await notificationsOf(t, requestId);
    const myAlert = alerts.find((n) => n.recipientId !== other.profileId)!;

    await me.as.mutation(api.responses.markOpened, { requestId, notificationId: myAlert._id });
    const opened = (await responseOf(t, requestId, me.donorProfileId))?.openedAt;
    expect(opened).toBeDefined();
    vi.setSystemTime(Date.now() + HOUR);
    await me.as.mutation(api.responses.markOpened, { requestId });

    expect(await responseOf(t, requestId, me.donorProfileId)).toMatchObject({ state: 'opened', openedAt: opened });
    expect((await responseOf(t, requestId, other.donorProfileId))?.state).toBe('notified');
    const after = await notificationsOf(t, requestId);
    expect(after.find((n) => n._id === myAlert._id)?.openedAt).toBe(opened);
    expect(after.find((n) => n.recipientId === other.profileId)?.openedAt).toBeUndefined();

    const events = await t.run((ctx) =>
      ctx.db
        .query('events')
        .withIndex('by_request', (q) => q.eq('requestId', requestId))
        .collect(),
    );
    expect(events.filter((e) => e.name === 'notification_opened').map((e) => e.props)).toEqual([
      { wave: 1, fromPush: true },
    ]);
  });

  it('leaves an answered response as it is, and changes nothing for a request I was never alerted about', async () => {
    const { t, where } = await setupMatching();
    const me = await signedInDonor(t, where);
    const requestId = await alerted(t, where);
    const mine = await responseOf(t, requestId, me.donorProfileId);
    await t.run((ctx) => ctx.db.patch(mine!._id, { state: 'confirmed' }));
    await me.as.mutation(api.responses.markOpened, { requestId });
    expect((await responseOf(t, requestId, me.donorProfileId))?.state).toBe('confirmed');

    const otherGroup = await alerted(t, where, { bloodGroup: 'O-' });
    expect(await me.as.mutation(api.responses.markOpened, { requestId: otherGroup })).toBeNull();
    expect(await responseOf(t, otherGroup, me.donorProfileId)).toBeNull();
    expect((await notificationsOf(t, otherGroup)).every((n) => n.openedAt === undefined)).toBe(true);
  });
});
