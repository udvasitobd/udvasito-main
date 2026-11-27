/**
 * Turns anything thrown by a Convex call into an i18n key + params (specs §6.7: `errors.<CODE>`).
 * Pure, so it is unit-tested; `ConvexError` is recognised by its `data` shape.
 */
import type { TFunction } from 'i18next';

import { formatCalendarDate, toBanglaDigits } from './dates';
import type { Language } from './language';

export type ErrorMessage = { key: string; params?: Record<string, string | number>; code: string };

const CODE = /^ERR_[A-Z_]+$/;

export function errorMessage(error: unknown): ErrorMessage {
  const data = (error as { data?: unknown } | null)?.data;
  if (data && typeof data === 'object' && typeof (data as { code?: unknown }).code === 'string') {
    const d = data as { code: string; params?: Record<string, string | number>; messageKey?: string };
    if (CODE.test(d.code)) {
      return { code: d.code, key: d.messageKey ?? `errors.${d.code}`, ...(d.params ? { params: d.params } : {}) };
    }
  }
  return { code: 'ERR_INTERNAL', key: 'errors.ERR_INTERNAL' };
}

/**
 * The message as text in the reader's language: a `{{reason}}` code becomes its `errors.<CODE>.reason.<reason>`
 * sentence (specs §6.7 "↳ reason" rows), a "YYYY-MM-DD" date is formatted, and numbers get Bangla digits.
 */
export function errorText(message: ErrorMessage, t: TFunction, language: Language): string {
  const params: Record<string, string | number> = {};
  for (const [name, value] of Object.entries(message.params ?? {})) {
    if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value))
      params[name] = formatCalendarDate(value, language);
    else if (typeof value === 'number' && language === 'bn') params[name] = toBanglaDigits(String(value));
    else params[name] = value;
  }
  if (typeof params.reason === 'string') {
    const reasonKey = `${message.key}.reason.${params.reason}`;
    const reason = t(reasonKey, params);
    if (reason !== reasonKey) params.reason = reason;
  }
  return t(message.key, params);
}
