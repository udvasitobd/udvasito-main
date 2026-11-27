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
export async function networkKey(headers: Headers, namespace: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(`udvasito:${namespace}:${clientAddress(headers)}`));
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, '0')).join('');
}
