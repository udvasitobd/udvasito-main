/**
 * HTTP endpoints on the Convex site URL — specs §6.5. P0: Better Auth routes, `/health`, `/public/helpline`.
 * Telegram / WhatsApp webhooks, `/public/stats` and `/slip/:id` arrive with their phases.
 */
import { httpRouter } from 'convex/server';

import { internal } from './_generated/api';
import { httpAction } from './_generated/server';
import { networkKey } from './_lib/network';
import { rateLimiter, retryAfterMinutes } from './_lib/rateLimits';
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

export default http;
