/**
 * Global gates G1–G7 — specs §1.5, in this order. Pure, so every path is unit-tested; app/_layout.tsx feeds it the
 * live state and performs the redirect.
 *
 * A gate whose target screen is not built yet stays off (its route is not in AVAILABLE_ROUTES), so a redirect can
 * never land on a missing page (specs §1.9). Each phase adds its screens here.
 */
import { compareVersions } from './version';

export type ProfileStatus = 'active' | 'frozen' | 'suspended' | 'banned' | 'deletion_pending' | 'underage_blocked';
export type Role = 'member' | 'volunteer' | 'admin' | 'superadmin';

/** Redirect targets that exist in this build. */
export const AVAILABLE_ROUTES = new Set<string>(['/sign-in', '/home']);

export type GateInput = {
  native: boolean;
  appVersion: string;
  /** `public.appConfig`; undefined while loading or offline. */
  config: { minimumAppVersion: string; consentVersion: string } | undefined;
  /** Consent version stored on this device; null = none; undefined = still reading storage. */
  localConsentVersion: string | null | undefined;
  auth: 'loading' | 'signedOut' | 'signedIn';
  /** From `profiles.me` when signed in; undefined while loading. */
  me:
    | { needsOnboarding: boolean; serverConsentCurrent: boolean; status: ProfileStatus | null; role: Role | null }
    | undefined;
  path: string;
  available?: ReadonlySet<string>;
};

export type GateResult =
  | { kind: 'ok' }
  | { kind: 'wait' }
  | { kind: 'redirect'; to: string }
  | { kind: 'forbidden' };

const PUBLIC = [/^\/$/, /^\/r\//, /^\/learn(\/|$)/, /^\/about$/, /^\/privacy$/, /^\/terms$/, /^\/download$/];
const ONBOARDING = ['/welcome', '/sign-in', '/onboarding', '/verify-phone', '/update-required', '/account-status'];
const RANK: Record<Role, number> = { member: 0, volunteer: 1, admin: 2, superadmin: 3 };

export type RouteKind = 'public' | 'onboarding' | 'app';

export function routeKind(path: string): RouteKind {
  if (PUBLIC.some((re) => re.test(path))) return 'public';
  if (ONBOARDING.includes(path)) return 'onboarding';
  return 'app';
}

/** Role a route needs (G7). `/volunteer/apply` is open to every member. */
export function requiredRole(path: string): Role {
  if (/^\/admin(\/|$)/.test(path)) return 'admin';
  if (/^\/volunteer(\/|$)/.test(path) && path !== '/volunteer/apply') return 'volunteer';
  return 'member';
}

const withNext = (target: string, path: string) => `${target}?next=${encodeURIComponent(path)}`;

export function resolveGate(input: GateInput): GateResult {
  const available = input.available ?? AVAILABLE_ROUTES;
  const can = (route: string) => available.has(route);
  const { path } = input;
  const kind = routeKind(path);

  // G1 Version (native only). Offline (no config) never blocks the app.
  if (
    input.native &&
    input.config &&
    path !== '/update-required' &&
    can('/update-required') &&
    compareVersions(input.appVersion, input.config.minimumAppVersion) < 0
  ) {
    return { kind: 'redirect', to: '/update-required' };
  }

  // G2 Fonts/i18n is the splash in app/_layout.tsx.

  if (kind === 'public') return { kind: 'ok' };

  // G3 Consent — action routes only (sign-in and welcome themselves are exempt).
  const actionRoute = kind === 'app' || path === '/onboarding' || path === '/verify-phone';
  if (actionRoute && can('/welcome')) {
    if (input.localConsentVersion === undefined) return { kind: 'wait' };
    const required = input.config?.consentVersion;
    const local = required === undefined ? input.localConsentVersion !== null : input.localConsentVersion === required;
    if (!local) {
      if (input.auth === 'loading') return { kind: 'wait' };
      if (input.auth === 'signedIn' && input.me === undefined) return { kind: 'wait' };
      if (!(input.auth === 'signedIn' && input.me?.serverConsentCurrent)) return { kind: 'redirect', to: withNext('/welcome', path) };
    }
  }

  // G4 Session.
  if (kind === 'app' || path === '/onboarding' || path === '/verify-phone' || path === '/account-status') {
    if (input.auth === 'loading') return { kind: 'wait' };
    if (input.auth === 'signedOut') return can('/sign-in') ? { kind: 'redirect', to: withNext('/sign-in', path) } : { kind: 'ok' };
  }
  if (input.auth !== 'signedIn') return { kind: 'ok' };
  if (kind !== 'app') return { kind: 'ok' };
  if (input.me === undefined) return { kind: 'wait' };

  // G5 Onboarding.
  if (input.me.needsOnboarding && can('/onboarding')) return { kind: 'redirect', to: withNext('/onboarding', path) };

  // G6 Account status. Frozen users can still view their own request (read-only).
  const status = input.me.status;
  if (status && status !== 'active' && can('/account-status')) {
    const frozenViewingRequest = status === 'frozen' && /^\/request\/[^/]+$/.test(path);
    if (!frozenViewingRequest) return { kind: 'redirect', to: '/account-status' };
  }

  // G7 Role.
  const need = requiredRole(path);
  if (RANK[input.me.role ?? 'member'] < RANK[need]) return { kind: 'forbidden' };

  return { kind: 'ok' };
}

/** The `?next=` target after sign-in: only an in-app path (no `//host`, no scheme), never back to sign-in itself. */
export function safeNext(next: string | string[] | undefined, fallback = '/home'): string {
  const value = Array.isArray(next) ? next[0] : next;
  const hasControlChar = value ? [...value].some((ch) => ch.charCodeAt(0) < 0x20) : false;
  if (!value || !value.startsWith('/') || value.startsWith('//') || value.includes('\\') || hasControlChar) {
    return fallback;
  }
  if (routeKind(value.split('?')[0] ?? value) === 'onboarding') return fallback;
  return value;
}
