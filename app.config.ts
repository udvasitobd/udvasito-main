import type { ConfigContext, ExpoConfig } from 'expo/config';

/**
 * App identity and build profiles — specs.md §1.2.1.
 * These values are fixed before the first native build: changing the package name means a new app.
 *
 * Environment (set per EAS profile in eas.json, and in the Cloudflare Worker build variables for web — names only, never values here):
 *   EXPO_PUBLIC_CONVEX_URL, EXPO_PUBLIC_CONVEX_SITE_URL, EXPO_PUBLIC_SENTRY_DSN, EXPO_PUBLIC_APP_ENV
 *   GOOGLE_SERVICES_JSON (EAS file secret path)
 */
const APP_VERSION = '0.1.0';
/** EAS project "udvasito" of the udvasitos-team account (created 2026-11-27). Public identifier, not a secret. */
const EAS_PROJECT_ID = '3e11ddf3-c86f-4d08-8d22-433104d9a7b2';

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: 'UDVASITO',
  slug: 'udvasito',
  owner: 'udvasitos-team',
  version: APP_VERSION,
  orientation: 'portrait',
  scheme: 'udvasito',
  // Light theme only in v1 (specs §1.3.1).
  userInterfaceStyle: 'light',
  icon: './assets/icon.png',
  runtimeVersion: { policy: 'fingerprint' },
  updates: { url: `https://u.expo.dev/${EAS_PROJECT_ID}`, checkAutomatically: 'ON_LOAD', fallbackToCacheTimeout: 0 },
  extra: { ...config.extra, eas: { projectId: EAS_PROJECT_ID } },
  android: {
    package: 'org.udvasito.app',
    adaptiveIcon: {
      foregroundImage: './assets/adaptive-icon.png',
      backgroundColor: '#C1121F',
    },
    // FCM: google-services.json is an EAS file secret (roadmap RB-6) — never committed.
    googleServicesFile: process.env.GOOGLE_SERVICES_JSON ?? undefined,
    // Exactly the permissions of specs §1.2.1. Everything else that libraries try to merge in is blocked.
    permissions: [
      'android.permission.POST_NOTIFICATIONS',
      'android.permission.RECORD_AUDIO',
      'android.permission.ACCESS_COARSE_LOCATION',
      'android.permission.ACCESS_FINE_LOCATION',
      'android.permission.CAMERA',
      'android.permission.INTERNET',
    ],
    blockedPermissions: [
      'android.permission.ACCESS_BACKGROUND_LOCATION',
      'android.permission.READ_EXTERNAL_STORAGE',
      'android.permission.WRITE_EXTERNAL_STORAGE',
      'android.permission.READ_MEDIA_IMAGES',
      'android.permission.READ_MEDIA_VIDEO',
      'android.permission.READ_MEDIA_AUDIO',
      'android.permission.SYSTEM_ALERT_WINDOW',
      'android.permission.READ_CONTACTS',
      'android.permission.READ_PHONE_STATE',
      'android.permission.READ_CALL_LOG',
      'android.permission.READ_SMS',
      'android.permission.RECEIVE_SMS',
    ],
  },
  web: {
    // One index.html SPA; Cloudflare serves it for every unknown path (wrangler.jsonc, ADR-024).
    output: 'single',
    favicon: './public/favicon.png',
  },
  plugins: [
    'expo-router',
    [
      'expo-splash-screen',
      { image: './assets/splash-icon.png', imageWidth: 200, backgroundColor: '#FFFFFF', resizeMode: 'contain' },
    ],
    [
      'expo-notifications',
      // White-only status-bar icon tinted with Signal red; default channel per specs §1.2.1 (Q-003).
      { icon: './assets/notification-icon.png', color: '#C1121F', defaultChannel: 'blood-requests' },
    ],
    ['expo-location', { isAndroidBackgroundLocationEnabled: false, isAndroidForegroundServiceEnabled: false }],
    // Camera only for slip photos. (Do not set microphonePermission:false — it would strip RECORD_AUDIO, which voice
    // intake needs.)
    'expo-image-picker',
    [
      'expo-speech-recognition',
      { androidSpeechServicePackages: ['com.google.android.googlequicksearchbox', 'com.google.android.tts'] },
    ],
    'expo-secure-store',
    'expo-localization',
    'expo-font',
    '@sentry/react-native',
  ],
  experiments: {
    typedRoutes: true,
    reactCompiler: true,
  },
});
