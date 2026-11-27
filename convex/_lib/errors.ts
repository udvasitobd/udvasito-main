/**
 * Typed application errors — specs §6.0 / §6.7.
 * Every backend failure the app must explain is `throw appError(code, params?, field?)`; the app maps `code` to the
 * i18n key `errors.<CODE>`. AI problems are never thrown (intake/assistant return fallback modes).
 */
import { ConvexError } from 'convex/values';

export const ERROR_CODES = [
  'ERR_UNAUTHENTICATED',
  'ERR_CONSENT_REQUIRED',
  'ERR_UNDERAGE',
  'ERR_FORBIDDEN',
  'ERR_FROZEN',
  'ERR_NOT_FOUND',
  'ERR_VALIDATION',
  'ERR_RATE_LIMITED',
  'ERR_OPEN_REQUEST_LIMIT',
  'ERR_MONTHLY_REQUEST_LIMIT',
  'ERR_PHONE_NOT_VERIFIED',
  'ERR_PHONE_IN_USE',
  'ERR_VERIFICATION_EXPIRED',
  'ERR_METHOD_DISABLED',
  'ERR_REQUEST_CLOSED',
  'ERR_ALREADY_RESPONDED',
  'ERR_NOT_ELIGIBLE',
  'ERR_BLOCKED',
  'ERR_REVEALS_FROZEN',
  'ERR_LAST_ADMIN',
  'ERR_DEMO_ISOLATION',
  'ERR_SELF_VERIFICATION',
  'ERR_APP_VERSION',
  'ERR_INTERNAL',
] as const;

export type ErrorCode = (typeof ERROR_CODES)[number];

/** `ERR_NOT_ELIGIBLE` reasons (specs §6.7). */
export type NotEligibleReason = 'cooldown' | 'group' | 'platelets' | 'age' | 'notLive';

export type ErrorParams = Record<string, string | number>;

export type AppErrorData = {
  code: ErrorCode;
  params?: ErrorParams;
  /** Form field the error belongs to (ERR_VALIDATION). */
  field?: string;
  /** i18n key of the VAL rule message, e.g. `validation.phone.invalid`. */
  messageKey?: string;
};

export function appError(code: ErrorCode, params?: ErrorParams, field?: string, messageKey?: string) {
  const data: AppErrorData = { code };
  if (params !== undefined) data.params = params;
  if (field !== undefined) data.field = field;
  if (messageKey !== undefined) data.messageKey = messageKey;
  return new ConvexError(data);
}

export function isErrorCode(value: unknown): value is ErrorCode {
  return typeof value === 'string' && (ERROR_CODES as readonly string[]).includes(value);
}

/** Reads the app error data from anything thrown by a Convex call (client or server). */
export function readAppError(error: unknown): AppErrorData | null {
  if (error instanceof ConvexError) {
    const data = error.data as unknown;
    if (data && typeof data === 'object' && isErrorCode((data as { code?: unknown }).code)) {
      return data as AppErrorData;
    }
  }
  return null;
}
