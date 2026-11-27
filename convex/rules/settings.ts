/**
 * Settings — every rule number of the product (specs §5.2). Pure TypeScript + zod, no Convex imports.
 *
 * - `SETTING_DEFS` lists each key with its default, its allowed range (zod schema) and its PRD reference.
 *   Grouped rows of §5.2 ("a / b / c") are split into one key each.
 * - 🩺 values are marked `medical: true` (they change only after the medical reviewer agrees).
 * - Logic never types a rule number; it reads `Settings` (the resolved object) instead (CLAUDE.md rule 9).
 */
import { z } from 'zod';

export type Range = { min: number; max: number };

type Def<S extends z.ZodType> = {
  schema: S;
  default: z.infer<S>;
  ref: string;
  /** 🩺 — changes need the medical reviewer (OQ-01). */
  medical?: boolean;
  /** Numeric range, shown in the VAL-19 message "Value must be between {{min}} and {{max}}". */
  range?: Range;
  /** Seeded with a different value per environment (see `seedValues`). */
  perEnvironment?: boolean;
};

function def<S extends z.ZodType>(
  schema: S,
  defaultValue: z.infer<S>,
  ref: string,
  opts: Omit<Def<S>, 'schema' | 'default' | 'ref'> = {},
): Def<S> {
  return { schema, default: defaultValue, ref, ...opts };
}

/** Integer setting within an inclusive range. */
function int(min: number, max: number) {
  return z.number().int().min(min).max(max);
}
function intDef(defaultValue: number, min: number, max: number, ref: string, medical = false) {
  return def(int(min, max), defaultValue, ref, { range: { min, max }, ...(medical ? { medical } : {}) });
}

const HH_MM = /^([01]\d|2[0-3]):[0-5]\d$/;
const SEMVER = /^\d+\.\d+\.\d+$/;
const SHA256 = /^[a-f0-9]{64}$/;
/** Stored phone format (VAL-03). */
export const STORED_PHONE = /^\+8801[3-9]\d{8}$/;

const AI_FEATURE_KEYS = ['intake', 'duplicate', 'assistant', 'appeal', 'summary'] as const;

/** Every "if-time" (Should) feature ships switched off (roadmap §3 P7). */
export const FEATURE_KEYS = [
  'duplicateWarning',
  'sharedLinks',
  'campaignStats',
  'impactNumbers',
  'learnPages',
  'assistant',
  'volunteerPost',
  'slips',
  'repeatRequest',
  'donorHistory',
  'reminders',
  'editProfile',
  'alertLimits',
  'settingsEdit',
  'directoryUi',
  'faqUi',
  'dataImportExport',
  'weeklySummary',
  'emailAlerts',
  'installPrompts',
  'pinMap',
] as const;
export type FeatureKey = (typeof FEATURE_KEYS)[number];

function booleanRecord<K extends string>(keys: readonly K[]) {
  return z.object(Object.fromEntries(keys.map((k) => [k, z.boolean()])) as Record<K, z.ZodBoolean>).strict();
}
function allValues<K extends string, V>(keys: readonly K[], value: V): Record<K, V> {
  return Object.fromEntries(keys.map((k) => [k, value])) as Record<K, V>;
}

