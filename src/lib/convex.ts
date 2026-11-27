/**
 * The app's Convex client and Better Auth client (Convex + Better Auth Expo guide; ADR-003).
 * Web: cross-domain plugin (session cookie kept by the client, `?ott=` token handled by ConvexBetterAuthProvider).
 * Android: Expo plugin (session in SecureStore; Google opens in the system browser and returns to udvasito://).
 */
import { expoClient } from '@better-auth/expo/client';
import { convexClient, crossDomainClient } from '@convex-dev/better-auth/client/plugins';
import { createAuthClient } from 'better-auth/react';
import { ConvexReactClient } from 'convex/react';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

// Expo inlines EXPO_PUBLIC_* at build time only when read like this (no dynamic access).
const convexUrl = process.env.EXPO_PUBLIC_CONVEX_URL;
const convexSiteUrl = process.env.EXPO_PUBLIC_CONVEX_SITE_URL;

if (!convexUrl || !convexSiteUrl) {
  throw new Error('EXPO_PUBLIC_CONVEX_URL and EXPO_PUBLIC_CONVEX_SITE_URL must be set (run `npm run convex` once).');
}

export const CONVEX_SITE_URL = convexSiteUrl;

export const convex = new ConvexReactClient(convexUrl, {
  // Sign-in state comes from Better Auth; don't hold the page while a stale token refreshes.
  unsavedChangesWarning: false,
});

export const authClient = createAuthClient({
  baseURL: convexSiteUrl,
  plugins: [
    convexClient(),
    ...(Platform.OS === 'web'
      ? [crossDomainClient()]
      : [expoClient({ scheme: 'udvasito', storagePrefix: 'udvasito', storage: SecureStore })]),
  ],
});
