# Changelog

All notable changes, newest first. One line per slice; phase prefix as in commit messages.

## Unreleased
- 2026-11-28 · P0 · **staging.udvasito.com is live**: Cloudflare Workers Builds deploys the `staging` branch (Worker `udvasito-web-staging`); request logging off in `wrangler.jsonc` (#5).
- 2026-11-28 · P1 · Decisions Q-022…Q-026: "No longer needed" also tells confirmed donors, with words that don't say it was arranged; copy-number button on Android (`expo-clipboard`) (#4).
- 2026-11-28 · P1 · Code-review fixes for PR #3: donors with an out-of-date health consent are no longer alerted or confirmed, sign-out stops push alerts in every account state, practice accounts see practice hospitals (Q-026), removed requests leave the donor inbox, a typed place name is dropped when a hospital is chosen, pushed alerts are marked sent; web shell back to 556 KB gzip (zod and the full date-fns were in the app) (84c4f7f…6373faa).
- 2026-11-28 · P1 · Sign-up limit S-25: at most 5 new profiles per network per hour (from settings), counted only when a profile is created; the helpline button appears under the "wait" message (f14ed09).
- 2026-11-28 · P1 · 30-second path: no "yes" within S-13 → the requester's screen shows the helpline (number fetched on tap); no matching donor at all → "No donors yet" at once, with the district's blood banks and a Call button each (4743b1c, b0d12c5).
- 2026-11-28 · P1 · My request (SCR-M03) and My requests tab (SCR-M04): live counts, a contact card per confirmed donor with the safety card, close as fulfilled or no longer needed (waiting donors are told), Home request cards, 15-second refresh when the live connection drops; headers keep the title readable on small phones (406203b, fdea762, 6f32aea).
- 2026-11-28 · P1 · Donor answers: Requests for you (SCR-D03) and the alert screen (SCR-D04) — accept with a quick self-check and call mode, decline with a reason; the first bags+1 donors are confirmed, the rest on standby; numbers shown only through contact reveals; NTF-04 to the requester (c1e3a40, b55f0b7, 9bdf011).
- 2026-11-28 · P1 · Push alerts on Android: channels, permission prompt, token registration, tap opens the alert (c24453e).
- 2026-11-28 · P1 · Matching v1: publishing a request alerts the nearest eligible exact-group donors in the district (wave 1) with an NTF-01 push that carries no names or numbers (3dfcf84).
- 2026-11-27 · P1 · Request blood (form path): blood group incl. "any" / "not sure", whole blood or platelets + dengue, bags, hospital search or "my place isn't in the list" (district → thana → name) with "use my current location" kept on the phone, needed by Now / Today / Tomorrow / a picked time, contact pre-filled; the server checks every field, a retried Post never makes a second request, open and monthly limits apply; Home "Need blood?" hero (2dfb014, 925b2db).
- 2026-11-27 · P1 · Become a donor: 4-step setup (blood group, area with search and "use my location once" matched on the phone, last donation and checklist, platelets, call mode, health-data consent), Donate tab with Available / Not available and when you can donate again, Home donor cards; a donor is live only with a verified number (bb6220a, c0df3ae).
- 2026-11-27 · P1 · Phone verification by Telegram: one-time bot link, `POST /telegram/webhook` (secret header, replay guard), own-contact check, "use the Telegram number" choice, bot replies in English + Bangla, one-command webhook setup (b51c595).
- 2026-11-27 · P1 · Phone verification in person: 6-character code, volunteer/admin check screen (first name + last 4 digits only), audit log, daily limit per verifier, one verified account per number (Q-015) (37b4e6d).
- 2026-11-27 · P1 · App shells: tab bar (sidebar on wide screens), Home, More, Settings with language sync, account-status and update-required screens (9a6079b).
- 2026-11-27 · P1 · Onboarding: welcome, consent and About-you steps, /privacy and /terms, invite-code capture, consent version check (6ed94a0, 45f1582, 9fefdd0).
- 2026-11-27 · P1 · Rules: eligibility, compatibility, limits and Dhaka date helpers as pure tested functions (220845d).
- 2026-11-27 · P0 · Code-review fixes for PR #2: crawlers and link previews get the app (not a 404) for app addresses, missing files stay 404, every Worker response carries the §7.4 security headers, local server follows the same rule and survives broken URLs; www.udvasito.com → udvasito.com Redirect Rule live.
- 2026-11-27 · P0 · Web hosting moves to Cloudflare Workers (ADR-024, replaces Vercel): `wrangler.jsonc` (production + staging Workers), `worker/index.ts` Google sign-in pass-through to Convex (tested), `public/_headers` (CSP and security headers, checked against Cloudflare limits), local server mimics Cloudflare for the smoke test; udvasito.com DNS moved to Cloudflare (email records kept); all docs updated; for_me.md is now a live checklist.
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
