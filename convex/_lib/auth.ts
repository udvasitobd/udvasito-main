/**
 * Auth wrappers (specs §6.0). Every public Convex function is built with one of these. Each wrapper loads the
 * caller and enforces, in order: signed in → profile exists → status allowed → consent current → role.
 *
 *   publicQuery                       anyone (no caller)
 *   signedInQuery / signedInMutation  Better Auth session; the profile may not exist yet (onboarding)
 *   memberQuery / memberMutation      finished onboarding, active, consent current
 *   donorQuery / donorMutation        member with a donor profile
 *   volunteerQuery / volunteerMutation  role volunteer or higher
 *   adminQuery / adminMutation        role admin or higher
 *   superadminMutation                role superadmin
 *
 * Practice-area isolation: `ctx.caller.isDemo` scopes every read and write (`assertSameArea`).
 */
import type { ObjectType, PropertyValidators } from 'convex/values';

import type { Doc } from '../_generated/dataModel';
import { mutation, query, type MutationCtx, type QueryCtx } from '../_generated/server';
import { authComponent } from '../auth';
import { appError } from './errors';
import { getSetting } from './settings';

export type Role = Doc<'profiles'>['role'];
export type ProfileStatus = Doc<'profiles'>['status'];

const ROLE_RANK: Record<Role, number> = { member: 0, volunteer: 1, admin: 2, superadmin: 3 };

export function hasRole(role: Role, minimum: Role): boolean {
  return ROLE_RANK[role] >= ROLE_RANK[minimum];
}

export type Access = {
  /** Minimum role. */
  role: Role;
  /** Statuses that may call. Default: `active` (queries also allow `frozen`, read-only). */
  statuses?: readonly ProfileStatus[];
  /** Skip the "consent current" check (only for consent screens and `profiles.me`). */
  allowStaleConsent?: boolean;
};

export type Caller = {
  authUserId: string;
  profile: Doc<'profiles'>;
  role: Role;
  isDemo: boolean;
};

export type SignedIn = { authUserId: string; profile: Doc<'profiles'> | null };

/** Better Auth user id of a valid session, or null. */
export async function getAuthUserId(ctx: QueryCtx): Promise<string | null> {
  const user = await authComponent.safeGetAuthUser(ctx);
  return user ? String(user._id) : null;
}

export async function loadSignedIn(ctx: QueryCtx): Promise<SignedIn> {
  const authUserId = await getAuthUserId(ctx);
  if (!authUserId) throw appError('ERR_UNAUTHENTICATED');
  const profile = await ctx.db
    .query('profiles')
    .withIndex('by_authUserId', (q) => q.eq('authUserId', authUserId))
    .unique();
  return { authUserId, profile };
}

/** Status → error, or null when allowed. */
export function statusError(status: ProfileStatus, allowed: readonly ProfileStatus[]) {
  if (allowed.includes(status)) return null;
  switch (status) {
    case 'underage_blocked':
      return 'ERR_UNDERAGE' as const;
    case 'frozen':
      return 'ERR_FROZEN' as const;
    default:
      return 'ERR_FORBIDDEN' as const;
  }
}

const QUERY_STATUSES: readonly ProfileStatus[] = ['active', 'frozen'];
const MUTATION_STATUSES: readonly ProfileStatus[] = ['active'];

export async function loadCaller(ctx: QueryCtx, access: Access, kind: 'query' | 'mutation'): Promise<Caller> {
  const { authUserId, profile } = await loadSignedIn(ctx);
  // Signed in but onboarding not finished → the app sends the person to onboarding/consent (gate G4).
  if (!profile) throw appError('ERR_CONSENT_REQUIRED');
  const statusCode = statusError(profile.status, access.statuses ?? (kind === 'query' ? QUERY_STATUSES : MUTATION_STATUSES));
  if (statusCode) throw appError(statusCode);
  if (!access.allowStaleConsent) {
    const current = await getSetting(ctx, 'consentVersion');
    if (profile.consentVersion !== current) throw appError('ERR_CONSENT_REQUIRED');
  }
  if (!hasRole(profile.role, access.role)) throw appError('ERR_FORBIDDEN');
  return { authUserId, profile, role: profile.role, isDemo: profile.isDemo };
}

/** Practice and real data never meet (CLAUDE.md rule 6). */
export function assertSameArea(caller: { isDemo: boolean }, row: { isDemo: boolean } | null | undefined): void {
  if (row && row.isDemo !== caller.isDemo) throw appError('ERR_DEMO_ISOLATION');
}

