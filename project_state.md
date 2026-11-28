# project_state.md — agent memory (for Claude Code only)

> Read this FIRST in every new context window, after CLAUDE.md. Keep it short and current.
> Update it at the end of every slice. The human guide is `for_me.md`.

Last updated: 2026-11-27 (Fri) — branch `p1/walking-skeleton`

## 1. Where things are
- Repo root: `E:\ROUGH CODING\Udvasito new` → GitHub `udvasitobd/udvasito-main` (PUBLIC). Push works via the developer's
  personal GitHub (collaborator, `gh` logged in as the developer). Default branch `main`; `staging` = integration.
  Repo-local git identity = developer's GitHub login + `…@users.noreply.github.com` (keeps personal email private).
- Docs in `docs/` (vision, user-stories, grilling-notes, PRD, ADRs, specs, roadmap, build-prompts, brand-kit.md,
  questions.md). `CLAUDE.md` at root. Large files (brand-kit zip, 2 promo mp4s) in `_local/` (git-ignored).
- Brand assets already copied: `assets/` (icon, adaptive, splash-icon, splash, notification-icon, logo/*.svg),
  `public/` (favicons, icon-192/512, apple-touch, og-image). Adaptive bg `#C1121F`; logo red `#E63946` = mark only.
- Machine: Windows 11, Node 25.6.1, npm 11.8, git 2.53, gh 2.97. No Java/Android SDK (native builds via EAS cloud
  or a GitHub Actions workflow). Bash heredocs with quotes in them can break → use the Write tool for files.

## 2. Accounts (all owned by the team Gmail udvasitobd@gmail.com — NEVER a card)
| Service | State |
|---|---|
| GitHub repo udvasitobd/udvasito-main | public; `main` + `staging` pushed (0273b96) |
| Convex team `udvasitobd` | All EU (Ireland, eu-west-1). **udvasito-staging**: dev `wry-tern-774` (`npx convex dev`), prod = **STAGING** `outstanding-grasshopper-711` (created 2026-11-27, never deployed). **udvasito-prod** (created 2026-11-27): prod = **PRODUCTION** `striped-starling-176` (never deployed), unused dev `silent-elk-966`. CLI reaches any of them with `--deployment <name>` (no re-linking). |
| Convex CLI | named account `udvasito` selected for this folder only (`~/.convex/config.json` directories map); developer's personal login kept as default account `personal` — never overwrite it |
| Convex env vars (names only) | dev wry-tern: BETTER_AUTH_SECRET, SITE_URL=http://localhost:8081, PASSWORD_SIGNIN=true, GOOGLE_CLIENT_ID (staging client). staging outstanding-grasshopper: BETTER_AUTH_SECRET (own random), SITE_URL=https://staging.udvasito.com, PASSWORD_SIGNIN=true, GOOGLE_CLIENT_ID (staging client). production striped-starling: BETTER_AUTH_SECRET (own random), SITE_URL=https://udvasito.com, GOOGLE_CLIENT_ID (production client); NEVER PASSWORD_SIGNIN. GOOGLE_CLIENT_SECRET set on all three by the developer (step 3b ✅ 2026-11-27; old unseen secrets LH4C + zrYy deleted, checked). APP_ENV removed 2026-11-27. |
| Expo | account `udvasitos-team`; project **udvasito** id `3e11ddf3-c86f-4d08-8d22-433104d9a7b2` (public) hard-coded in app.config.ts (no EAS_PROJECT_ID env any more). eas-cli not installed (use `npx eas-cli@latest`); this PC is logged in (owner of udvasitos-team). EXPO_TOKEN GitHub secret = for_me step 5. **EAS env vars (plain text, public values)**: EXPO_PUBLIC_SENTRY_DSN (dev+preview+prod); EXPO_PUBLIC_CONVEX_URL / _SITE_URL = outstanding-grasshopper-711 (development+preview) and striped-starling-176 (production). GOOGLE_SERVICES_JSON (file, **secret**) on production + preview + development (step 6A ✅; app.config.ts reads it as `android.googleServicesFile`). Android credentials for `org.udvasito.app` (step 6 ✅ 2026-11-27, checked on expo.dev): default build credentials "AhFr_HynUR" = EAS-generated upload keystore (JKS; full SHA-1/SHA-256 fingerprints on the expo.dev credentials page — SHA-256 needed later for `/.well-known/assetlinks.json` App Links); FCM V1 service-account key for udvasito-516006 (firebase-adminsdk-fbsvc). No Play Store submit key (not needed: APK sideload). CHECK at build #1: a GitHub `eas build --local` may not receive **secret**-visibility vars (secret = only on EAS servers) → if the APK lacks FCM, ask the developer to switch GOOGLE_SERVICES_JSON to "Sensitive". |
| Cloudflare (replaces Vercel — ADR-024, developer decision 2026-11-27: Vercel sign-in kept failing) | account id `f42c84983e6504fa03b9cc628c64ce4f` (Google sign-in, team Gmail, Free). Zone **udvasito.com** Free plan, **pending** until Namecheap nameservers = `jen.ns.cloudflare.com` + `marvin.ns.cloudflare.com` (were dns1/dns2.registrar-servers.com; DNSSEC must stay off). DNS kept (all DNS-only): Namecheap Private Email = MX mx1/mx2.privateemail.com (10), TXT SPF `v=spf1 include:spf.privateemail.com ~all`, CNAME autoconfig/autodiscover → privateemail.com, SRV _autodiscover._tcp. Deleted: parking A @ 162.255.119.57 + www CNAME parkingpage.namecheap. AI-crawler settings left at default. **Workers Builds CONNECTED 2026-11-28** (developer said yes; GitHub app "Cloudflare Workers and Pages" installed on udvasitobd — I clicked "Only select repositories" but sudo interrupted, so repo access is unverified: the account has only udvasito-main, check at github.com/settings/installations/186644249 when convenient). **Worker `udvasito-web-staging` LIVE**: production branch `staging`, non-prod branch builds ON (preview versions), build vars EXPO_PUBLIC_APP_ENV=staging, EXPO_PUBLIC_CONVEX_URL/SITE_URL = outstanding-grasshopper-711, WRANGLER_SEND_METRICS=false, NODE_VERSION=24 (no EXPO_PUBLIC_SENTRY_DSN yet); API token "udvasito-web-staging build token" auto-made. First build of main was cancelled (main has no web setup). https://staging.udvasito.com → 200, security headers ✅, /_expo immutable (single Cache-Control) ✅, http→https 301 ✅. Cloudflare's SPA fallback answers EVERY unmatched non-/api path with index.html 200 (even Sec-Fetch-Mode no-cors) — accepted, worker/index.ts comment says so. Workers Logs: `observability.enabled=false` in wrangler.jsonc (dashboard tab froze, could not see the toggle). Production Worker `udvasito-web` NOT created (ask before first prod deploy). Original plan: `udvasito-web-staging` (branch staging, build `npm run build:web`, deploy `npx wrangler@4.161.0 deploy --env staging`, non-prod `npx wrangler@4.161.0 versions upload --env staging`) and `udvasito-web` (branch main, build `npx convex deploy --cmd-url-env-var-name EXPO_PUBLIC_CONVEX_URL --cmd "npm run build:web"`, deploy `npx wrangler@4.161.0 deploy --env=""`, build secret CONVEX_DEPLOY_KEY pasted by user; ASK before first prod deploy). Build vars per Worker: EXPO_PUBLIC_CONVEX_URL, EXPO_PUBLIC_CONVEX_SITE_URL, EXPO_PUBLIC_SENTRY_DSN, EXPO_PUBLIC_APP_ENV, WRANGLER_SEND_METRICS=false. Dashboard DONE 2026-11-27: Redirect Rule "www to udvasito.com (ADR-024)" `https://www.udvasito.com/*` → `https://udvasito.com/${1}` 301, query kept; proxied A www → 192.0.2.1 (placeholder, never delete); Always Use HTTPS ON; min TLS 1.2. curl: http://www → https://www → https://udvasito.com/<path>?<query> ✅. www is NOT a Worker route any more. TODO: Workers Logs OFF when the Workers exist. Verify `_headers` with curl (Cache-Control on /_expo not doubled). |
| Domain udvasito.com | Namecheap (only paid item). ADR-023: used everywhere; staging = staging.udvasito.com |
| Google Cloud | project **UDVASITO** id `udvasito-516006` (no billing, no trial; ToS accepted with user OK 2026-11-27, also OK for Firebase + AI Studio ToS). Auth Platform: External, **Testing**, test user = team Gmail. Client **"UDVASITO staging (dev + staging)"** Web, id `436072889616-ab3hftd03esdskdkbtkaq1rv4qm347qo.apps.googleusercontent.com` (public) → set as GOOGLE_CLIENT_ID on dev. Redirect URI: `https://wry-tern-774.eu-west-1.convex.site/api/auth/callback/google` (EU site URLs carry `.eu-west-1.`!). Second redirect URI (staging): `https://outstanding-grasshopper-711.eu-west-1.convex.site/api/auth/callback/google`. Secret: user adds a new one → dev + staging Convex (for_me step 3b A); first secret ****LH4C unseen → user deletes. Client **"UDVASITO production"** id `436072889616-etaru4u7pkdf2gloro855hj4241hj4bu.apps.googleusercontent.com` → GOOGLE_CLIENT_ID on striped-starling; redirect `https://striped-starling-176.eu-west-1.convex.site/api/auth/callback/google`; first secret ****zrYy unseen → user replaces (step 3b B). TODO: Branding home/privacy/terms links once those pages exist; publish to production before pilot (ask user). |
| Sentry | org **udvasito** (EU data region, `ingest.de.sentry.io`), project **udvasito-app** (React Native), Developer plan (14-day trial then free, no card). Org privacy: Enhanced Privacy ON, Require Data Scrubber + Default Scrubbers ON, Prevent Storing IP ON, Shared Issues OFF, Join Requests OFF; Global Sensitive Fields phone/phoneNumber/mobile/msisdn/reasonText; advanced rules: [Mask] BD-mobile regex (Latin+Bangla digits) from $string, [Mask] email from $string, [Remove] anything from $user.geo.** (Sentry geo-locates the connection even with infer_ip=never). DSN is public → EAS env + Cloudflare build vars (not in git). Tested 2026-11-27 from localhost: phones arrive as [phone], email masked, geo null; test issues resolved. No backend (Convex) DSN yet — SENTRY_DSN unused. |
| Cloudinary | cloud name **udvasito** (renamed from random before any upload), Free plan $0 / 25 credits, signed up with Google (team Gmail). CLOUDINARY_CLOUD_NAME set on dev, staging, production. CLOUDINARY_API_KEY + _SECRET set on all three by the developer (step 3c ✅ 2026-11-27, names checked). TODO when share cards are built: Security → strict transformations (signed URLs only) so nobody burns our credits; folders `staging/` and `prod/` (1 product environment on Free). |
| Firebase | added to Cloud project udvasito-516006 (irreversible link; Spark, no billing), **Google Analytics OFF** (ADR-018). Android app `org.udvasito.app` ("UDVASITO Android"). FCM API V1 enabled, legacy disabled. google-services.json downloaded to `C:\Users\User\Downloads\udvasito-google-services.json` (checked: project + package only, key not read) → developer uploads as EAS file var (step 6A) and deletes it. Web push stays VAPID (not Firebase). |
| Telegram bots, Gemini | not yet |

Convex region note: dashboard shows "30% regional surcharge" for EU; pricing page says included amounts are shared
across regions and Free plan has no metered billing → kept ADR T-2 (EU-Dublin). Region can't be changed later.

## 3. Key versions (pin these)
- expo ~57.0.34, react-native 0.86.3, react 19.2.3, expo-router ~57.0.32, reanimated 4.5.1, worklets 0.10.1, TS ~6.0.3
  (TS 6: `types` defaults to [] → scripts/ and convex/ tsconfigs set `"types": ["node"]`)
- nativewind 4.2.7 (+ react-native-css-interop 0.2.7, tailwindcss 3.4.19)
- convex ^1.51, @convex-dev/better-auth 0.13.1, better-auth 1.7.28, @better-auth/expo 1.7.28 (peer: expo-network,
  expo-linking, expo-web-browser, expo-constants, expo-secure-store — expo-network ~57.0.3 installed for it)
- zod 4.6.7, vitest 4.1, convex-test 0.0.75, @types/node ^22 (dev)
- Better Auth: convex/auth.ts `createClient<DataModel>(components.betterAuth)`, `betterAuth` from `better-auth/minimal`,
  plugins `[expo(), convex({authConfig}), crossDomain({siteUrl})]`; client: `convexClient()` + (web ? `crossDomainClient()`
  : `expoClient({scheme:'udvasito', storagePrefix:'udvasito', storage: SecureStore})`). Native Google sign-in:
  `authClient.signIn.social({provider:'google', callbackURL:'/'})` then navigate yourself (no auto-redirect on native).
  Google redirect URI = `<CONVEX_SITE_URL>/api/auth/callback/google`.

## 4. Decisions made in this build (not in docs)
- Routes in root `app/`; `@/*` → `./src/*`. Light theme only. Template extras removed.
- Settings: 51 rows of §5.2 → **61 keys** (grouped rows split). `convex/rules/settings.ts` = defaults + zod ranges;
  `_lib/settings.ts` = reader (falls back to default on missing/invalid). Seed inserts missing keys only.
  Seed sets min/latestAppVersion = "0.1.0" (roadmap P1 go-live step 5), demoAreaEnabled staging=true/prod=false,
  fallbackContactPhone "" (super-admin sets it), apkUrl/apkSha256 "" (until first GitHub Release),
  ai.models `gemini-flash-lite-latest` / `gemini-flash-latest` (verify in spike S4), contactEmail = team Gmail.
- Added `internal.admin.ops.setSetting` (audited `setting_changed`) for the go-live steps before the settings screen exists.
  `ops.closeRequest` comes with requests in P1.
- Auth wrappers: no profile → ERR_CONSENT_REQUIRED; queries allow `frozen` (read-only), mutations only `active`;
  role rank member<volunteer<admin<superadmin; `support.helpline` = any signed-in person (under-18/status screens too).
- `/public/helpline` rate-limit key = SHA-256 of IP (IP never stored), via `convex/_lib/network.ts`: cf-connecting-ip,
  else LAST x-forwarded-for entry; never x-real-ip. Probed 2026-11-27: Cloudflare refuses a client-sent cf-connecting-ip
  (error 1000) and replaces x-forwarded-for. Returns `{phone: null}` until the number is set.
- Auth hardening (trustedOrigins, password sign-in) follows `environmentFromSiteUrl(SITE_URL)`: only an exact staging
  host (staging.udvasito.com, localhost) relaxes it; `*.workers.dev` / `*.vercel.app` are NOT staging. TODO with the staging Worker: add the
  preview origin(s) to trustedOrigins + CORS deliberately (or keep previews signed-out only).
- Sentry scrubber is default-deny (every top-level field except STRUCTURAL_FIELDS is scrubbed).
- `ops.setSetting` runs `crossCheck` (waveSizes ≥ waveCount; usageWarnPct < usageCriticalPct). Last-admin guard counts
  OTHER active real admins. `revealPhone` checks VAL-18 with `checkReason` and stores the trimmed reason.
- i18n keys for validation messages: `validation.VAL-xx.<case>` (cases: empty/short/long/chars/invalid/tooOld/range/...).
- Test harness: `convex/test.setup.ts` (`makeT`, `signIn`, `insertProfile`); glob uses array + negations (extglob fails).

## 5. Phase status
- P0 🟦 started 2026-11-27 (user: "no need to tension about the dates"). **PR #1** `p0/foundations` → `staging`
  opened 2026-11-27 (part 1: everything not waiting on accounts/phones). Code review (high) found 10 problems → all
  fixed in the "P0: review fixes" commit (see Resume here). PR NOT merged; waits for the developer's OK.
- P0 build-prompt items: 1–11, 13, 14 ✅ (Home = empty Home; CI ✅). 12 web hosting = Cloudflare Workers (ADR-024): code ✅ (wrangler.jsonc, worker/, public/_headers, serve-dist), Workers ⏳ (nameservers + Workers Builds).
- P0 DoD: Google sign-in ⏳ (client made; secret = user step 3b; then test web + Android dev build; staging + prod);
  language switch ✅ (e2e) / 2 GB phone render ⏳ phones; seed-places + count test ✅; locked-screen push ⏳ (FCM +
  build #1); Lighthouse ≤ 3 s ⏳ (Cloudflare staging); spikes ⏳ (docs/spikes.md).
- Commits: 0273b96 setup · 4da5609 Convex core · 1002f0f i18n · c9f1258 design system/sign-in/Home · c0d79fc Sentry ·
  3ce1db5 web shell/vercel.json · 2d967ce decode-uri patch · f2abb20 CI · 0df45cd/7c44473 places · 8ee3eef hospitals ·
  45908e7 seed-staging + SITE_URL env · 2c1a786 e2e · 7fb8767 docs · a38a7fa Google OAuth notes + spikes.

## 6. Rules I must not forget (short)
- PR workflow: feature branch → PR into `staging`. **Never merge a PR before the code-review + fix phase** (user order).
- Never commit secrets; never put the developer's personal email anywhere external. Secrets never printed.
- Stop & ask: new dependency not in ADRs/specs, prod schema change, rule number/copy/visibility change, skipping a test,
  isolation changes, prod deploy, EAS native build (15/month).
- Every string via t(); exact copy from specs; rule numbers from settings; rules/* pure TS + 100 % tests.

## Resume here (2026-11-27, after the docs commit following 2c1a786)
- P0 item 9 DONE: places dataset (data/sources/places pinned + data/places.json via `npm run places:build`), seed-places
  (loaded on dev deployment wry-tern: 581 places), import-hospitals (header-only data/hospitals.csv), seed-staging
  (232 fake donors on dev), test:e2e (5 tests, Chrome channel, scripts/serve-dist.ts mimics vercel.json), dataset test.
- Environment detection: convex/rules/environment.ts from SITE_URL (dev = http://localhost:8081). Staging is the PROD
  deployment of udvasito-staging, so `--prod` ≠ production. seedSettings no longer takes an environment arg.
- Lessons: `convex run` JSON args must stay < ~20 K chars (Windows); `expo serve` has no SPA fallback; Playwright uses
  installed Chrome (no browser download); stop the old dev server before e2e (port 8081).
- Questions open: Q-004, Q-005 (copy), Q-006, Q-007 offline-file design. Akbar Shah thana needs a centre (member 2).
- Google OAuth client DONE (see §2) except the secret (user). docs/spikes.md written (all 4 wait on accounts/phones).
- 2026-11-27 later: review fixes 205a0f1 (+ changelog 2db9b43), PR comment posted, CI green. Created Convex staging +
  production deployments, Expo project (id in app.config.ts), Google production client; staging/prod env vars set.
- 2026-11-27: PR #1 MERGED into staging (aa6dac5, developer OK). Staging Convex deployed (`npx convex deploy -y`, targets
  outstanding-grasshopper-711 because CONVEX_DEPLOYMENT=dev:wry-tern-774 is in udvasito-staging) + seeded: settings 61
  (staging values, pilotDistrictIds filled), places 581, hospitals 0, practice donors 232.
- Google sign-in TESTED on localhost:8081 → dev: account chooser → consent → /home; reload keeps session; Sign out →
  /sign-in; no console errors. The consent screen says "Sign in to wry-tern-774.eu-west-1.convex.site" — ADR-023 wants
  udvasito.com: TODO with Vercel = rewrite `/api/auth/*` on udvasito.com (and staging.udvasito.com) to the Convex site,
  point Better Auth baseURL + Google redirect URIs there, and fill Branding (name, logo, privacy/terms links).
- Branch p0/part-2 (open): generated api.d.ts (network module), clearer seed-places label, scrubber fix (contexts and
  frame source lines kept in shape — the live Sentry test showed `react_native_context` arriving as "[removed]"
  because SENSITIVE_KEY's `text` matches "con*text*"; Sentry discarded it as invalid data).
- 2026-11-27 (developer: "yes go ahead with all three"): Sentry, Cloudinary, Firebase set up — details in §2.
- 2026-11-27: steps 3c + 6 ✅ (checked); secret files deleted (user OK). **Switched hosting to Cloudflare** (ADR-024):
  `vercel.json` → `wrangler.jsonc` (2 Workers via `env.staging`), `worker/index.ts` (/api/auth/* pass-through to
  CONVEX_SITE_URL, drops cf-*/x-forwarded-*/x-real-ip, redirect manual, logs nothing; else 404), `public/_headers`
  (CSP etc., parser + limits test in scripts/lib/headers-file.ts), serve-dist reads dist/_headers + SPA fallback.
  `wrangler deploy --dry-run` OK for both envs. Wrangler NOT a devDependency: pinned `npx wrangler@4.161.0`.
  All docs switched (CLAUDE.md, ADRs 1.4, roadmap RB-3, specs, PRD, README, spikes S3, brand-kit). Promo videos show
  **www.udvasito.com** (developer checked 2026-11-27 — brand-kit was wrong) → www MUST redirect to udvasito.com.
