/**
 * Telegram verification (SCR-O04, specs §6.5): `phoneVerification.start`, `POST /telegram/webhook`,
 * `phoneVerification.acceptMismatch`. The bot's replies are captured from a stubbed `fetch`.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { api, internal } from './_generated/api';
import type { Id } from './_generated/dataModel';
import { readAppError } from './_lib/errors';
import { parseUpdate, replyBody, sameSecret, startToken } from './_lib/telegram';
import { dhakaMidnight } from './rules/time';
import { VERIFICATION_TTL_MS } from './rules/verification';
import { insertProfile, makeT, signIn, type ProfileOverrides, type T } from './test.setup';

const NOW = dhakaMidnight('2026-11-27') + 10 * 3_600_000;
const SECRET = 'test-webhook-secret-0123456789';
const TYPED = '+8801712345678';
const TELEGRAM_USER = 555001;

async function codeOf(promise: Promise<unknown>): Promise<string | null> {
  try {
    await promise;
    return null;
  } catch (error) {
    return readAppError(error)?.code ?? `non-app error: ${String(error)}`;
  }
}

const sent: { chat_id: string; text: string; reply_markup: Record<string, unknown> }[] = [];
const urls: string[] = [];

beforeEach(() => {
  sent.length = 0;
  urls.length = 0;
  process.env.TELEGRAM_WEBHOOK_SECRET = SECRET;
  process.env.TELEGRAM_BOT_TOKEN = 'test-bot-token';
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string, init?: { body?: string }) => {
      urls.push(url);
      sent.push(JSON.parse(init?.body ?? '{}'));
      return new Response('{"ok":true}', { status: 200 });
    }),
  );
});

afterEach(() => {
  delete process.env.TELEGRAM_WEBHOOK_SECRET;
  delete process.env.TELEGRAM_BOT_TOKEN;
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

let people = 0;
async function member(t: T, overrides: ProfileOverrides = {}) {
  people += 1;
  const { as, userId } = await signIn(t, `tg${people}@example.com`);
  const profileId = await insertProfile(t, userId, { phone: TYPED, ...overrides });
  return { as, profileId };
}

async function withBot(t: T, telegramBot = 'udvasito_bot') {
  await t.run((ctx) =>
    ctx.db.insert('settings', {
      key: 'verification',
      value: { telegram: true, whatsapp: false, inPerson: true, telegramBot, whatsappNumber: '' },
    }),
  );
}

function update(message: Record<string, unknown>, from = TELEGRAM_USER) {
  return {
    update_id: 1,
    message: { message_id: 1, date: Math.floor(Date.now() / 1000), chat: { id: from }, from: { id: from }, ...message },
  };
}

const post = (t: T, body: unknown, secret: string | null = SECRET) =>
  t.fetch('/telegram/webhook', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(secret ? { 'X-Telegram-Bot-Api-Secret-Token': secret } : {}) },
    body: JSON.stringify(body),
  });

const tokenOf = (deepLink: string) => new URL(deepLink).searchParams.get('start') ?? '';
const getRow = (t: T, id: Id<'phoneVerifications'>) => t.run((ctx) => ctx.db.get(id));
const getProfile = (t: T, id: Id<'profiles'>) => t.run((ctx) => ctx.db.get(id));

async function startAndOpenBot(t: T) {
  const who = await member(t);
  const started = await who.as.mutation(api.phoneVerification.start, { method: 'telegram' });
  await post(t, update({ text: `/start ${tokenOf(started.deepLink)}` }));
  return { ...who, ...started };
}

describe('phoneVerification.start', () => {
  it('needs the bot to be set up; WhatsApp is never offered yet', async () => {
    const t = makeT();
    const { as } = await member(t);
    expect(await codeOf(as.mutation(api.phoneVerification.start, { method: 'telegram' }))).toBe('ERR_METHOD_DISABLED');
    await withBot(t);
    expect(await codeOf(as.mutation(api.phoneVerification.start, { method: 'whatsapp' }))).toBe('ERR_METHOD_DISABLED');
  });

  it('needs a member', async () => {
    const t = makeT();
    expect(await codeOf(t.mutation(api.phoneVerification.start, { method: 'telegram' }))).toBe('ERR_UNAUTHENTICATED');
  });

  it('gives a deep link with a fresh 32-character token for 10 minutes', async () => {
    vi.useFakeTimers({ now: NOW, toFake: ['Date'] });
    const t = makeT();
    await withBot(t, '@udvasito_bot');
    const { as } = await member(t);
    const started = await as.mutation(api.phoneVerification.start, { method: 'telegram' });
    const token = tokenOf(started.deepLink);
    expect(started.deepLink).toBe(`https://t.me/udvasito_bot?start=${token}`);
    expect(token).toMatch(/^[0-9a-f]{32}$/);
    expect(await getRow(t, started.verificationId)).toMatchObject({
      method: 'telegram',
      token,
      status: 'pending',
      expiresAt: started.expiresAt,
    });
    expect(started.expiresAt - VERIFICATION_TTL_MS).toBeGreaterThanOrEqual(NOW);
  });
});

describe('POST /telegram/webhook', () => {
  it('refuses a request without the secret', async () => {
    const t = makeT();
    expect((await post(t, update({ text: '/start x' }), null)).status).toBe(401);
    expect((await post(t, update({ text: '/start x' }), 'wrong')).status).toBe(401);
    expect(sent).toHaveLength(0);
  });

  it('answers 200 to anything it does not use', async () => {
    const t = makeT();
    expect((await post(t, { update_id: 1, edited_message: {} })).status).toBe(200);
    expect((await post(t, update({ text: 'hello' }))).status).toBe(200);
    expect(sent).toHaveLength(0);
  });

  it('/start → "Share my phone number" button; same number → verified', async () => {
    const t = makeT();
    await withBot(t);
    const { as, profileId, verificationId } = await startAndOpenBot(t);

    expect(sent[0]).toMatchObject({
      chat_id: String(TELEGRAM_USER),
      text: 'Share my phone number\nআমার ফোন নম্বর শেয়ার করুন',
      reply_markup: {
        keyboard: [[{ text: 'Share my phone number / আমার ফোন নম্বর শেয়ার করুন', request_contact: true }]],
      },
    });
    expect((await getRow(t, verificationId))?.externalUserId).toBe(String(TELEGRAM_USER));

    await post(t, update({ contact: { phone_number: '8801712345678', user_id: TELEGRAM_USER } }));

    expect(await getProfile(t, profileId)).toMatchObject({ phoneVerified: true, phoneVerifiedVia: 'telegram' });
    expect((await getProfile(t, profileId))?.phoneVerifiedBy).toBeUndefined();
    expect(await as.query(api.phoneVerification.status, { verificationId })).toEqual({
      status: 'verified',
      enteredPhone: TYPED,
      verifiedPhone: TYPED,
    });
    expect(sent[1]).toMatchObject({ text: '✅ Verified — go back to UDVASITO\n✅ যাচাই হয়েছে — উদ্ভাসিতে ফিরে যান' });
    const events = await t.run((ctx) =>
      ctx.db
        .query('events')
        .withIndex('by_name', (q) => q.eq('name', 'phone_verified'))
        .collect(),
    );
    expect(events.map((event) => event.props)).toEqual([{ method: 'telegram' }]);
  });

  it('a different number → mismatch; the person can choose it in the app', async () => {
    const t = makeT();
    await withBot(t);
    const { as, profileId, verificationId } = await startAndOpenBot(t);
    await post(t, update({ contact: { phone_number: '+880 1912-345678', user_id: TELEGRAM_USER } }));

    expect(await as.query(api.phoneVerification.status, { verificationId })).toEqual({
      status: 'mismatch',
      enteredPhone: TYPED,
      verifiedPhone: '+8801912345678',
    });
    expect((await getProfile(t, profileId))?.phoneVerified).toBe(false);

    expect(await as.mutation(api.phoneVerification.acceptMismatch, { verificationId })).toBeNull();
    expect(await getProfile(t, profileId)).toMatchObject({
      phone: '+8801912345678',
      phoneVerified: true,
      phoneVerifiedVia: 'telegram',
    });
    expect((await getRow(t, verificationId))?.status).toBe('verified');
  });

  it('someone else\'s contact is refused and changes nothing', async () => {
    const t = makeT();
    await withBot(t);
    const { verificationId } = await startAndOpenBot(t);
    await post(t, update({ contact: { phone_number: '01712345678', user_id: 999 } }));
    await post(t, update({ contact: { phone_number: '01712345678' } }));
    expect(sent.slice(1).map((reply) => reply.text)).toEqual([
      'Please share your own number.\nঅনুগ্রহ করে নিজের নম্বর শেয়ার করুন।',
      'Please share your own number.\nঅনুগ্রহ করে নিজের নম্বর শেয়ার করুন।',
    ]);
    expect((await getRow(t, verificationId))?.status).toBe('pending');
  });

  it('ignores messages older than 10 minutes (replays)', async () => {
    const t = makeT();
    await withBot(t);
    const { verificationId } = await startAndOpenBot(t);
    const old = update({ contact: { phone_number: '01712345678', user_id: TELEGRAM_USER } });
    old.message.date -= 11 * 60;
    await post(t, old);
    expect(sent).toHaveLength(1);
    expect((await getRow(t, verificationId))?.status).toBe('pending');
  });

  it('an unknown, late or already-claimed link gets "expired"', async () => {
    vi.useFakeTimers({ now: NOW, toFake: ['Date'] });
    const t = makeT();
    await withBot(t);
    const expired = 'The link expired. Tap the button again.\nলিংকের মেয়াদ শেষ। আবার বোতামে ট্যাপ করুন।';
    await post(t, update({ text: '/start 0123456789abcdef0123456789abcdef' }));
    await post(t, update({ text: '/start' }));
    expect(sent.map((reply) => reply.text)).toEqual([expired, expired]);

    const { verificationId, deepLink } = await startAndOpenBot(t);
    await post(t, update({ text: `/start ${tokenOf(deepLink)}` }, 777));
    expect(sent.at(-1)?.text).toBe(expired);
    expect((await getRow(t, verificationId))?.externalUserId).toBe(String(TELEGRAM_USER));

    vi.setSystemTime(NOW + VERIFICATION_TTL_MS + 1);
    await post(t, update({ contact: { phone_number: '01712345678', user_id: TELEGRAM_USER } }));
    expect(sent.at(-1)?.text).toBe(expired);
  });

  it('a number that is not a Bangladeshi mobile is refused', async () => {
    const t = makeT();
    await withBot(t);
    const { verificationId } = await startAndOpenBot(t);
    await post(t, update({ contact: { phone_number: '+447700900123', user_id: TELEGRAM_USER } }));
    expect(sent.at(-1)?.text).toBe(
      'Enter a Bangladeshi mobile number like 01712345678.\n০১৭১২৩৪৫৬৭৮-এর মতো একটি বাংলাদেশি মোবাইল নম্বর দিন।',
    );
    expect((await getRow(t, verificationId))?.status).toBe('pending');
  });

  it('a number already verified on another account is refused (Q-015)', async () => {
    const t = makeT();
    await withBot(t);
    await member(t, { phoneVerified: true, phoneVerifiedVia: 'in_person' });
    const { profileId, verificationId } = await startAndOpenBot(t);
    await post(t, update({ contact: { phone_number: '01712345678', user_id: TELEGRAM_USER } }));
    expect(sent.at(-1)?.text).toContain('already verified on another account');
    expect((await getProfile(t, profileId))?.phoneVerified).toBe(false);
    expect((await getRow(t, verificationId))?.status).toBe('pending');
  });

  it('skips the reply when the bot token is missing, but still verifies', async () => {
    const t = makeT();
    await withBot(t);
    delete process.env.TELEGRAM_BOT_TOKEN;
    const { profileId } = await startAndOpenBot(t);
    await post(t, update({ contact: { phone_number: '01712345678', user_id: TELEGRAM_USER } }));
    expect(sent).toHaveLength(0);
    expect((await getProfile(t, profileId))?.phoneVerified).toBe(true);
  });
});

describe('phoneVerification.acceptMismatch', () => {
  it('only for the caller\'s own mismatch, within 10 minutes', async () => {
    vi.useFakeTimers({ now: NOW, toFake: ['Date'] });
    const t = makeT();
    await withBot(t);
    const { as, verificationId, expiresAt } = await startAndOpenBot(t);
    expect(await codeOf(as.mutation(api.phoneVerification.acceptMismatch, { verificationId }))).toBe(
      'ERR_VERIFICATION_EXPIRED',
    );

    await post(t, update({ contact: { phone_number: '01912345678', user_id: TELEGRAM_USER } }));
    const other = await member(t, { phone: '+8801512345678' });
    expect(await codeOf(other.as.mutation(api.phoneVerification.acceptMismatch, { verificationId }))).toBe(
      'ERR_NOT_FOUND',
    );

    vi.setSystemTime(expiresAt);
    expect(await codeOf(as.mutation(api.phoneVerification.acceptMismatch, { verificationId }))).toBe(
      'ERR_VERIFICATION_EXPIRED',
    );
  });

  it('refuses a number another account verified in the meantime', async () => {
    const t = makeT();
    await withBot(t);
    const { as, verificationId } = await startAndOpenBot(t);
    await post(t, update({ contact: { phone_number: '01912345678', user_id: TELEGRAM_USER } }));
    await member(t, { phone: '+8801912345678', phoneVerified: true, phoneVerifiedVia: 'telegram' });
    expect(await codeOf(as.mutation(api.phoneVerification.acceptMismatch, { verificationId }))).toBe('ERR_PHONE_IN_USE');
  });
});

describe('Telegram helpers', () => {
  it('parseUpdate reads private messages and contacts, ignores the rest', () => {
    expect(parseUpdate(null)).toBeNull();
    expect(parseUpdate({ message: { chat: { id: 1 }, date: 5 } })).toBeNull();
    expect(parseUpdate({ message: { chat: { id: 1 }, from: { id: 2 }, date: 5, text: '/start t' } })).toEqual({
      chatId: '1',
      fromId: '2',
      sentAt: 5000,
      text: '/start t',
    });
    expect(
      parseUpdate({ message: { chat: { id: 1 }, from: { id: 2 }, date: 5, contact: { phone_number: '880', user_id: 2 } } }),
    ).toEqual({ chatId: '1', fromId: '2', sentAt: 5000, contact: { phone: '880', userId: '2' } });
  });

  it('startToken', () => {
    expect(startToken('/start abc')).toBe('abc');
    expect(startToken('/start@udvasito_bot abc ')).toBe('abc');
    expect(startToken('/start')).toBe('');
    expect(startToken('/started')).toBeUndefined();
    expect(startToken('hello')).toBeUndefined();
    expect(startToken(undefined)).toBeUndefined();
  });

  it('sameSecret', () => {
    expect(sameSecret('abc', 'abc')).toBe(true);
    expect(sameSecret('abd', 'abc')).toBe(false);
    expect(sameSecret('ab', 'abc')).toBe(false);
    expect(sameSecret(null, 'abc')).toBe(false);
    expect(sameSecret('abc', undefined)).toBe(false);
  });

  it('replyBody removes the keyboard after the share step', () => {
    expect(replyBody({ chatId: '1', key: 'telegramBot.verified', keyboard: 'remove' }).reply_markup).toEqual({
      remove_keyboard: true,
    });
  });
});

describe('telegram.registerWebhook', () => {
  it('points the bot at this deployment with the secret, messages only', async () => {
    process.env.CONVEX_SITE_URL = 'https://example-123.convex.site';
    try {
      const t = makeT();
      expect(await t.action(internal.telegram.registerWebhook, {})).toEqual({ ok: true, description: 'HTTP 200' });
      expect(urls).toEqual(['https://api.telegram.org/bottest-bot-token/setWebhook']);
      expect(sent[0]).toEqual({
        url: 'https://example-123.convex.site/telegram/webhook',
        secret_token: SECRET,
        allowed_updates: ['message'],
        drop_pending_updates: true,
      });
    } finally {
      delete process.env.CONVEX_SITE_URL;
    }
  });

  it('does nothing until the token and secret are set', async () => {
    delete process.env.TELEGRAM_BOT_TOKEN;
    const t = makeT();
    expect((await t.action(internal.telegram.registerWebhook, {})).ok).toBe(false);
    expect(urls).toHaveLength(0);
  });
});
