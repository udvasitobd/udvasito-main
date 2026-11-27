/**
 * `revealPhone` guards that run before anything is read or written. The full reveal (contactReveals + audit) is
 * tested with the first 📞 functions in P1, when requests exist.
 */
import { describe, expect, it } from 'vitest';

import type { Id } from '../_generated/dataModel';
import { insertProfile, makeT, signIn } from '../test.setup';
import { readAppError } from './errors';
import { revealPhone } from './visibility';

async function setUp(subjectOverrides: { isDemo?: boolean } = {}) {
  const t = makeT();
  const { userId: v } = await signIn(t, 'viewer@example.com');
  const { userId: s } = await signIn(t, 'subject@example.com');
  const viewerId = await insertProfile(t, v, { role: 'admin' });
  const subjectId = await insertProfile(t, s, subjectOverrides);
  return { t, viewerId, subjectId };
}

const NO_REQUEST = 'not-reached' as Id<'requests'>;

describe('revealPhone', () => {
  it.each([[undefined], [''], ['   '], ['ok'], ['    abc    ']])(
    'refuses an admin reveal whose reason is %j (VAL-18: 5–200 characters after trimming)',
    async (reasonText) => {
      const { t, viewerId, subjectId } = await setUp();
      const error = await t
        .run(async (ctx) => {
          const viewer = (await ctx.db.get(viewerId))!;
          const subject = (await ctx.db.get(subjectId))!;
          return revealPhone(ctx, {
            viewer,
            subject,
            subjectRole: 'donor',
            requestId: NO_REQUEST,
            reason: 'admin_reveal',
            ...(reasonText !== undefined ? { reasonText } : {}),
            expiresAt: Date.now() + 60_000,
          });
        })
        .then(() => null, (e: unknown) => e);
      expect(readAppError(error)).toMatchObject({ code: 'ERR_VALIDATION', field: 'reason', messageKey: 'validation.VAL-18.invalid' });
    },
  );

  it('never reveals across the practice boundary', async () => {
    const { t, viewerId, subjectId } = await setUp({ isDemo: true });
    const error = await t
      .run(async (ctx) =>
        revealPhone(ctx, {
          viewer: (await ctx.db.get(viewerId))!,
          subject: (await ctx.db.get(subjectId))!,
          subjectRole: 'donor',
          requestId: NO_REQUEST,
          reason: 'admin_reveal',
          reasonText: 'Checking a report',
          expiresAt: Date.now() + 60_000,
        }),
      )
      .then(() => null, (e: unknown) => e);
    expect(readAppError(error)?.code).toBe('ERR_DEMO_ISOLATION');
  });
});
