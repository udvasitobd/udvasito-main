import { internalQuery } from './_generated/server';
import { getSetting } from './_lib/settings';

/** For `GET /public/helpline` only (internal — never callable by clients). */
export const helplinePhone = internalQuery({
  args: {},
  handler: async (ctx) => {
    const phone = await getSetting(ctx, 'fallbackContactPhone');
    return phone === '' ? null : phone;
  },
});
