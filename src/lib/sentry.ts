/**
 * Sentry for web and Android (ADR §0, Developer plan). Off until `EXPO_PUBLIC_SENTRY_DSN` is set. Every event and
 * breadcrumb passes the personal-data scrubber (src/lib/scrub.ts); no default PII, no performance tracing (the
 * free quota is for errors).
 *
 * The SDK is loaded with `import()`, so on web it is a separate chunk fetched after the first screen (it is ~2 MB of
 * source — the emergency path must not wait for it). Errors reported before it loads are queued (at most 5).
 */
import { scrubBreadcrumb, scrubEvent } from './scrub';

type SentryModule = typeof import('@sentry/react-native');

const dsn = process.env.EXPO_PUBLIC_SENTRY_DSN;
const environment = process.env.EXPO_PUBLIC_APP_ENV;
const MAX_QUEUED = 5;

let sentry: SentryModule | null = null;
let started = false;
const queued: unknown[] = [];

export function initSentry(): void {
  if (started || !dsn) return;
  started = true;
  import('@sentry/react-native')
    .then((S) => {
      S.init({
        dsn,
        environment: environment || 'development',
        sendDefaultPii: false,
        tracesSampleRate: 0,
        attachScreenshot: false,
        attachViewHierarchy: false,
        beforeSend: (event) => scrubEvent(event as unknown as Parameters<typeof scrubEvent>[0]) as unknown as typeof event,
        beforeBreadcrumb: (crumb) => scrubBreadcrumb(crumb as unknown as Record<string, unknown>) as unknown as typeof crumb,
      });
      sentry = S;
      for (const error of queued.splice(0)) S.captureException(error);
    })
    .catch(() => {
      // Error reporting must never break the app (offline, blocked by an extension, …).
      queued.length = 0;
    });
}

export function reportError(error: unknown): void {
  if (!started) return;
  if (sentry) sentry.captureException(error);
  else if (queued.length < MAX_QUEUED) queued.push(error);
}
