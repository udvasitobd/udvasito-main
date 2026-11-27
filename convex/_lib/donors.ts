/**
 * Keeps `donorProfiles.live` true to its rule (specs §5.4, `convex/rules/donor.ts`). Every change that can affect it
 * calls `refreshDonorLive`: donor setup and phone verification now; profile edits, hiding and admin revocations when
 * they are built. `donor_profile_live` fires once, the first time a donor becomes live (`firstLiveAt`).
 */
import type { Doc, Id } from '../_generated/dataModel';
import type { MutationCtx, QueryCtx } from '../_generated/server';
import { notLiveReasons, type LiveRules, type NotLiveReason } from '../rules/donor';
import { logEvent } from './events';
import { getSettings } from './settings';

export type DonorLive = { live: boolean; notLiveReasons: NotLiveReason[] };

export async function donorProfileOf(ctx: QueryCtx, profileId: Id<'profiles'>): Promise<Doc<'donorProfiles'> | null> {
  return ctx.db
    .query('donorProfiles')
    .withIndex('by_profile', (q) => q.eq('profileId', profileId))
    .unique();
}

/** The live rule applied to these rows now (no database read, so matching can call it per candidate). */
export function liveReasonsNow(
  profile: Doc<'profiles'>,
  donor: Doc<'donorProfiles'>,
  now: number,
  settings: LiveRules,
): NotLiveReason[] {
  return notLiveReasons(
    {
      phoneVerified: profile.phoneVerified,
      profileStatus: profile.status,
      dateOfBirth: profile.dateOfBirth,
      bloodGroup: donor.bloodGroup,
      hidden: donor.hidden,
      healthConsentVersion: donor.healthConsentVersion,
    },
    now,
    settings,
  );
}

/**
 * Whether this donor may be alerted or confirmed now. The stored flag can lag behind the rule (a new consent version
 * or a birthday changes nothing in the row), so both must hold.
 */
export function isLiveNow(
  profile: Doc<'profiles'>,
  donor: Doc<'donorProfiles'>,
  now: number,
  settings: LiveRules,
): boolean {
  return donor.live && liveReasonsNow(profile, donor, now, settings).length === 0;
}

export async function donorLive(
  ctx: QueryCtx,
  profile: Doc<'profiles'>,
  donor: Doc<'donorProfiles'>,
  now = Date.now(),
): Promise<DonorLive> {
  const reasons = liveReasonsNow(profile, donor, now, await getSettings(ctx));
  return { live: reasons.length === 0, notLiveReasons: reasons };
}

/** Recomputes and stores `live` for this person's donor profile; null when they are not a donor. */
export async function refreshDonorLive(ctx: MutationCtx, profileId: Id<'profiles'>): Promise<DonorLive | null> {
  const profile = await ctx.db.get(profileId);
  const donor = profile ? await donorProfileOf(ctx, profileId) : null;
  if (!profile || !donor) return null;
  const now = Date.now();
  const result = await donorLive(ctx, profile, donor, now);
  const firstLive = result.live && donor.firstLiveAt === undefined;
  if (result.live !== donor.live || firstLive) {
    await ctx.db.patch(donor._id, {
      live: result.live,
      ...(firstLive ? { firstLiveAt: now } : {}),
    });
  }
  if (firstLive) {
    await logEvent(ctx, {
      name: 'donor_profile_live',
      isDemo: donor.isDemo,
      actorRole: profile.role,
      props: {
        bloodGroup: donor.bloodGroup,
        plateletOptIn: donor.plateletOptIn,
      },
    });
  }
  return result;
}
