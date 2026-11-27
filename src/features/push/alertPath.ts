/**
 * The in-app path a tapped alert opens (push `data.url`, specs §6.8: `/alerts/{id}`, `/request/{id}` …), or null for
 * anything that is not one of the app's own paths — a payload never sends the app to another site.
 */
const APP_PATH = /^\/[A-Za-z0-9_-]+(\/[A-Za-z0-9_-]+)*$/;

export function alertPath(data: unknown): string | null {
  if (!data || typeof data !== 'object') return null;
  const url = (data as { url?: unknown }).url;
  return typeof url === 'string' && APP_PATH.test(url) ? url : null;
}