export const SETTING_DEFS = {
  // ── Donor eligibility (S-01…S-07) ──
  minAge: def(z.literal(18), 18, 'S-01'),
  maxDonorAge: intDef(65, 60, 70, 'S-02', true),
  minWeightKg: intDef(50, 45, 60, 'S-03', true),
  intervalWholeMaleDays: intDef(90, 56, 180, 'S-04', true),
  intervalWholeOtherDays: intDef(120, 56, 180, 'S-05', true),
  intervalPlateletDays: intDef(14, 2, 30, 'S-06', true),
  intervalPlateletToWholeDays: intDef(14, 2, 90, 'S-07', true),

  // ── Matching (S-08…S-16) ──
  waveSizes: def(z.array(int(1, 200)).min(1).max(5), [10, 25, 50], 'S-08', { range: { min: 1, max: 200 } }),
  waveIntervalMin: def(
    z.object({ now: int(1, 120), today: int(1, 120), later: int(1, 120) }).strict(),
    { now: 5, today: 15, later: 30 },
    'S-09',
    { range: { min: 1, max: 120 } },
  ),
  waveCount: intDef(3, 1, 5, 'S-10'),
  compatibleInFinalWave: def(z.boolean(), true, 'S-11', { medical: true }),
  extraConfirmedSlots: intDef(1, 0, 3, 'S-12'),
  volunteerHotlineDelaySec: intDef(30, 10, 600, 'S-13'),
  maxVolunteersShown: intDef(2, 1, 5, 'S-14'),
  stillComingAfterMin: def(z.object({ now: int(5, 120), other: int(5, 120) }).strict(), { now: 10, other: 20 }, 'S-15', {
    range: { min: 5, max: 120 },
  }),
  stillComingBeforeNeededMin: intDef(30, 10, 180, 'S-15c'),
  stillComingAnswerMin: intDef(5, 2, 30, 'S-16'),

  // ── Lifecycle (S-17…S-19) ──
  autoCloseAfterNeededHours: intDef(6, 1, 48, 'S-17'),
  contactVisibleAfterCloseDays: intDef(7, 1, 30, 'S-18'),
  confirmPromptHours: intDef(24, 1, 72, 'S-19'),
  confirmReminderHours: intDef(24, 1, 72, 'S-19'),

  // ── Alerts to donors (S-20, S-21) ──
  donorAlertCapPerDay: intDef(3, 1, 10, 'S-20'),
  quietHours: def(
    z.object({ start: z.string().regex(HH_MM), end: z.string().regex(HH_MM) }).strict(),
    { start: '00:00', end: '07:00' },
    'S-21',
  ),

  // ── Limits (S-22…S-25) ──
  openRequestsUnverified: intDef(1, 1, 50, 'S-22'),
  openRequestsVerified: intDef(2, 1, 50, 'S-22'),
  requestsPerMonth: intDef(5, 1, 50, 'S-22'),
  volunteerRequestsPerMonth: intDef(20, 1, 50, 'S-22'),
  revealsPerRequesterPerDay: intDef(10, 1, 50, 'S-23'),
  revealFlagPerDay: intDef(20, 5, 200, 'S-24'),
  signupsPerDevicePerHour: intDef(5, 1, 50, 'S-25'),

  // ── Retention and reminders (S-26…S-28) ──
  slipDeleteMaxDaysAfterClose: intDef(7, 0, 30, 'S-26'),
  deletionDays: intDef(30, 1, 30, 'S-27'),
  availabilityNudgeDays: intDef(90, 30, 365, 'S-28'),

  // ── AI and usage (S-29, S-30) ──
  aiIntakeCallsPerRequest: intDef(2, 0, 10, 'S-29'),
  assistantQuestionsPerDay: intDef(10, 0, 50, 'S-29'),
  usageWarnPct: intDef(70, 50, 99, 'S-30'),
  usageCriticalPct: intDef(90, 50, 99, 'S-30'),

  // ── Misc (S-31…S-37) ──
  duplicateWindowHours: intDef(24, 1, 72, 'S-31'),
  neighbourKm: intDef(10, 2, 50, 'S-32'),
  realtimeFallbackSec: intDef(15, 5, 60, 'S-33'),
  reopenWindowHours: intDef(24, 0, 72, 'S-34'),
  purgePersonalFieldsDays: intDef(30, 7, 90, 'S-35'),
  aiLogRetentionDays: intDef(30, 1, 30, 'S-36'),
  noShowPenalty: def(z.object({ count: int(1, 10), days: int(30, 180) }).strict(), { count: 2, days: 90 }, 'S-37'),

  // ── Consent, app versions, contact ──
  consentVersion: def(z.string().min(1).max(60), '2026-11-28-pilot', 'X08'),
  minimumAppVersion: def(z.string().regex(SEMVER), '1.0.0', 'ADR-007', { perEnvironment: true }),
  latestAppVersion: def(z.string().regex(SEMVER), '1.0.0', 'ADR-007', { perEnvironment: true }),
  /** GitHub Release URL; empty until the first release (RB-11) — the download button is hidden while empty. */
  apkUrl: def(z.union([z.literal(''), z.url({ protocol: /^https$/ })]), '', 'ADR-007'),
  apkSha256: def(z.union([z.literal(''), z.string().regex(SHA256)]), '', 'ADR-007'),
  /** Super-admin's number (OQ-06). Empty until the super-admin sets it — never invented. */
  fallbackContactPhone: def(z.union([z.literal(''), z.string().regex(STORED_PHONE)]), '', 'OQ-06'),
  contactEmail: def(z.email(), 'udvasitobd@gmail.com', 'OQ-10'),
  medicalReviewer: def(
    z.object({ name: z.string().max(80), reviewedAt: z.number().nullable() }).strict(),
    { name: '', reviewedAt: null },
    'OQ-01',
  ),

  // ── AI (F-902, ADR-010) ──
  'ai.features': def(booleanRecord(AI_FEATURE_KEYS), allValues(AI_FEATURE_KEYS, true), 'F-902'),
  /** Model ids are confirmed by spike S4 (docs/spikes.md). */
  'ai.models': def(
    z.object({ lite: z.string().min(1), flash: z.string().min(1) }).strict(),
    { lite: 'gemini-flash-lite-latest', flash: 'gemini-flash-latest' },
    'ADR-010',
  ),
  'ai.limits': def(
    z
      .object({
        liteDaily: z.number().int().nonnegative(),
        liteRpm: z.number().int().nonnegative(),
        flashDaily: z.number().int().nonnegative(),
      })
      .strict(),
    { liteDaily: 500, liteRpm: 15, flashDaily: 20 },
    'PRD §6.3',
  ),

  // ── Phone verification (ADR-004, D-R1) ──
  verification: def(
    z
      .object({
        telegram: z.boolean(),
        whatsapp: z.boolean(),
        inPerson: z.boolean(),
        telegramBot: z.string().max(64),
        whatsappNumber: z.string().max(20),
      })
      .strict(),
    { telegram: true, whatsapp: false, inPerson: true, telegramBot: '', whatsappNumber: '' },
    'ADR-004',
    { perEnvironment: true },
  ),
  inPersonVerificationsPerDay: intDef(60, 10, 200, 'D-R1'),

  // ── Switches ──
  emailSignInEnabled: def(z.boolean(), false, 'T-5'),
  demoAreaEnabled: def(z.boolean(), true, 'F-912', { perEnvironment: true }),
  pilotDistrictIds: def(z.array(z.string().min(1)), [], 'OQ-12'),
  features: def(booleanRecord(FEATURE_KEYS), allValues(FEATURE_KEYS, false), 'roadmap §3 P7'),
} as const;

