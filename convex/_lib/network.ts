import { components } from '../_generated/api';
import type { QueryCtx } from '../_generated/server';

/**
 * The caller's network address for rate limits, as the Convex edge (Cloudflare) reports it. Checked on the dev
 * deployment on 2026-11-27: `cf-connecting-ip` is set by Cloudflare (a client that sends it is refused with error 1000)
 * and `x-forwarded-for` is replaced by the edge, not appended to. A client-written header such as `x-real-ip` is
 * never used, and of `x-forwarded-for` only the last entry (the one a proxy adds) counts — a first entry written by
 * the caller would give a fresh rate-limit bucket on every request.
 */
export function clientAddress(headers: Headers): string {
  const cf = headers.get('cf-connecting-ip')?.trim();
  if (cf) return cf;
  const forwarded = (headers.get('x-forwarded-for') ?? '')
    .split(',')
    .map((e) => e.trim())
    .filter(Boolean);
  return forwarded.at(-1) ?? 'unknown';
}

/** SHA-256 of a namespaced address: a stable rate-limit key that never stores the address (personal data). */
export async function addressKey(namespace: string, address: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(`udvasito:${namespace}:${address}`));
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, '0')).join('');
}

export async function networkKey(headers: Headers, namespace: string): Promise<string> {
  return addressKey(namespace, clientAddress(headers));
}

/**
 * The network the caller signed in from, as Better Auth stored it on their session (`advanced.ipAddress` in
 * `auth.ts` reads the same edge header as `clientAddress`). Functions cannot see request headers, so this is how a
 * mutation tells networks apart. `null` when the session has no address.
 */
export async function sessionAddress(ctx: QueryCtx): Promise<string | null> {
  const identity = await ctx.auth.getUserIdentity();
  const sessionId = identity?.sessionId;
  if (typeof sessionId !== 'string' || sessionId === '') return null;
  const session = (await ctx.runQuery(components.betterAuth.adapter.findOne, {
    model: 'session',
    where: [{ field: '_id', value: sessionId }],
  })) as { ipAddress?: string | null } | null;
  return session?.ipAddress || null;
}
