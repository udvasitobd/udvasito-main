# project_state.md — agent memory (for Claude Code only)

> Read this FIRST in every new context window, after CLAUDE.md. Keep it short and current.
> Update it at the end of every slice. The human guide is `for_me.md`.

Last updated: 2026-11-27 (Fri) — branch `p0/foundations`

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
| Expo | account `udvasitos-team`; project **udvasito** id `3e11ddf3-c86f-4d08-8d22-433104d9a7b2` (public) hard-coded in app.config.ts (no EAS_PROJECT_ID env any more). eas-cli not installed (use `npx eas-cli@latest`); this PC is logged in (owner of udvasitos-team). EXPO_TOKEN GitHub secret = for_me step 5. **EAS env vars (plain text, public values)**: EXPO_PUBLIC_SENTRY_DSN (dev+preview+prod); EXPO_PUBLIC_CONVEX_URL / _SITE_URL = outstanding-grasshopper-711 (development+preview) and striped-starling-176 (production). GOOGLE_SERVICES_JSON (file, secret) = for_me step 6A. Android credentials (EAS-generated keystore + FCM V1 key) = for_me step 6C — none yet; `eas build --non-interactive` fails until then. |
| Vercel | developer creates it on 2026-11-28 (Sat) |
| Domain udvasito.com | Namecheap (only paid item). ADR-023: used everywhere; staging = staging.udvasito.com |
| Google Cloud | project **UDVASITO** id `udvasito-516006` (no billing, no trial; ToS accepted with user OK 2026-11-27, also OK for Firebase + AI Studio ToS). Auth Platform: External, **Testing**, test user = team Gmail. Client **"UDVASITO staging (dev + staging)"** Web, id `436072889616-ab3hftd03esdskdkbtkaq1rv4qm347qo.apps.googleusercontent.com` (public) → set as GOOGLE_CLIENT_ID on dev. Redirect URI: `https://wry-tern-774.eu-west-1.convex.site/api/auth/callback/google` (EU site URLs carry `.eu-west-1.`!). Second redirect URI (staging): `https://outstanding-grasshopper-711.eu-west-1.convex.site/api/auth/callback/google`. Secret: user adds a new one → dev + staging Convex (for_me step 3b A); first secret ****LH4C unseen → user deletes. Client **"UDVASITO production"** id `436072889616-etaru4u7pkdf2gloro855hj4241hj4bu.apps.googleusercontent.com` → GOOGLE_CLIENT_ID on striped-starling; redirect `https://striped-starling-176.eu-west-1.convex.site/api/auth/callback/google`; first secret ****zrYy unseen → user replaces (step 3b B). TODO: Branding home/privacy/terms links once those pages exist; publish to production before pilot (ask user). |
| Sentry | org **udvasito** (EU data region, `ingest.de.sentry.io`), project **udvasito-app** (React Native), Developer plan (14-day trial then free, no card). Org privacy: Enhanced Privacy ON, Require Data Scrubber + Default Scrubbers ON, Prevent Storing IP ON, Shared Issues OFF, Join Requests OFF; Global Sensitive Fields phone/phoneNumber/mobile/msisdn/reasonText; advanced rules: [Mask] BD-mobile regex (Latin+Bangla digits) from $string, [Mask] email from $string, [Remove] anything from $user.geo.** (Sentry geo-locates the connection even with infer_ip=never). DSN is public → EAS env + Vercel env (not in git). Tested 2026-11-27 from localhost: phones arrive as [phone], email masked, geo null; test issues resolved. No backend (Convex) DSN yet — SENTRY_DSN unused. |
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
  host (staging.udvasito.com, localhost) relaxes it; `*.vercel.app` is NOT staging. TODO when Vercel exists: add the
  staging preview origin(s) to trustedOrigins + CORS deliberately.
- Sentry scrubber is default-deny (every top-level field except STRUCTURAL_FIELDS is scrubbed).
- `ops.setSetting` runs `crossCheck` (waveSizes ≥ waveCount; usageWarnPct < usageCriticalPct). Last-admin guard counts
  OTHER active real admins. `revealPhone` checks VAL-18 with `checkReason` and stores the trimmed reason.
- i18n keys for validation messages: `validation.VAL-xx.<case>` (cases: empty/short/long/chars/invalid/tooOld/range/...).
- Test harness: `convex/test.setup.ts` (`makeT`, `signIn`, `insertProfile`); glob uses array + negations (extglob fails).

## 5. Phase status
- P0 🟦 started 2026-11-27 (user: "no need to tension about the dates"). **PR #1** `p0/foundations` → `staging`
  opened 2026-11-27 (part 1: everything not waiting on accounts/phones). Code review (high) found 10 problems → all
  fixed in the "P0: review fixes" commit (see Resume here). PR NOT merged; waits for the developer's OK.
- P0 build-prompt items: 1–11, 13, 14 ✅ (Home = empty Home; CI ✅). 12 Vercel ⏳ (account 2026-11-28).
- P0 DoD: Google sign-in ⏳ (client made; secret = user step 3b; then test web + Android dev build; staging + prod);
  language switch ✅ (e2e) / 2 GB phone render ⏳ phones; seed-places + count test ✅; locked-screen push ⏳ (FCM +
  build #1); Lighthouse ≤ 3 s ⏳ (Vercel); spikes ⏳ (docs/spikes.md).
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
- NEXT: Telegram bot (BotFather, developer's phone); Gemini key (developer pastes into Convex); Vercel (Sat) incl. the
  auth rewrite above + EXPO_PUBLIC_SENTRY_DSN / CONVEX URLs in Vercel env; developer steps 3c, 5, 6; CONVEX_DEPLOY_KEY
  (staging) GitHub secret for CI deploys; spikes S1–S4; EAS build #1 (ask first). Never merge a PR before review + fixes.