- 2026-11-27: step 5 ✅ (Expo robot user `github-actions`, role Developer, on org udvasitos-team; its token is the
  GitHub repo secret EXPO_TOKEN — name checked). Namecheap contact verification ✅ (developer). Cloudflare zone
  udvasito.com **ACTIVE** 2026-11-27 ("Your domain is now protected by Cloudflare").
- for_me.md is a LIVE CHECKLIST (developer's wish): top = "👉 Do now", then "✅ Done" (move items there the moment
  the developer says done / I verify), then "⏳ Later". Keep it current in every commit.
- 2026-11-27: PR #2 MERGED (squash 3b95976) after review + fixes + CI green (developer: "merge it once the checks pass").
  Test phone: iQOO Z10 Turbo Pro (Vivo family). Developer: "do the recommendations" for open questions → Q-004 A,
  Q-006 keep all, Q-007 offline file confirmed, Q-005 2/4/7 stay (member 3 writes 1/3/5/6); new Q-008 (P1 on staging
  alongside P0 leftovers), Q-009 (no legal drafts → content:build refuses without them; consent tested by tests only),
  Q-010 (need 2 more phones). Developer: "start working on next phase" → **P1 started, branch `p1/walking-skeleton`**.
- P1 PLAN (build-prompts §2 order, vertical slices, commit `P1: …`, PRs into staging, review + fix before merge):
  rules first (6: eligibility/compatibility/limits, pure + 100 % tests) → 2 sign-in/helpline → 3 onboarding 18+ + ?c=
  → 5 shells (M01/M10/M06/O05/O06/P08/P09) → 1 consent + legal renderer (content waits for DEP-02) → 4 verification
  (in-person now; Telegram when the bots exist) → 7 donor setup/tab → 8 request form + place picker → 9 matching v1 +
  Expo push → 10 inbox → 11 accept/decline → 12 contact exchange → 13 status/close/my requests → 14 30-s helpline →
  15 rate limits. Human: Cloudflare GitHub app (asked in for_me), Telegram bots (RB-5), EAS build (ask), phones, DEP-01/02.
