/** Random bytes from the Web Crypto API (available in Convex queries and mutations). */
export function randomBytes(length: number): Uint8Array {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  return bytes;
}
