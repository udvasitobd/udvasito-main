/**
 * The update bar and "What's new" (CMP-UpdateBanner, specs §1.3.5, Q-028). Pure — unit-tested.
 *
 * `public/whats-new.json` is written at each release: newest release first, each id one higher than the one before,
 * every line in English and Bangla. Each version bundles the file (its own id = the highest one in it) and the website
 * serves the newest copy at `/whats-new.json`, so an older version can show what a newer one brings before updating.
 */
import { compareVersions } from './version';

export type Release = { id: number; date: string; en: string[]; bn: string[] };

const YMD = /^\d{4}-\d{2}-\d{2}$/;

const isLines = (value: unknown): value is string[] =>
  Array.isArray(value) && value.length > 0 && value.every((line) => typeof line === 'string' && line.trim() !== '');

function isRelease(value: unknown): value is Release {
  if (typeof value !== 'object' || value === null) return false;
  const r = value as Record<string, unknown>;
  return (
    typeof r.id === 'number' &&
    Number.isInteger(r.id) &&
    r.id > 0 &&
    typeof r.date === 'string' &&
    YMD.test(r.date) &&
    isLines(r.en) &&
    isLines(r.bn)
  );
}

/**
 * The file's releases, newest first, or null when it is not a valid file (e.g. the site's app page instead). Checked
 * by hand: zod is not in the web bundle (specs §7.1 budget).
 */
export function parseWhatsNew(raw: unknown): Release[] | null {
  if (typeof raw !== 'object' || raw === null) return null;
  const list = (raw as { releases?: unknown }).releases;
  if (!Array.isArray(list) || list.length === 0 || !list.every(isRelease)) return null;
  return list.map(({ id, date, en, bn }) => ({ id, date, en: [...en], bn: [...bn] })).sort((a, b) => b.id - a.id);
}

/** The version a list describes: its highest release id (0 for none). */
export function latestReleaseId(releases: readonly Release[] | null): number {
  return (releases ?? []).reduce((max, release) => Math.max(max, release.id), 0);
}

/** Releases newer than the running version, newest first — what "What's new" lists. */
export function newerReleases(releases: readonly Release[] | null, currentId: number): Release[] {
  return (releases ?? []).filter((release) => release.id > currentId).sort((a, b) => b.id - a.id);
}

/**
 * What the bar offers. `key` names the offer, so "Later" hides exactly that one until a newer one appears.
 * - `reload` (web): a newer website is live — reloading the page gets it.
 * - `ota` (Android): an EAS Update was found; `ready` once it is downloaded, so updating is just a restart.
 * - `apk` (Android): a newer app build is published (`settings.latestAppVersion`) — it must be installed.
 */
export type UpdateOffer =
  | { kind: 'none' }
  | { kind: 'reload'; key: string }
  | { kind: 'ota'; key: string; ready: boolean }
  | { kind: 'apk'; key: string; url: string };

export type OfferInput = {
  native: boolean;
  /** The running version's release id (its bundled whats-new.json). */
  currentId: number;
  /** The website's whats-new.json; null until read or when it could not be read. */
  remote: readonly Release[] | null;
  ota: { available: boolean; pending: boolean; updateId: string | undefined };
  appVersion: string;
  /** `public.appConfig`; undefined while loading or offline. */
  config: { latestAppVersion: string; apkUrl: string } | undefined;
  dismissed: readonly string[];
};

const NONE: UpdateOffer = { kind: 'none' };

function offerFor(input: OfferInput): UpdateOffer {
  if (!input.native) {
    const liveId = latestReleaseId(input.remote);
    return liveId > input.currentId ? { kind: 'reload', key: `web:${liveId}` } : NONE;
  }
  // A JavaScript update for this build first: one tap and a restart. A newer build, if any, is offered after it.
  if (input.ota.available || input.ota.pending) {
    return { kind: 'ota', key: `ota:${input.ota.updateId ?? ''}`, ready: input.ota.pending };
  }
  const config = input.config;
  if (config && config.apkUrl !== '' && compareVersions(input.appVersion, config.latestAppVersion) < 0) {
    return { kind: 'apk', key: `apk:${config.latestAppVersion}`, url: config.apkUrl };
  }
  return NONE;
}

export function resolveOffer(input: OfferInput): UpdateOffer {
  const offer = offerFor(input);
  return offer.kind !== 'none' && input.dismissed.includes(offer.key) ? NONE : offer;
}
