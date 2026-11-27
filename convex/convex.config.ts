import betterAuth from '@convex-dev/better-auth/convex.config';
import pushNotifications from '@convex-dev/expo-push-notifications/convex.config.js';
import rateLimiter from '@convex-dev/rate-limiter/convex.config.js';
import { defineApp } from 'convex/server';

// Components (specs §1.2): Better Auth, Expo push, rate limiter.
const app = defineApp();
app.use(betterAuth);
app.use(pushNotifications);
app.use(rateLimiter);

export default app;
