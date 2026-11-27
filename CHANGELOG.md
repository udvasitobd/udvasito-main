# Changelog

All notable changes, newest first. One line per slice; phase prefix as in commit messages.

## Unreleased
- 2026-11-27 · P0 · Sentry (EU, server-side phone/email masking, no IP or location), Cloudinary (cloud `udvasito`, free) and Firebase (FCM only, Android app `org.udvasito.app`, no Analytics) set up; error scrubber keeps Sentry contexts and source lines in a valid shape (tested live).
- 2026-11-27 · P0 · Staging live on Convex (EU): PR #1 merged (aa6dac5), functions deployed, settings + places + practice donors loaded; Google sign-in tested end to end on the dev deployment.
- 2026-11-27 · P0 · Code-review fixes: last-admin guard, settings cross-check, VAL-18 on phone reveals, default-deny Sentry scrubber, auth hardening from SITE_URL only, spoof-proof helpline rate-limit key, signed-out race on Home, www → udvasito.com redirect (205a0f1).
- 2026-11-27 · P0 · Test: `npm run test:e2e` web smoke (sign-in, language switch, sign-in guard, axe, no inline scripts) against `dist/` with production headers; dataset count test (2c1a786).
- 2026-11-27 · P0 · `seed:staging` fake donors (8 groups × 29 Chattogram places, unallocated +88010 numbers); deployments tell staging from production by `SITE_URL` (45908e7).
- 2026-11-27 · P0 · `import:hospitals` with a line-by-line report, idempotent upsert, header-only `data/hospitals.csv` (8ee3eef).
- 2026-11-27 · P0 · Places: 8 divisions, 64 districts, 495 upazilas, 14 Chattogram metropolitan thanas (EN + BN, centres, neighbours); `docs/data-licences.md` (0df45cd, 7c44473).
- 2026-11-27 · P0 · CI on every push, manual "Android local build" workflow, Dependabot (f2abb20); decode-uri-component DoS patched (2d967ce).
- 2026-11-27 · P0 · Web shell 477 KB gzip (budget 600 KB) with a bundle/phone-number check, `vercel.json` with CSP and security headers (3ce1db5).
- 2026-11-27 · P0 · Sentry on web and Android with a phone/personal-data scrubber (c0d79fc).
- 2026-11-27 · P0 · Design-system components, Better Auth client, gates G1–G7 skeleton, sign-in and empty Home (c9f1258).
- 2026-11-27 · P0 · i18n: copy extracted from specs into `en.json` / `bn.json` (473 keys) (1002f0f).
- 2026-11-27 · P0 · Convex: full schema, Better Auth, access wrappers, error codes, settings reader + seed (4da5609).
- 2026-11-27 · P0 · Repository set up: docs moved to `docs/`, Expo SDK 57 scaffold, app identity (`app.config.ts`,
  `eas.json`), native modules, NativeWind v4 design tokens, brand assets (DEP-11), ADR-023 (udvasito.com).