- OLD NEXT (P0 leftovers): (1)+(2) DONE (nameservers switched by me after the developer's sign-in, DNSSEC off; step 5 done).
  (3) PR #2 p0/part-2 → staging: code review DONE (5 findings) + fixes DONE 2026-11-27 (Worker serves the app to crawlers via ASSETS binding + `routeFor`, 404 for missing files, security headers on every Worker response, serve-dist uses the same rule + no crash on broken URLs; IP finding: Better Auth limiter is OFF on Convex — probe 401×5 — noted in worker comment + spikes S3). WAITING: developer says "merge"; (4) Workers Builds (ask before installing the Cloudflare GitHub app) + staging Worker + staging.udvasito.com;
  spike S3 (Better Auth baseURL, Google redirect URIs on udvasito.com); (5) Telegram bot, Gemini key, CONVEX_DEPLOY_KEY
  (staging) for CI; spikes S1, S2, S4; EAS build #1 (ask first). Never merge a PR before review + fixes.
- P1 PROGRESS (branch `p1/walking-skeleton`, pushed; no PR yet — open one into staging when the loop works, then
  review + fix before merge):
  ✅ 6 rules (220845d) · ✅ completeOnboarding + consents.accept + legal header check (6ed94a0) · ✅ 1+3 welcome/consent,
  About you, /privacy /terms, ?c= capture (45f1582, 9fefdd0) · ✅ 5 shells: tab bar (Home, More), More, Settings,
  account-status, update-required, profiles.updateLanguage + LanguageSync (9a6079b) · ✅ 2 sign-in was done in P0.
  ⏭ /download (SCR-P08) moved to the go-live slice: needs the APK release; settings has no size/date fields — decide
  then (GitHub release API vs new settings keys → ask). Home sections join with their features.
  ✅ 4a in-person verification startInPerson/lookupInPerson/confirmInPerson + SCR-O04 + SCR-V06 (37b4e6d) · ✅ 4b
  Telegram start/webhook/handleMessage/acceptMismatch/registerWebhook + SCR-O04 Telegram + mismatch cards (b51c595).
  All verification goes through convex/_lib/verification.ts markPhoneVerified(ctx, profile, via, {verifierId, phone})
  — slice 7 adds the donor `live` recompute THERE. Telegram is hidden in the app until settings.verification.telegram
  && telegramBot ≠ ''. Bot replies: convex/_lib/copy.ts bilingual(key) from en/bn.json (JSON import, bundles fine).
  Dev deployment wry-tern-774 has the code; webhook answers 401 without the secret (checked).
  ✅ 7 donor server: donors.upsert/getMine/setAvailability, places.list (parentId), rules/donor.ts notLiveReasons,
  refreshDonorLive in markPhoneVerified, firstLiveAt (bb6220a) · ✅ 7 donor UI: /donor/setup 4 steps + Donate tab +
  Home donor cards, components BloodGroupPicker/ChoiceGroup/Select/SwitchRow, per-account device draft (cleared on
  finish + sign-out), "use my location once" matched on the device, Q-018 copy (c0df3ae). Checked in Chrome via a
  throwaway app/zzpreview.tsx (deleted): pickers with dev places, search "kot" → Kotwali, every step's errors, Bangla.
  Found + fixed: quick taps lost checklist ticks (stale closure) → setup form updates are functional (f) => ….
  LEFT FOR LATER SLICES: notification prompt after donor setup (slice 9 push), Requests-for-you + badge (slice 10),
  Paused (out of P1), alert settings D05 / hide profile / history (later phases). Matching must re-check
  notLiveReasons per candidate (age + consent drift), not trust the stored live flag alone.
  ✅ 8 request server: rules/request.ts (VAL-04…11, needed-by chips, urgency, slug, clientId), requests.create
  (by_clientId idempotency → {requestId, existing}; another account's clientId → ERR_FORBIDDEN; S-22 open/monthly
  counts by_requester_status + _creationTime ≥ dhakaMonthStart; contactPhoneVerified via visibility.isOwnVerifiedPhone;
  hospital → its own place ids + rounded point; else thana centre), hospitals.search (search_all; '' + districtId →
  by_district list), _lib/places.checkPlaceChain shared with donors (2dfb014) · ✅ 8 request UI: /request/new form path
  (BloodGroupPicker + any/not_sure, whole blood/platelets + dengue tick, Stepper, PlacePicker, needed-by chips + Pick
  date/time, contact pre-filled, More details, Check and post summary, error summary, limit banners), Home hero +
  dengue link, TimeField, useNow, newClientId, useLocateArea moved to features/places (returns point, kept on device
  only — donor setup passes only ids so the draft never holds it). Q-019 copy + decisions. Checked in Chrome via a
  throwaway app/zz-request.tsx (deleted): errors, 3 quick taps = 3 bags (stepper is step-based), district → thana →
  place, Bangla digits/date/time, search cmch → no matches (no hospitals until DEP-01), Post reaches the server (925b2db).
  AFTER POST: goes to /home with Sent until SCR-M03 (/request/[id], slice 13) exists — change it then.
  convex-test creation times only move forward → fake-time tests must start at the earliest time.
  ✅ 9 matching v1 + NTF-01 (3dfcf84) · ✅ push on Android (c24453e) · ✅ 10 inbox/markOpened (c1e3a40) · ✅ 11+12
  accept/decline, slots, contact reveals, SCR-D03/D04 (b55f0b7, 9bdf011) · ✅ 13 getForOwner/listMine/close + SCR-M03/
  M04 + Home cards + useLiveQuery 15 s fallback (406203b, fdea762, 6f32aea) · ✅ 14 volunteerHotline at S-13 →
  fallbackShown + "no donors yet" with _lib/bloodBanks (4743b1c, b0d12c5) · ✅ 15 S-25 sign-up limit (f14ed09).
  ALL 15 SLICES BUILT 2026-11-28 (769 tests). S-22 was already in requests.create; S-23/S-24/S-37 are P2.
  S-25 key = Better Auth session.ipAddress (auth.ts advanced.ipAddress reads cf-connecting-ip first), hashed via
  _lib/network.addressKey; session without an address → not limited. Q-022…Q-025 wait for the developer.
  SCR-M03 body lives in src/features/requests/MyRequestView.tsx (pure, takes `view` + `now`) so previews can render it.
  PR #3 p1/walking-skeleton → staging OPENED 2026-11-28. Code review (high) → 6 findings, ALL FIXED (2b44f89 stale
  health consent → _lib/donors.isLiveNow in matching + accept; 257890f push.unregister in every state; 1ea789c
  hospitals.search by caller area, Q-026; bf92eeb inbox drops hiddenByModerator; ceb89b4 placeText dropped with a
  hospital; e5edd27 pushed alerts 'sent'). Review comment posted on the PR. CI bundle check had failed (671 KB):
  fixed 84c4f7f (556 KB). Team doc Bangla tab: 15 rows added (rev 2).
  2026-11-28 developer: "merge it and yes. Q-022-Q026, your recommendation" → PR #3 MERGED (707a767), Convex staging
  deployed (+ index phoneVerifications.by_external); Workers Builds connected; PR #4 Q-022 expo-clipboard + Q-023
  NTF-09 to confirmed donors on not_needed (body key notifications.NTF-09.body.notNeeded) MERGED (62bdf61; review
  inline, no findings — background review agent died on usage limit); PR #5 wrangler observability off + worker
  comment MERGED (ec71b0f). staging.udvasito.com LIVE, sign-in page renders, no console errors. EAS preview env:
  EXPO_PUBLIC_CONVEX_URL/SITE_URL = staging, SENTRY_DSN, GOOGLE_SERVICES_JSON (APP_ENV comes from eas.json).
  Donor live rule needs phoneVerified → 3-phone run needs the Telegram test bot (for_me 👉 3).
  for_me 👉 4 = helpline number (developer types own number via dashboard → admin/ops:setSetting).
  eas.json development + preview: SENTRY_DISABLE_AUTO_UPLOAD=true (no SENTRY_AUTH_TOKEN; the Gradle source-map upload
  would fail the build). Production profile still uploads → needs SENTRY_AUTH_TOKEN (EAS secret, developer pastes) or
  the same switch before build #3. Developer said "yes build" 2026-11-28 for build #1.
  EAS build #1 (preview, 2d32bf24) ERRORED at "Configure expo-updates": runtime version mismatch — the fingerprint
  hashed the GOOGLE_SERVICES_JSON file secret (../eas-environment-secrets/<hash>), which exists only on EAS. Fix:
  fingerprint.config.js ignorePaths ['../eas-environment-secrets/**'] (proved locally: file present + skip = same hash
  d48c5a7… as no file). Retry = budget row 2 "Reserve — fix a native config mistake from build 1" (roadmap §2.4).
  Removed my duplicate EAS preview var EXPO_PUBLIC_APP_ENV (eas.json profile env already sets it).
  Lesson: decompress EAS log files (gzip) before reading; Node needs C:/ paths, not /c/.
  EAS build #2 (preview, 2c7bb228-48f2-4e3e-a348-e2e6d675ec05, commit f7fce85) FINISHED in 23 min: 0.1.0, versionCode 1,
  runtime d48c5a7b… (= local), channel preview. Builds used this month: 2 of 15 (quota reset date still unknown →
  check expo.dev billing page). Developer installed it on the iQOO Z10 Turbo Pro (2026-11-28): native Google sign-in
  WORKS (spike S3 sign-in ✅ on Android). It then hit ERR_CONSENT_REQUIRED on the root error screen (no legal files →
  no /welcome) → fixed by the legal draft (branch p1/legal-draft) + EAS Update to channel `preview` (JS only, same
  runtime d48c5a7…). Push on the phone still untested. The phone screenshot `issue 1.jpg` sits untracked in the repo
  root — never commit it.
  NEXT (was): ask the developer for EAS build #1 (preview APK, 1 of 15/month); Telegram bot wiring when the token is in;
  then the 3-phone DoD run; Sentry DSN as a Cloudflare build var (public value) when the dashboard tab works.
