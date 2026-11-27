/**
 * Personal-data scrubber for error reports (specs §7.4, CLAUDE.md rule 3): Sentry `beforeSend` /
 * `beforeBreadcrumb` pass every event through `scrubEvent`. Pure TypeScript, unit-tested (scrub.test.ts).
 *
 * - Bangladeshi mobile numbers in Latin or Bangla digits, in the `+880…`, `880…` and `01…` forms, with or without
 *   spaces, dashes, dots or brackets → `[phone]`.
 * - Values under keys that hold names, phone numbers or free text (form fields, request text) → `[removed]`.
 * - Request bodies, query strings, cookies and headers are dropped; `user` keeps only its id.
 * - Default-deny: every event field except a short list of Sentry structure (STRUCTURAL_FIELDS) is scrubbed.
 */

const DIGIT = '[0-9০-৯]';
// Up to two separators between digits: "017-1234", "(017) 1234".
const SEP = '[\\s\\-.()]{0,2}';
// Optional country code (+880 / 880 / ৮৮০, the 0 of 880 doubling as the national 0), then 1, operator digit 3–9 and
// eight more digits. A separator may follow "+" but never precede the number (so the space before it is kept).
const MOBILE = `\\(?(?:(?:\\+${SEP})?(?:88|৮৮)${SEP})?[0০]${SEP}[1১]${SEP}[3-9৩-৯](?:${SEP}${DIGIT}){8}`;
const PHONE_RE = new RegExp(`(^|[^0-9০-৯])(${MOBILE})(?![0-9০-৯])`, 'g');

export const PHONE_MASK = '[phone]';
export const REMOVED = '[removed]';

/** Replaces every Bangladeshi mobile number in a string. */
export function scrubText(text: string): string {
  return text.replace(PHONE_RE, (_m, before: string) => `${before}${PHONE_MASK}`);
}

// Stricter form for scanning code (the build-output check): numbers as people write them in a string — single
// spaces or dashes only, and not part of a decimal or a minus sequence (SVG paths are full of "0 0 1 46.655 …").
const LIT_SEP = '[ \\-]?';
const LITERAL = `(?:\\+?(?:88|৮৮)${LIT_SEP})?[0০]${LIT_SEP}[1১][3-9৩-৯](?:${LIT_SEP}${DIGIT}){8}`;
const LITERAL_RE = new RegExp(`(^|[^0-9০-৯.\\-])(${LITERAL})(?![0-9০-৯.])`, 'g');

/** Every Bangladeshi mobile number written in a text or code file (used by the build-output check). */
export function findPhoneNumbers(text: string): string[] {
  return [...text.matchAll(LITERAL_RE)].map((m) => m[2] ?? '');
}

/** Keys whose values are personal data or free text, whatever they contain. */
const SENSITIVE_KEY =
  /(phone|mobile|msisdn|name|email|address|text|note|body|comment|description|reason|message_?text|patient|relation|dob|birth|password|pin|token|otp|secret|cookie|authorization)/i;

/** Keys that are safe to keep even though they match the pattern above (Sentry structure, not user data). */
const SAFE_KEYS: ReadonlySet<string> = new Set(['filename', 'function', 'module', 'abs_path', 'type', 'mechanism', 'category']);
/** In `contexts`, `name` is the OS / browser / runtime name — except the device name, which people personalise. */
const CONTEXT_SAFE_KEYS: ReadonlySet<string> = new Set([...SAFE_KEYS, 'name']);

function scrubValue(value: unknown, depth: number, safe: ReadonlySet<string> = SAFE_KEYS): unknown {
  if (depth > 12) return REMOVED;
  if (typeof value === 'string') return scrubText(value);
  if (Array.isArray(value)) return value.map((v) => scrubValue(v, depth + 1, safe));
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [key, v] of Object.entries(value as Record<string, unknown>)) {
      const sensitive = !safe.has(key) && SENSITIVE_KEY.test(key) && v != null && typeof v !== 'boolean';
      out[key] = sensitive ? REMOVED : scrubValue(v, depth + 1, safe);
    }
    return out;
  }
  return value;
}

