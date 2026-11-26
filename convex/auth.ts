/**
 * Sign-in — Better Auth through the official Convex component (ADR-003), following the Convex + Better Auth Expo
 * guide (web variant with crossDomain). Google for everyone; email + password only on staging for automated tests
 * (P-10). Production practice sign-in (D-R4) is added with the practice area in P5.
 *
 * Convex env: BETTER_AUTH_SECRET, SITE_URL (https://udvasito.com | https://staging.udvasito.com |
 * http://localhost:8081 for a developer's dev deployment), GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET,
 * APP_ENV ("production" | "staging"), PASSWORD_SIGNIN ("true" on staging only).
 */
import { expo } from '@better-auth/expo';
import { createClient, type GenericCtx } from '@convex-dev/better-auth';
import { convex, crossDomain } from '@convex-dev/better-auth/plugins';
import { betterAuth, type BetterAuthOptions } from 'better-auth/minimal';

import { components } from './_generated/api';
import type { DataModel } from './_generated/dataModel';
import authConfig from './auth.config';

export const authComponent = createClient<DataModel>(components.betterAuth);

/** The app's deep-link scheme (specs §1.2.1). */
const APP_SCHEME_ORIGIN = 'udvasito://';

/** Treats an empty env value like a missing one. */
function nonEmpty(value: string | undefined): string | undefined {
  return value === undefined || value === '' ? undefined : value;
}

export const isProduction = () => nonEmpty(process.env.APP_ENV) === 'production';

export const createAuthOptions = (ctx: GenericCtx<DataModel>) => {
  const siteUrl = nonEmpty(process.env.SITE_URL) ?? 'https://udvasito.com';
  const production = isProduction();
  // Expo Go / dev-client origins are trusted only outside production (Better Auth Expo guide, step 6).
  const devOrigins = production ? [] : ['exp://', 'exp://**', 'http://localhost:8081'];
  return {
    appName: 'UDVASITO',
    trustedOrigins: [siteUrl, APP_SCHEME_ORIGIN, ...devOrigins],
    database: authComponent.adapter(ctx),
    emailAndPassword: {
      // P-10: staging-only password sign-in for automated tests. Never on in production (practice sign-in comes in P5).
      enabled: !production && nonEmpty(process.env.PASSWORD_SIGNIN) === 'true',
      requireEmailVerification: false,
      minPasswordLength: 10,
    },
    socialProviders: {
      google: {
        clientId: nonEmpty(process.env.GOOGLE_CLIENT_ID) ?? '',
        clientSecret: nonEmpty(process.env.GOOGLE_CLIENT_SECRET) ?? '',
        prompt: 'select_account',
      },
    },
    plugins: [expo(), convex({ authConfig }), crossDomain({ siteUrl })],
  } satisfies BetterAuthOptions;
};

export const createAuth = (ctx: GenericCtx<DataModel>) => betterAuth(createAuthOptions(ctx));
