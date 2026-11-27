/**
 * Telegram webhook plumbing (specs §6.5, ADR-004): read the parts of an `Update` we use, check the secret header in
 * constant time, and send a reply. No phone number or token is ever logged.
 */
import { bilingual, type CopyKey } from './copy';

export type TelegramMessage = {
  chatId: string;
  fromId: string;
  /** When Telegram received it (ms) — for the replay check. */
  sentAt: number;
  text?: string;
  contact?: { phone: string; userId?: string };
};

export type TelegramReply = { chatId: string; key: CopyKey; keyboard: 'share' | 'remove' };

const isObject = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null;
const idOf = (value: unknown): string | undefined =>
  typeof value === 'number' || typeof value === 'string' ? String(value) : undefined;

/** The private-chat message in an `Update`, or null for anything we ignore (edits, channels, malformed JSON). */
export function parseUpdate(update: unknown): TelegramMessage | null {
  if (!isObject(update) || !isObject(update.message)) return null;
  const message = update.message;
  const chatId = isObject(message.chat) ? idOf(message.chat.id) : undefined;
  const fromId = isObject(message.from) ? idOf(message.from.id) : undefined;
  if (!chatId || !fromId || typeof message.date !== 'number') return null;
  const parsed: TelegramMessage = { chatId, fromId, sentAt: message.date * 1000 };
  if (typeof message.text === 'string') parsed.text = message.text;
  if (isObject(message.contact) && typeof message.contact.phone_number === 'string') {
    const userId = idOf(message.contact.user_id);
    parsed.contact = { phone: message.contact.phone_number, ...(userId ? { userId } : {}) };
  }
  return parsed;
}

/** `/start <token>` → the token; `/start` alone → ''; anything else → undefined. */
export function startToken(text: string | undefined): string | undefined {
  const match = /^\/start(?:@\w+)?(?:\s+(\S+))?\s*$/.exec(text?.trim() ?? '');
  if (!match) return undefined;
  return match[1] ?? '';
}

/** Compares two secrets without leaking where they differ. */
export function sameSecret(given: string | null, expected: string | undefined): boolean {
  if (!given || !expected || given.length !== expected.length) return false;
  let difference = 0;
  for (let i = 0; i < given.length; i++) difference |= given.charCodeAt(i) ^ expected.charCodeAt(i);
  return difference === 0;
}

/** The Bot API `sendMessage` body for a reply. */
export function replyBody(reply: TelegramReply) {
  return {
    chat_id: reply.chatId,
    text: bilingual(reply.key),
    reply_markup:
      reply.keyboard === 'share'
        ? {
            keyboard: [[{ text: bilingual('telegramBot.share', ' / '), request_contact: true }]],
            resize_keyboard: true,
            one_time_keyboard: true,
          }
        : { remove_keyboard: true },
  };
}

/** Sends a reply with the bot token from the environment. Failures are logged (status only) and never thrown. */
export async function sendReply(reply: TelegramReply): Promise<void> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) {
    console.warn('telegram: TELEGRAM_BOT_TOKEN is not set; reply skipped');
    return;
  }
  try {
    const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(replyBody(reply)),
    });
    if (!response.ok) console.warn('telegram: sendMessage failed', { status: response.status });
  } catch {
    console.warn('telegram: sendMessage failed (network)');
  }
}

/**
 * Points the bot at this deployment's webhook with the shared secret (run once per deployment after the token and
 * secret are set: `npx convex run telegram:registerWebhook`). Returns only Telegram's yes/no and description.
 */
export async function setWebhook(): Promise<{ ok: boolean; description: string }> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const secret = process.env.TELEGRAM_WEBHOOK_SECRET;
  const site = process.env.CONVEX_SITE_URL;
  if (!token || !secret || !site) {
    return { ok: false, description: 'TELEGRAM_BOT_TOKEN, TELEGRAM_WEBHOOK_SECRET and CONVEX_SITE_URL must be set' };
  }
  const response = await fetch(`https://api.telegram.org/bot${token}/setWebhook`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      url: `${site}/telegram/webhook`,
      secret_token: secret,
      allowed_updates: ['message'],
      drop_pending_updates: true,
    }),
  });
  const body = (await response.json().catch(() => ({}))) as { ok?: boolean; description?: string };
  return { ok: response.ok && body.ok === true, description: body.description ?? `HTTP ${response.status}` };
}
