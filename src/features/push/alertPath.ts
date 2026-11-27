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

/** The `notifications` row a tapped alert came from (push `data.notificationId`), or null. */
export function tappedNotificationId(data: unknown): string | null {
  if (!data || typeof data !== 'object') return null;
  const id = (data as { notificationId?: unknown }).notificationId;
  return typeof id === 'string' && /^[A-Za-z0-9]{8,64}$/.test(id) ? id : null;
}

/** Where a tap goes: an alert also carries its notification (`?n=`), so its screen can count the open as a push. */
export function tappedHref(data: unknown): string | null {
  const path = alertPath(data);
  if (!path) return null;
  const id = tappedNotificationId(data);
  return id && path.startsWith('/alerts/') ? `${path}?n=${id}` : path;
}
