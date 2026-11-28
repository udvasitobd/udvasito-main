/**
 * Runtime-version fingerprint (app.config.ts `runtimeVersion: { policy: 'fingerprint' }`).
 *
 * `google-services.json` is an EAS file secret (GOOGLE_SERVICES_JSON, roadmap RB-6): it exists only on the EAS build
 * machine, so counting it made the local and EAS fingerprints differ and EAS build #1 stopped at "Configure
 * expo-updates" (2026-11-28). It is skipped here. Consequence: changing the Firebase file does not change the runtime
 * version — any Firebase change needs a new native build anyway, and JS updates never depend on it.
 */
/** @type {import('@expo/fingerprint').Config} */
module.exports = {
  ignorePaths: ['../eas-environment-secrets/**'],
};
