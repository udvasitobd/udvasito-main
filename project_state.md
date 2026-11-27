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
| Cloudflare (replaces Vercel — ADR-024, developer decision 2026-11-27: Vercel sign-in kept failing) | account id `f42c84983e6504fa03b9cc628c64ce4f` (Google sign-in, team Gmail, Free). Zone **udvasito.com** Free plan, **pending** until Namecheap nameservers = `jen.ns.cloudflare.com` + `marvin.ns.cloudflare.com` (were dns1/dns2.registrar-servers.com; DNSSEC must stay off). DNS kept (all DNS-only): Namecheap Private Email = MX mx1/mx2.privateemail.com (10), TXT SPF `v=spf1 include:spf.privateemail.com ~all`, CNAME autoconfig/autodiscover → privateemail.com, SRV _autodiscover._tcp. Deleted: parking A @ 162.255.119.57 + www CNAME parkingpage.namecheap. AI-crawler settings left at default. No Workers yet. Plan: Workers Builds (GitHub app — ask user before granting) → `udvasito-web-staging` (branch staging, build `npm run build:web`, deploy `npx wrangler@4.161.0 deploy --env staging`, non-prod `npx wrangler@4.161.0 versions upload --env staging`) and `udvasito-web` (branch main, build `npx convex deploy --cmd-url-env-var-name EXPO_PUBLIC_CONVEX_URL --cmd "npm run build:web"`, deploy `npx wrangler@4.161.0 deploy --env=""`, build secret CONVEX_DEPLOY_KEY pasted by user; ASK before first prod deploy). Build vars per Worker: EXPO_PUBLIC_CONVEX_URL, EXPO_PUBLIC_CONVEX_SITE_URL, EXPO_PUBLIC_SENTRY_DSN, EXPO_PUBLIC_APP_ENV, WRANGLER_SEND_METRICS=false. Dashboard DONE 2026-11-27: Redirect Rule "www to udvasito.com (ADR-024)" `https://www.udvasito.com/*` → `https://udvasito.com/${1}` 301, query kept; proxied A www → 192.0.2.1 (placeholder, never delete); Always Use HTTPS ON; min TLS 1.2. curl: http://www → https://www → https://udvasito.com/<path>?<query> ✅. www is NOT a Worker route any more. TODO: Workers Logs OFF when the Workers exist. Verify `_headers` with curl (Cache-Control on /_expo not doubled). |
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
  Q-006 keep all, Q-007 offline file confirmed, Q-005 2/4/7 stay (member 1 writes 1/3/5/6); new Q-008 (P1 on staging
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
  NEXT: 7 donor setup → 8 request form → 9–15.
- convex-test: the fake clock moves 1 ms per write → compare with returned expiresAt / loose bounds, not exact NOW.
  Stub fetch with vi.stubGlobal('fetch', …) and set process.env in beforeEach; t.fetch('/path') hits http.ts routes.
- Telegram bot go-live (human + me): developer makes the bot in BotFather (staging bot first) and pastes the token as
  TELEGRAM_BOT_TOKEN in the Convex dashboard; I generate TELEGRAM_WEBHOOK_SECRET and pipe it in unprinted
  (node crypto → `npx convex env set` via stdin); then `npx convex run telegram:registerWebhook`; then set
  settings.verification {telegram: true, telegramBot: '<name>'} via internal.admin.ops.setSetting.
- Legal files: NONE in the repo (DEP-02). Without them /welcome, /onboarding, /privacy, /terms are "not found" and the
  gates skip consent/onboarding (availableRoutes({legalReady})). To check those screens locally: write 4 throwaway
  files in src/content/legal/ with front matter (version 2026-11-28-pilot, effective 2026-11-28), run
  content:build + build:web, then DELETE them and `git checkout src/content/generated/index.ts`.
- Local checks without signing in: temporary re-export routes (e.g. app/zzpreview/…) + `npx tsx scripts/serve-dist.ts`
  (8081). serve-dist forbids iframes; for a 390 px view use a frame-friendly server from the scratchpad. `pkill` does
  NOT exist in Git Bash here — stop node servers with PowerShell Stop-Process (match the command line).
- Typed routes: after adding a route file run `CI=1 npx expo start --web --port 8099` ~25 s to regenerate
  .expo/types/router.d.ts, otherwise tsc rejects the new href.
- Copy rule (developer, Q-014): specs English-only → write the plain Bangla translation; don't ask.
