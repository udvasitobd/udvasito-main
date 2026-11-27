/**
 * The idempotency key a form sends with `requests.create` (specs §9: the same key twice → one record). Not a secret:
 * it only has to be unique. Web Crypto where the platform has it, otherwise time + Math.random (still ~80 bits).
 */
export function newClientId(): string {
  const cryptoApi = (globalThis as { crypto?: { randomUUID?: () => string } }).crypto;
  if (typeof cryptoApi?.randomUUID === 'function') return cryptoApi.randomUUID();
  const part = () => Math.random().toString(36).slice(2, 10).padEnd(8, '0');
  return `${Date.now().toString(36)}-${part()}-${part()}`;
}
