/** `push.registerExpoToken` / `push.unregister` (specs §6.4): access and token checks. */
import { describe, expect, it } from 'vitest';

import { api } from './_generated/api';
import type { Id } from './_generated/dataModel';
import type { MutationCtx } from './_generated/server';
import { readAppError } from './_lib/errors';
import { pushNotifications } from './_lib/push';
import { insertProfile, makeT, signIn, type T } from './test.setup';

const TOKEN = 'ExponentPushToken[abcdefghij1234567890]';

async function codeOf(promise: Promise<unknown>): Promise<string | null> {
  try {
    await promise;
    return null;
  } catch (error) {
    return readAppError(error)?.code ?? `non-app error: ${String(error)}`;
  }
}

const statusOf = (t: T, profileId: Id<'profiles'>) =>
  t.run((ctx) => pushNotifications.getStatusForUser(ctx as unknown as MutationCtx, { userId: profileId }));

describe('push device registration', () => {
  it('needs a signed-in member', async () => {
    const t = makeT();
    expect(await codeOf(t.mutation(api.push.registerExpoToken, { token: TOKEN }))).toBe('ERR_UNAUTHENTICATED');
    expect(await codeOf(t.mutation(api.push.unregister, {}))).toBe('ERR_UNAUTHENTICATED');
  });

  it('accepts only an Expo push token', async () => {
    const t = makeT();
    const { as, userId } = await signIn(t, 'pusher@example.com');
    await insertProfile(t, userId);
    for (const token of ['', 'hello', 'ExponentPushToken[]', 'ExponentPushToken[abc def ghij]', `${TOKEN}x`]) {
      expect(await codeOf(as.mutation(api.push.registerExpoToken, { token }))).toBe('ERR_VALIDATION');
    }
  });

  it('stores the token under the caller’s profile, and removes it on sign-out', async () => {
    const t = makeT();
    const { as, userId } = await signIn(t, 'pusher@example.com');
    const profileId = await insertProfile(t, userId);
    expect((await statusOf(t, profileId)).hasToken).toBe(false);
    await as.mutation(api.push.registerExpoToken, { token: TOKEN });
    expect(await statusOf(t, profileId)).toEqual({ hasToken: true, paused: false });
    await as.mutation(api.push.unregister, { token: TOKEN });
    expect((await statusOf(t, profileId)).hasToken).toBe(false);
  });

  it('signing out stops alerts in every account state, also before the new terms are accepted', async () => {
    const t = makeT();
    let n = 0;
    for (const change of [
      { status: 'frozen' as const },
      { status: 'suspended' as const },
      { status: 'banned' as const },
      { status: 'deletion_pending' as const },
      { consentVersion: 'an-older-notice' },
    ]) {
      n += 1;
      const { as, userId } = await signIn(t, `leaving${n}@example.com`);
      const profileId = await insertProfile(t, userId);
      await as.mutation(api.push.registerExpoToken, { token: TOKEN });
      await t.run((ctx) => ctx.db.patch(profileId, change));
      expect(await codeOf(as.mutation(api.push.unregister, {}))).toBeNull();
      expect((await statusOf(t, profileId)).hasToken).toBe(false);
    }
  });
});