- TEAM TO-DO DOC (Claude Docs, made 2026-11-27): https://claude.ai/artifact/PJT9GL12qaHMyQ63Tw2L6v — project
  b498ce34-9880-4845-8fc5-54431dd450cb; tab "To-do" 1e0a4b77-629a (body 8e30bb71-e1ec), tab "Bangla to check"
  fc1b86ea-accf (body 054015cc-eff6, table mnm1hfaezn3.358: Screen | English | Claude's Bangla | Your fix | Key;
  81 rows after 2026-11-28 — Q-020/Q-021 lines, date-fns wording, proposed Q-023 line; bookmark rev 2). Edit it ONLY via the
  Claude Docs connector (load the docs skill, then read with sinceRev before writing — the team edits it). When a job is
  handed over, tick it there + Status dropdown in the "Before the first campus drive" table. Read "Your fix" cells
  and copy fixes into specs/en/bn (then copy:extract). TEAM NUMBERS: member 1 = developer; 2 recruitment; 3 Bangla/FAQ/QA
  (reviews ALL Bangla); 4 operations/data protection (admin, legal); 5 presentation. (Earlier notes said "member 1"
  for Bangla review — fixed to member 3 everywhere.)
  TODO for me from the doc: internal.admin.ops op to create/activate campaigns (none exists; member 2 sends codes);
  export the 15 city thanas for member 2.
