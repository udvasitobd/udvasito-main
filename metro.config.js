// Sentry's Expo Metro config (source maps + debug IDs) wrapped by NativeWind v4.
// Metro does not tree-shake, so two imports are redirected to keep the web shell inside the specs §7.1 budget
// (≤ 600 KB gzip). Both are app-bundle only: Convex bundles its functions separately and is unaffected.
const { getSentryExpoConfig } = require('@sentry/react-native/metro');
const { withNativeWind } = require('nativewind/metro');

const config = getSentryExpoConfig(__dirname);

const norm = (p) => (p || '').split('\\').join('/');

const upstream = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  const origin = norm(context.originModulePath);

  // 1. @convex-dev/better-auth's cross-domain client needs only `parseSetCookieHeader`, but imports it from the
  //    `better-auth/cookies` barrel, which pulls server code (zod, jose, DB schema: ~600 KB). The same function is
  //    a public, import-free export at `better-auth/cookies/utils` (what @better-auth/expo already uses).
  if (moduleName === 'better-auth/cookies' && origin.includes('/@convex-dev/better-auth/dist/plugins/cross-domain/client')) {
    moduleName = 'better-auth/cookies/utils';
  }

  // 2. On web, gesture-handler loads Reanimated through an optional `try { require() }` with a built-in fallback.
  //    Our UI animates with core `Animated`, so web gets the fallback instead of ~750 KB of Reanimated.
  if (platform === 'web' && moduleName === 'react-native-reanimated' && origin.includes('/react-native-gesture-handler/')) {
    return { type: 'empty' };
  }

  return upstream ? upstream(context, moduleName, platform) : context.resolveRequest(context, moduleName, platform);
};

module.exports = withNativeWind(config, { input: './global.css', configPath: './tailwind.config.ts' });
