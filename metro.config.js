// Sentry's Expo Metro config (source maps + debug IDs) wrapped by NativeWind v4.
const { getSentryExpoConfig } = require('@sentry/react-native/metro');
const { withNativeWind } = require('nativewind/metro');

const config = getSentryExpoConfig(__dirname);

module.exports = withNativeWind(config, { input: './global.css', configPath: './tailwind.config.ts' });