// ── Wrapper factories ───────────────────────────────────────────────────────

type Handler<Ctx, A extends PropertyValidators, R> = (ctx: Ctx, args: ObjectType<A>) => R | Promise<R>;
type Def<Ctx, A extends PropertyValidators, R> = { args: A; handler: Handler<Ctx, A, R> };

export type CallerQueryCtx = QueryCtx & { caller: Caller };
export type CallerMutationCtx = MutationCtx & { caller: Caller };
export type SignedInQueryCtx = QueryCtx & { signedIn: SignedIn };
export type SignedInMutationCtx = MutationCtx & { signedIn: SignedIn };
export type DonorQueryCtx = CallerQueryCtx & { donor: Doc<'donorProfiles'> };
export type DonorMutationCtx = CallerMutationCtx & { donor: Doc<'donorProfiles'> };

export function publicQuery<A extends PropertyValidators, R>(def: Def<QueryCtx, A, R>) {
  return query({ args: def.args, handler: (ctx, args: ObjectType<A>) => def.handler(ctx, args) });
}

export function signedInQuery<A extends PropertyValidators, R>(def: Def<SignedInQueryCtx, A, R>) {
  return query({
    args: def.args,
    handler: async (ctx, args: ObjectType<A>) => def.handler({ ...ctx, signedIn: await loadSignedIn(ctx) }, args),
  });
}

export function signedInMutation<A extends PropertyValidators, R>(def: Def<SignedInMutationCtx, A, R>) {
  return mutation({
    args: def.args,
    handler: async (ctx, args: ObjectType<A>) => def.handler({ ...ctx, signedIn: await loadSignedIn(ctx) }, args),
  });
}

function callerQuery(access: Access) {
  return <A extends PropertyValidators, R>(def: Def<CallerQueryCtx, A, R>) =>
    query({
      args: def.args,
      handler: async (ctx, args: ObjectType<A>) =>
        def.handler({ ...ctx, caller: await loadCaller(ctx, access, 'query') }, args),
    });
}

function callerMutation(access: Access) {
  return <A extends PropertyValidators, R>(def: Def<CallerMutationCtx, A, R>) =>
    mutation({
      args: def.args,
      handler: async (ctx, args: ObjectType<A>) =>
        def.handler({ ...ctx, caller: await loadCaller(ctx, access, 'mutation') }, args),
    });
}

async function loadDonor(ctx: QueryCtx, caller: Caller): Promise<Doc<'donorProfiles'>> {
  const donor = await ctx.db
    .query('donorProfiles')
    .withIndex('by_profile', (q) => q.eq('profileId', caller.profile._id))
    .unique();
  if (!donor) throw appError('ERR_FORBIDDEN');
  assertSameArea(caller, donor);
  return donor;
}

export const memberQuery = callerQuery({ role: 'member' });
export const memberMutation = callerMutation({ role: 'member' });
export const volunteerQuery = callerQuery({ role: 'volunteer' });
export const volunteerMutation = callerMutation({ role: 'volunteer' });
export const adminQuery = callerQuery({ role: 'admin' });
export const adminMutation = callerMutation({ role: 'admin' });
export const superadminMutation = callerMutation({ role: 'superadmin' });

/** Member-level function with a custom status / consent policy (e.g. `profiles.cancelDeletion`, `consents.accept`). */
export const memberQueryWith = (access: Omit<Access, 'role'>) => callerQuery({ role: 'member', ...access });
export const memberMutationWith = (access: Omit<Access, 'role'>) => callerMutation({ role: 'member', ...access });

export function donorQuery<A extends PropertyValidators, R>(def: Def<DonorQueryCtx, A, R>) {
  return query({
    args: def.args,
    handler: async (ctx, args: ObjectType<A>) => {
      const caller = await loadCaller(ctx, { role: 'member' }, 'query');
      return def.handler({ ...ctx, caller, donor: await loadDonor(ctx, caller) }, args);
    },
  });
}

export function donorMutation<A extends PropertyValidators, R>(def: Def<DonorMutationCtx, A, R>) {
  return mutation({
    args: def.args,
    handler: async (ctx, args: ObjectType<A>) => {
      const caller = await loadCaller(ctx, { role: 'member' }, 'mutation');
      return def.handler({ ...ctx, caller, donor: await loadDonor(ctx, caller) }, args);
    },
  });
}
