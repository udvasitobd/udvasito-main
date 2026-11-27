/**
 * Telegram bot — the message logic behind `POST /telegram/webhook` (specs §6.5, ADR-004). Internal only; the HTTP
 * route checks the secret header, parses the update, calls `handleMessage` and sends the reply it returns.
 *
 *   /start <token>  → the chat is tied to that open link (first Telegram account only) → "Share my phone number" button
 *   shared contact  → own contact only → same number: verified; different: mismatch the person can accept in the app
 */
import { v } from 'convex/values';

import type { Doc } from './_generated/dataModel';
import { internalAction, internalMutation, type QueryCtx } from './_generated/server';
import type { CopyKey } from './_lib/copy';
import { logEvent } from './_lib/events';
import { setWebhook, startToken, type TelegramReply } from './_lib/telegram';
import { markPhoneVerified } from './_lib/verification';
import { ownPhone, phoneVerifiedElsewhere } from './_lib/visibility';
import { normalisePhone } from './rules/validation';
import { isOpen, WEBHOOK_REPLAY_MS } from './rules/verification';

/** The newest open Telegram row this Telegram account started. */
async function openRowFor(ctx: QueryCtx, fromId: string, now: number): Promise<Doc<'phoneVerifications'> | null> {
  const rows = await ctx.db
    .query('phoneVerifications')
    .withIndex('by_external', (q) => q.eq('externalUserId', fromId))
    .collect();
  const open = rows.filter((row) => row.method === 'telegram' && isOpen(row, now));
  return open.sort((a, b) => b._creationTime - a._creationTime)[0] ?? null;
}

export const handleMessage = internalMutation({
  args: {
    chatId: v.string(),
    fromId: v.string(),
    sentAt: v.number(),
    text: v.optional(v.string()),
    contact: v.optional(v.object({ phone: v.string(), userId: v.optional(v.string()) })),
  },
  handler: async (ctx, { chatId, fromId, sentAt, text, contact }): Promise<TelegramReply | null> => {
    const now = Date.now();
    const reply = (key: CopyKey, keyboard: TelegramReply['keyboard'] = 'remove'): TelegramReply => ({
      chatId,
      key,
      keyboard,
    });
    if (now - sentAt > WEBHOOK_REPLAY_MS) return null;

    const token = startToken(text);
    if (token !== undefined) {
      const row = token
        ? await ctx.db
            .query('phoneVerifications')
            .withIndex('by_token', (q) => q.eq('token', token))
            .unique()
        : null;
      const taken = row?.externalUserId !== undefined && row.externalUserId !== fromId;
      if (!row || row.method !== 'telegram' || !isOpen(row, now) || taken) return reply('verify.expired');
      await ctx.db.patch(row._id, { externalUserId: fromId });
      return reply('telegramBot.share', 'share');
    }

    if (!contact) return null;
    if (contact.userId !== fromId) return reply('telegramBot.ownNumber', 'share');
    const row = await openRowFor(ctx, fromId, now);
    if (!row) return reply('verify.expired');
    const shared = normalisePhone(contact.phone);
    if (!shared.ok) return reply('validation.VAL-03.invalid');
    const profile = await ctx.db.get(row.profileId);
    if (!profile) return reply('verify.expired');
    if (await phoneVerifiedElsewhere(ctx, profile, shared.phone)) return reply('errors.ERR_PHONE_IN_USE');

    if (shared.phone === ownPhone(profile)) {
      await markPhoneVerified(ctx, profile, 'telegram');
      await ctx.db.patch(row._id, { status: 'verified', verifiedPhone: shared.phone });
      await logEvent(ctx, {
        name: 'phone_verified',
        isDemo: profile.isDemo,
        actorRole: profile.role,
        props: { method: 'telegram' },
      });
    } else {
      // The app asks "Use {{verified}} as your number?" (SCR-O04 mismatch → phoneVerification.acceptMismatch).
      await ctx.db.patch(row._id, { status: 'mismatch', verifiedPhone: shared.phone });
    }
    return reply('telegramBot.verified');
  },
});

/** One-time setup per deployment (for_me.md): `npx convex run telegram:registerWebhook`. */
export const registerWebhook = internalAction({
  args: {},
  handler: async () => setWebhook(),
});