- convex-test: the fake clock moves 1 ms per write → compare with returned expiresAt / loose bounds, not exact NOW.
  Stub fetch with vi.stubGlobal('fetch', …) and set process.env in beforeEach; t.fetch('/path') hits http.ts routes.
- Telegram bot go-live (human + me): developer makes the bot in BotFather (staging bot first) and pastes the token as
  TELEGRAM_BOT_TOKEN in the Convex dashboard; I generate TELEGRAM_WEBHOOK_SECRET and pipe it in unprinted
  (node crypto → `npx convex env set` via stdin); then `npx convex run telegram:registerWebhook`; then set
  settings.verification {telegram: true, telegramBot: '<name>'} via internal.admin.ops.setSetting.
- Legal files: DRAFT IN THE REPO since 2026-11-28 (developer: "write the legal texts by yourselfs, a law teacher will
  review that before final publish" → Q-009 update). src/content/legal/{privacy,terms}.{en,bn}.md, version
  2026-11-28-pilot, effective 2026-11-28; written ONLY from what the code/specs really do (specs §5, PRD §3.3/§5.9/§6).
  /src/content/legal/ is NO LONGER in .git/info/exclude. Production is blocked until the law teacher's read (DEP-02a,
  roadmap go-live step 0) — then set `reviewedBy` in the front matter. Any change to what we collect/keep/show
  (new field, retention, a provider) MUST update these 4 files in the same PR; a meaning change needs a new
  version = settings.consentVersion (everyone re-consents). The notice PROMISES things not built yet: retention crons
  (PRD §5.9: 30-day request scrub, slip photo 7 days, reveals/audit/consents 12 months, AI logs 30 days, push tokens 60
  days) and F-603 data rights (copy/delete within 30 days) → must exist before the public launch (T0).
  Legal text adds ~18 KB gzip to the web shell (574/600 KB on 2026-11-28) → lazy-load it if the budget gets tight.
