/**
 * Matching v1 — specs §6.6, build prompt P1 item 9. `startRequest` runs right after `requests.create` and sends
 * wave 1: the nearest eligible donors of the exact group in the request's district (`rules/ranking.ts`), each with a
 * `responses` row (`notified`) and an NTF-01 alert. All jobs re-check state first, so a retry does nothing twice.
 *
 * Later: waves 2–3, compatible groups and escalation (P2); on-duty volunteers, NTF-03 (P3); the 30-second helpline
 * `volunteerHotline` (P1 slice 14).
 */
import { v } from 'convex/values';

import type { Doc } from './_generated/dataModel';
import { internalMutation, type MutationCtx } from './_generated/server';
import { donorAlertText, type Language } from './_lib/alertText';
import { logEvent } from './_lib/events';
import { sendAlert } from './_lib/push';
import { getSettings } from './_lib/settings';
import { groupsFor } from './rules/compatibility';
import { rankCandidates, type Candidate } from './rules/ranking';
import type { Settings } from './rules/settings';
import { nextWaveSize } from './rules/waves';

type Point = { lat: number; lng: number };

/** Every live donor of the alert groups in the request's district, joined with their profile (by_match index). */
async function loadCandidates(ctx: MutationCtx, request: Doc<'requests'>, settings: Settings, finalWave: boolean) {
  const { exact, compatible } = groupsFor(request.bloodGroup, request.component, finalWave, settings);
  const candidates: Candidate[] = [];
  const rows = new Map<string, { donor: Doc<'donorProfiles'>; profile: Doc<'profiles'> }>();
  const places = new Map<string, Point>();
  for (const group of [...exact, ...compatible]) {
    const donors = await ctx.db
      .query('donorProfiles')
      .withIndex('by_match', (q) =>
        q.eq('isDemo', request.isDemo).eq('live', true).eq('bloodGroup', group).eq('districtId', request.districtId),
      )
      .collect();
    for (const donor of donors) {
      const profile = await ctx.db.get(donor.profileId);
      if (!profile) continue;
      rows.set(donor._id, { donor, profile });
      if (!places.has(donor.upazilaId)) {
        const thana = await ctx.db.get(donor.upazilaId);
        if (thana) places.set(donor.upazilaId, { lat: thana.lat, lng: thana.lng });
      }
      candidates.push({
        donorProfileId: donor._id,
        profileId: donor.profileId,
        bloodGroup: donor.bloodGroup,
        gender: donor.gender,
        neverDonated: donor.neverDonated,
        ...(donor.lastDonationDate !== undefined ? { lastDonationDate: donor.lastDonationDate } : {}),
        ...(donor.lastDonationType !== undefined ? { lastDonationType: donor.lastDonationType } : {}),
        districtId: donor.districtId,
        upazilaId: donor.upazilaId,
        travelRange: donor.travelRange,
        availability: donor.availability,
        plateletOptIn: donor.plateletOptIn,
        // `live` is kept true to its rule on every change; status and phone are re-checked here as a second guard.
        live: donor.live && profile.status === 'active' && profile.phoneVerified,
        isDemo: donor.isDemo,
        dateOfBirth: profile.dateOfBirth,
        lastActiveAt: profile.lastActiveAt,
      });
    }
  }
  return { candidates, rows, places };
}

/** Hospital name in each language, else the typed place, else the thana name. */
async function placeNames(ctx: MutationCtx, request: Doc<'requests'>): Promise<Record<Language, string>> {
  const hospital = request.hospitalId ? await ctx.db.get(request.hospitalId) : null;
  if (hospital) return { en: hospital.nameEn, bn: hospital.nameBn };
  if (request.placeText) return { en: request.placeText, bn: request.placeText };
  const thana = await ctx.db.get(request.upazilaId);
  return { en: thana?.nameEn ?? '', bn: thana?.nameBn ?? '' };
}

/**
 * Sends wave `wave` unless it was already sent (idempotent). Returns how many donors were eligible before the wave
 * size cut, and how many were alerted.
 */
async function runWave(
  ctx: MutationCtx,
  request: Doc<'requests'>,
  wave: number,
  settings: Settings,
  now: number,
): Promise<{ eligible: number; sent: number }> {
  const bloodGroup = request.bloodGroup;
  if (request.status !== 'live' || request.wave >= wave || bloodGroup === 'not_sure') return { eligible: 0, sent: 0 };
  const earlier = await ctx.db
    .query('responses')
    .withIndex('by_request_donor', (q) => q.eq('requestId', request._id))
    .collect();
  const openedUnanswered = earlier.filter((r) => r.state === 'opened').length;
  const { candidates, rows, places } = await loadCandidates(ctx, request, settings, false);
  const ranked = rankCandidates(
    candidates,
    {
      requesterId: request.requesterId,
      bloodGroup: request.bloodGroup,
      component: request.component,
      districtId: request.districtId,
      upazilaId: request.upazilaId,
      point: { lat: request.approxLat, lng: request.approxLng },
      isDemo: request.isDemo,
    },
    places,
    settings,
    now,
    { finalWave: false, alreadyNotified: new Set(earlier.map((r) => r.donorProfileId)) },
  );
  const chosen = ranked.slice(0, nextWaveSize(wave, openedUnanswered, settings));
  const place = chosen.length > 0 ? await placeNames(ctx, request) : { en: '', bn: '' };

  for (const donor of chosen) {
    const row = rows.get(donor.donorProfileId);
    if (!row) continue;
    const { profile } = row;
    await ctx.db.insert('responses', {
      requestId: request._id,
      donorProfileId: row.donor._id,
      donorId: profile._id,
      wave,
      state: 'notified',
      notifiedAt: now,
      callMode: row.donor.callMode,
      isDemo: request.isDemo,
    });
    const language = profile.language;
    const text = donorAlertText(
      {
        urgency: request.urgency,
        bloodGroup,
        component: request.component,
        place: place[language],
        units: request.unitsNeeded,
        neededBy: request.neededBy,
        km: donor.km,
      },
      language,
      now,
    );
    await sendAlert(ctx, {
      recipientId: profile._id,
      template: 'NTF-01',
      requestId: request._id,
      ...text,
      url: `/alerts/${request._id}`,
      androidChannel: 'blood-requests',
      isDemo: request.isDemo,
    });
  }

  await ctx.db.patch(request._id, { wave });
  await logEvent(ctx, {
    name: 'wave_sent',
    isDemo: request.isDemo,
    requestId: request._id,
    props: { n: wave, size: chosen.length },
  });
  return { eligible: ranked.length, sent: chosen.length };
}

/** After publish: wave 1 now, and `zeroEligibleAtPublish` when no donor at all matches (SCR-M03 "no donors yet"). */
export const startRequest = internalMutation({
  args: { requestId: v.id('requests') },
  handler: async (ctx, { requestId }) => {
    const request = await ctx.db.get(requestId);
    if (!request || request.status !== 'live' || request.wave > 0) return null;
    const settings = await getSettings(ctx);
    // "Not sure" requests alert no donor (PRD §5.2); the helpline path handles them.
    const { eligible } = await runWave(ctx, request, 1, settings, Date.now());
    if (eligible === 0 && !request.zeroEligibleAtPublish)
      await ctx.db.patch(requestId, { zeroEligibleAtPublish: true });
    return null;
  },
});