export type SettingKey = keyof typeof SETTING_DEFS;
export type Settings = { [K in SettingKey]: z.infer<(typeof SETTING_DEFS)[K]['schema']> };

export const SETTING_KEYS = Object.keys(SETTING_DEFS) as SettingKey[];

export function isSettingKey(key: string): key is SettingKey {
  return Object.prototype.hasOwnProperty.call(SETTING_DEFS, key);
}

/** The defaults of §5.2 as one object (deep copy, safe to mutate). */
export function defaultSettings(): Settings {
  const out: Record<string, unknown> = {};
  for (const key of SETTING_KEYS) out[key] = structuredClone(SETTING_DEFS[key].default);
  return out as Settings;
}

export type SettingCheck<K extends SettingKey> =
  | { ok: true; value: Settings[K] }
  | { ok: false; range?: Range };

/** Validates one value against its key's range (VAL-19). */
export function checkSetting<K extends SettingKey>(key: K, value: unknown): SettingCheck<K> {
  const d = SETTING_DEFS[key] as Def<z.ZodType>;
  const parsed = d.schema.safeParse(value);
  if (parsed.success) return { ok: true, value: parsed.data as Settings[K] };
  return d.range ? { ok: false, range: d.range } : { ok: false };
}

/** Cross-key rules that a single-key check cannot see. */
export function crossCheck(settings: Settings): string[] {
  const problems: string[] = [];
  if (settings.waveSizes.length < settings.waveCount) problems.push('waveSizes');
  // S-30: the warning level must come before the critical level.
  if (settings.usageWarnPct >= settings.usageCriticalPct) problems.push('usageCriticalPct');
  return problems;
}

/**
 * Builds the typed settings object from stored rows. A missing or out-of-range row falls back to the §5.2 default,
 * and its key is reported in `invalid` so the caller can log it (never silently trusted).
 */
export function resolveSettings(rows: readonly { key: string; value: unknown }[]): {
  settings: Settings;
  missing: SettingKey[];
  invalid: SettingKey[];
} {
  const byKey = new Map(rows.map((r) => [r.key, r.value]));
  const settings = defaultSettings() as Record<SettingKey, unknown>;
  const missing: SettingKey[] = [];
  const invalid: SettingKey[] = [];
  for (const key of SETTING_KEYS) {
    if (!byKey.has(key)) {
      missing.push(key);
      continue;
    }
    const check = checkSetting(key, byKey.get(key));
    if (check.ok) settings[key] = check.value;
    else invalid.push(key);
  }
  return { settings: settings as Settings, missing, invalid };
}

export type DeploymentEnvironment = 'staging' | 'production';

/**
 * The values `seed-settings` writes for a deployment. Differences from the defaults are only the per-environment
 * rows of §5.2 and the pilot release (roadmap §3 P1 go-live step 5: app versions start at 0.1.0).
 */
export function seedValues(
  environment: DeploymentEnvironment,
  opts: { telegramBot?: string; pilotDistrictIds?: string[] } = {},
): Settings {
  const values = defaultSettings();
  values.demoAreaEnabled = environment === 'staging';
  values.minimumAppVersion = '0.1.0';
  values.latestAppVersion = '0.1.0';
  if (opts.telegramBot !== undefined) values.verification.telegramBot = opts.telegramBot;
  if (opts.pilotDistrictIds !== undefined) values.pilotDistrictIds = opts.pilotDistrictIds;
  return values;
}