type Scrubbable = {
  message?: unknown;
  exception?: unknown;
  breadcrumbs?: unknown;
  extra?: unknown;
  contexts?: unknown;
  tags?: unknown;
  request?: { url?: string; data?: unknown; query_string?: unknown; cookies?: unknown; headers?: unknown } & Record<string, unknown>;
  user?: { id?: string | number } & Record<string, unknown>;
} & Record<string, unknown>;

/**
 * Top-level fields that are Sentry structure, never user data, and pass through unchanged. Every other field —
 * `message`, `logentry`, `transaction`, `fingerprint`, `extra`, `tags`, `breadcrumbs`, and anything a future SDK adds —
 * is scrubbed by default.
 */
const STRUCTURAL_FIELDS: ReadonlySet<string> = new Set([
  'event_id',
  'timestamp',
  'start_timestamp',
  'platform',
  'level',
  'release',
  'dist',
  'environment',
  'type',
  'sdk',
  'debug_meta',
  'modules',
]);

/** Scrubs a whole Sentry event (structural type, so this file needs no Sentry import). */
export function scrubEvent<T extends Scrubbable>(event: T): T {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(event)) {
    if (value === undefined || STRUCTURAL_FIELDS.has(key)) out[key] = value;
    else if (key === 'exception') out[key] = scrubException(value);
    else if (key === 'contexts') out[key] = scrubContexts(value);
    else if (key === 'request') out[key] = scrubRequest(value as NonNullable<Scrubbable['request']>);
    else if (key === 'user') out[key] = scrubUser(value as NonNullable<Scrubbable['user']>);
    else out[key] = scrubValue(value, 0);
  }
  return out as T;
}

function scrubContexts(value: unknown): unknown {
  const contexts = scrubValue(value, 0, CONTEXT_SAFE_KEYS) as Record<string, Record<string, unknown> | undefined>;
  if (contexts.device && 'name' in contexts.device) contexts.device = { ...contexts.device, name: REMOVED };
  return contexts;
}

/** Request bodies, query strings, cookies and headers never leave the device. */
function scrubRequest(request: NonNullable<Scrubbable['request']>): unknown {
  const { data: _data, query_string: _query, cookies: _cookies, headers: _headers, ...rest } = request;
  const scrubbed = scrubValue(rest, 0) as Record<string, unknown>;
  return { ...scrubbed, url: typeof rest.url === 'string' ? stripQuery(rest.url) : rest.url };
}

/** `user` keeps only its id. */
function scrubUser(user: NonNullable<Scrubbable['user']>): unknown {
  return user.id !== undefined ? { id: user.id } : {};
}

/** Breadcrumbs (console lines, navigation, fetch) go through the same rules. */
export function scrubBreadcrumb<T extends Record<string, unknown>>(crumb: T): T {
  const out = scrubValue(crumb, 0) as T & { data?: { url?: unknown } };
  if (out.data && typeof out.data.url === 'string') out.data = { ...out.data, url: stripQuery(out.data.url) };
  return out;
}

/**
 * Exception values and stack frames: local variables are dropped; everything else (the value, `mechanism.data`,
 * frame source lines) goes through the same scrubbing, while function and file names are kept (SAFE_KEYS).
 */
function scrubException(exception: unknown): unknown {
  if (!exception || typeof exception !== 'object') return scrubValue(exception, 0);
  const ex = exception as { values?: { stacktrace?: { frames?: Record<string, unknown>[] } }[] };
  if (!Array.isArray(ex.values)) return scrubValue(exception, 0);
  return scrubValue(
    {
      ...ex,
      values: ex.values.map((v) =>
        v.stacktrace
          ? { ...v, stacktrace: { ...v.stacktrace, frames: v.stacktrace.frames?.map(({ vars: _vars, ...frame }) => frame) } }
          : v,
      ),
    },
    0,
  );
}

/** Query strings can carry search text or tokens (`?ott=`), so they never leave the device. */
function stripQuery(url: string): string {
  const i = url.search(/[?#]/);
  return scrubText(i >= 0 ? url.slice(0, i) : url);
}
