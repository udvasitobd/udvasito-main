/**
 * Turns anything thrown by a Convex call into an i18n key + params (specs §6.7: `errors.<CODE>`).
 * Pure, so it is unit-tested; `ConvexError` is recognised by its `data` shape.
 */
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
