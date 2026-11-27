/**
 * A donor's side of a request — specs §6.3, SCR-D03 / SCR-D04. P1 slice 10: the inbox ("Requests for you") and
 * marking an alert opened. Donors see the group, component, place, area, distance, time and the verified badge —
 * never a phone number, the requester's name or the patient's name (those arrive with `getForDonor` once confirmed).
 */
import { v } from 'convex/values';

import type { Doc, Id } from './_generated/dataModel';
import { roundKm } from './_lib/alertText';
import { donorMutation, memberQuery } from './_lib/auth';
import { donorProfileOf } from './_lib/donors';
import { logEvent } from './_lib/events';
import { requestPlaceNames, type Named } from './_lib/requestPlace';
import { distanceKm } from './rules/places';

/** SCR-D03 lists these states; declined, withdrew and not_responding drop out of the list. */
const LISTED = ['notified', 'opened', 'accepted', 'confirmed', 'standby'] as const;
type ListedState = (typeof LISTED)[number];

export type InboxItem = {
  requestId: Id<'requests'>;
  state: ListedState;
  notifiedAt: number;
  bloodGroup: Doc<'requests'>['bloodGroup'];
  component: Doc<'requests'>['component'];
  urgency: Doc<'requests'>['urgency'];
  place: Named;
  area: Named;
  /** From the donor's thana centre to the hospital; null when the donor profile is gone. */
  km: number | null;
  neededBy: number;
  verified: boolean;
  /** Closed, or removed by a moderator: shown greyed as "No longer needed". */
  closed: boolean;
};

const newestFirst = (a: InboxItem, b: InboxItem) => b.notifiedAt - a.notifiedAt;

/**
 * `responses.inbox` — Needs your answer (notified / opened), You said yes (accepted / confirmed / standby), Earlier
 * (any of those on a request that is no longer needed); newest first. A member who is not a donor gets empty lists.
 */
export const inbox = memberQuery({
  args: {},
  handler: async (ctx) => {
    const me = ctx.caller.profile;
    const rows: Doc<'responses'>[] = [];
    for (const state of LISTED) {
      rows.push(
        ...(await ctx.db
          .query('responses')
          .withIndex('by_donor_state', (q) => q.eq('donorId', me._id).eq('state', state))
          .collect()),
      );
    }
    const donor = await donorProfileOf(ctx, me._id);
    const home = donor ? await ctx.db.get(donor.upazilaId) : null;

    const needsAnswer: InboxItem[] = [];
    const saidYes: InboxItem[] = [];
    const earlier: InboxItem[] = [];
    for (const response of rows) {
      if (response.isDemo !== me.isDemo) continue;
      const request = await ctx.db.get(response.requestId);
      if (!request || request.isDemo !== me.isDemo) continue;
      const { place, area } = await requestPlaceNames(ctx, request);
      const item: InboxItem = {
        requestId: request._id,
        state: response.state as ListedState,
        notifiedAt: response.notifiedAt,
        bloodGroup: request.bloodGroup,
        component: request.component,
        urgency: request.urgency,
        place,
        area,
        km: home ? roundKm(distanceKm(home, { lat: request.approxLat, lng: request.approxLng })) : null,
        neededBy: request.neededBy,
        verified: request.verifiedBadge,
        closed: request.status === 'closed' || request.hiddenByModerator,
      };
      if (item.closed) earlier.push(item);
      else if (item.state === 'notified' || item.state === 'opened') needsAnswer.push(item);
      else saidYes.push(item);
    }
    return {
      needsAnswer: needsAnswer.sort(newestFirst),
      saidYes: saidYes.sort(newestFirst),
      earlier: earlier.sort(newestFirst),
    };
  },
});

/**
 * `responses.markOpened` — the donor opened the request (from a push or from the inbox): `notified` → `opened` once,
 * with a `notification_opened` event, and this request's alerts to the donor get `openedAt`.
 */
export const markOpened = donorMutation({
  args: { requestId: v.id('requests'), notificationId: v.optional(v.id('notifications')) },
  handler: async (ctx, { requestId, notificationId }) => {
    const response = await ctx.db
      .query('responses')
      .withIndex('by_request_donor', (q) => q.eq('requestId', requestId).eq('donorProfileId', ctx.donor._id))
      .first();
    if (!response) return null;
    const now = Date.now();
    if (response.state === 'notified') {
      await ctx.db.patch(response._id, { state: 'opened', openedAt: now });
      await logEvent(ctx, {
        name: 'notification_opened',
        isDemo: response.isDemo,
        requestId,
        props: { wave: response.wave, fromPush: notificationId !== undefined },
      });
    }
    const alerts = await ctx.db
      .query('notifications')
      .withIndex('by_request', (q) => q.eq('requestId', requestId))
      .collect();
    for (const alert of alerts) {
      if (alert.recipientId === ctx.caller.profile._id && alert.openedAt === undefined)
        await ctx.db.patch(alert._id, { openedAt: now });
    }
    return null;
  },
});