- Root ErrorBoundary renders OUTSIDE RootLayout's providers → it now reads font state itself (src/lib/fonts.ts
  appFontsLoaded via expo-font isLoaded). Without it the iQOO system font mis-measured bold text ("Try again" off-centre).
- Local checks without signing in: temporary re-export routes (e.g. app/zzpreview/…) + `npx tsx scripts/serve-dist.ts`
  (8081). serve-dist forbids iframes; for a 390 px view use a frame-friendly server from the scratchpad. `pkill` does
  NOT exist in Git Bash here — stop node servers with PowerShell Stop-Process (match the command line).
- Unit tests (vitest "unit" project) resolve @/ and @convex/ aliases (vitest.config.mts).
- BUNDLE: Metro does NOT tree-shake. A bare `zod` import ships all locales (~100 KB gzip), bare `date-fns` ships all
  ~300 functions. Lint now forbids zod in convex/rules (except settings.ts) and bare 'date-fns' in app code. To see
  what is in the shell: `npx expo export --platform web --source-maps --output-dir <scratch>` then decode the map
  (per-source byte count script was in the scratchpad as sizes.py — VLQ decode of `mappings`). bundle:check fails
  locally when app/zz-preview.tsx has a sample +880 number: move it aside before checking.
- House style = prettier --single-quote --print-width 120 (no config file); run it on new files before the check.
- Chrome screenshots can time out when the window is hidden: use read_page / javascript_tool to check the DOM.
- Previews: app/zz* and src/content/legal/ are in .git/info/exclude (can never be committed). The Chrome window is
  maximised, so resize_window does nothing: replace the page body with 360 px iframes via javascript_tool instead.
  Run the dev server WITHOUT CI=1 when adding files (CI mode has no file watching → "Unable to resolve").
- Typed routes: after adding a route file run `CI=1 npx expo start --web --port 8099` ~25 s to regenerate
  .expo/types/router.d.ts, otherwise tsc rejects the new href.
- Copy rule (developer, Q-014): specs English-only → write the plain Bangla translation; don't ask.
