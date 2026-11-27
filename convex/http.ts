/**
 * HTTP endpoints on the Convex site URL — specs §6.5. P0: Better Auth routes, `/health`, `/public/helpline`;
 * P1: `/telegram/webhook`. The WhatsApp webhook, `/public/stats` and `/slip/:id` arrive with their phases.
 */
import { httpRouter } from 'convex/server';

import { internal } from './_generated/api';
import { httpAction } from './_generated/server';
import { networkKey } from './_lib/network';
import { rateLimiter, retryAfterMinutes } from './_lib/rateLimits';
import { parseUpdate, sameSecret, sendReply } from './_lib/telegram';
import { authComponent, createAuth } from './auth';

const http = httpRouter();

authComponent.registerRoutes(http, createAuth, { cors: true });

/** The web app's origin (SITE_URL); browsers may read these public endpoints only from there. */
function allowedOrigin(): string {
  try {
    return new URL(process.env.SITE_URL ?? 'https://udvasito.com').origin;
  } catch {
    return 'https://udvasito.com';
  }
}

function json(body: unknown, status: number, headers: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', ...headers },
  });
}

http.route({
  path: '/health',
  method: 'GET',
  handler: httpAction(async () => json({ ok: true, time: Date.now() }, 200, { 'Cache-Control': 'no-store' })),
});

http.route({
  path: '/public/helpline',
  method: 'GET',
  handler: httpAction(async (ctx, request) => {
    const headers = {
      'Cache-Control': 'no-store',
      'Access-Control-Allow-Origin': allowedOrigin(),
      Vary: 'Origin',
    };
    const limit = await rateLimiter.limit(ctx, 'publicHelpline', { key: await networkKey(request.headers, 'helpline') });
    if (!limit.ok) return json({ retryAfterMin: retryAfterMinutes(limit.retryAfter) }, 429, headers);
    const phone = await ctx.runQuery(internal.supportInternal.helplinePhone, {});
    return json({ phone }, 200, headers);
  }),
});

/**
 * Telegram bot updates (ADR-004). Only Telegram knows the secret (`setWebhook` secret_token); anything else gets 401.
 * Always 200 after processing, so Telegram never re-sends an update we already handled.
 */
http.route({
  path: '/telegram/webhook',
  method: 'POST',
  handler: httpAction(async (ctx, request) => {
    const given = request.headers.get('X-Telegram-Bot-Api-Secret-Token');
    if (!sameSecret(given, process.env.TELEGRAM_WEBHOOK_SECRET)) return json({}, 401);
    let update: unknown;
    try {
      update = await request.json();
    } catch {
      return json({}, 200);
    }
    const message = parseUpdate(update);
    if (message) {
      const reply = await ctx.runMutation(internal.telegram.handleMessage, message);
      if (reply) await sendReply(reply);
    }
    return json({}, 200);
  }),
});

export default http;
