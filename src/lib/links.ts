/** Fixed public addresses named in specs (SCR-O05 "Use the web app" → https://udvasito.com). */
export const WEB_APP_URL = 'https://udvasito.com';

/**
 * This build's own website: production builds use udvasito.com, every other build the staging site
 * (`EXPO_PUBLIC_APP_ENV`, set per EAS profile and on each `eas update`). The Android app reads `/whats-new.json` here.
 */
export const SITE_URL = process.env.EXPO_PUBLIC_APP_ENV === 'production' ? WEB_APP_URL : 'https://staging.udvasito.com';
