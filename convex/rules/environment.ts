/**
 * Which deployment this is, read from the Convex env var SITE_URL (the web app it serves) — pure, no Convex imports.
 * Production serves https://udvasito.com; staging serves https://staging.udvasito.com or a local dev server. Nothing
 * else counts as staging — not even *.vercel.app, because the production Vercel project has such an address too.
 * "unknown" fails closed: staging-only tools refuse to run, seed-settings stops and auth keeps production hardening.
 *
 * Needed because staging is the *prod deployment* of the `udvasito-staging` project, so the CLI's `--prod` flag
 * cannot tell staging from production.
 */
import type { DeploymentEnvironment } from './settings';

export type { DeploymentEnvironment };

const PRODUCTION_HOSTS = new Set(['udvasito.com', 'www.udvasito.com']);
const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '[::1]']);

export function environmentFromSiteUrl(siteUrl: string | undefined): DeploymentEnvironment | 'unknown' {
  if (!siteUrl) return 'unknown';
  let url: URL;
  try {
    url = new URL(siteUrl);
  } catch {
    return 'unknown';
  }
  const host = url.hostname.toLowerCase();
  if (PRODUCTION_HOSTS.has(host)) return url.protocol === 'https:' ? 'production' : 'unknown';
  if (LOCAL_HOSTS.has(host) || host.endsWith('.localhost')) return 'staging';
  if (url.protocol !== 'https:') return 'unknown';
  if (host === 'staging.udvasito.com') return 'staging';
  return 'unknown';
}
