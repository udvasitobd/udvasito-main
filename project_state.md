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
| Convex team `udvasitobd` | project **udvasito-staging** created, EU (Ireland); dev deployment `wry-tern-774` (used by `npx convex dev`). Team default region = EU. **udvasito-prod not created yet.** Staging "prod" deployment of udvasito-staging not created yet. |
| Convex CLI | named account `udvasito` selected for this folder only (`~/.convex/config.json` directories map); developer's personal login kept as default account `personal` — never overwrite it |
| Convex dev env vars set | BETTER_AUTH_SECRET (random), SITE_URL=http://localhost:8081, APP_ENV=staging, PASSWORD_SIGNIN=true. Missing: GOOGLE_CLIENT_ID/SECRET |
| Expo | account `udvasitos-team` exists; need `eas init` → EAS_PROJECT_ID |
| Vercel | developer creates it on 2026-11-28 (Sat) |
| Domain udvasito.com | Namecheap (only paid item). ADR-023: used everywhere; staging = staging.udvasito.com |
| Google Cloud OAuth, Firebase FCM, Telegram bots, Gemini, Cloudinary, Sentry | not yet |

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
- `/public/helpline` rate-limit key = SHA-256 of IP (IP never stored). Returns `{phone: null}` until the number is set.
- i18n keys for validation messages: `validation.VAL-xx.<case>` (cases: empty/short/long/chars/invalid/tooOld/range/...).
- Test harness: `convex/test.setup.ts` (`makeT`, `signIn`, `insertProfile`); glob uses array + negations (extglob fails).

## 5. Phase status
- P0 🟦 started 2026-11-27 (user: "no need to tension about the dates").
- Build order (build-prompts P0): 1 scaffold ✅ ▶ 2 app.config ✅ ▶ 3 native modules ✅ ▶ 4 design system ◻ ▶
  5 i18n+extract-copy ◻ ▶ 6 Convex schema/_lib/settings ✅ (rules stubs for eligibility etc. come with P1) ▶
  7 Better Auth (server ✅, client + Google ◻) ▶ 8 appConfig ✅ + gates ◻ ▶ 9 seeds (settings ✅, places/hospitals/staging ◻)
  ▶ 10 Home ◻ ▶ 11 CI ◻ ▶ 12 Vercel ◻ ▶ 13 Sentry scrubber ◻ ▶ 14 scripts+README (partial). Spikes S1–S4 ◻.

### Done (commits on p0/foundations unless noted)
- 0273b96 (main+staging) repo set-up, docs, brand assets, app.config, eas.json, tokens, tailwind.
- 4da5609 Convex backend core: schema, Better Auth server, wrappers, errors, settings, audit, events, visibility,
  rate limits, profiles.me, public.appConfig, support.helpline, /health, /public/helpline, admin bootstrap/ops/seed,
  validation (VAL-01/02/03/18/25/26) + phone.ts, 103 tests, ESLint (i18next rule), npm scripts. Dev deployment seeded.

### Next
1. i18n: `scripts/extract-copy.ts` → `src/i18n/en.json`/`bn.json` + i18next set-up (F-104) + test.
2. Design system components + fonts + root `_layout` providers (Convex + Better Auth client) + gates G1–G7.
3. Google OAuth client (Cloud Console, team Gmail) → set GOOGLE_CLIENT_ID/SECRET on Convex.
4. seed-places (ADR-013), import-hospitals, seed-staging, content:build; Home; CI; vercel.json; Sentry scrubber.
5. Create udvasito-prod project (EU) + staging prod deployment; `eas init`.
6. Q-004 in docs/questions.md (profiles row created at onboarding P1, not at P0 sign-in).

## 6. Rules I must not forget (short)
- PR workflow: feature branch → PR into `staging`. **Never merge a PR before the code-review + fix phase** (user order).
- Never commit secrets; never put the developer's personal email anywhere external. Secrets never printed.
- Stop & ask: new dependency not in ADRs/specs, prod schema change, rule number/copy/visibility change, skipping a test,
  isolation changes, prod deploy, EAS native build (15/month).
- Every string via t(); exact copy from specs; rule numbers from settings; rules/* pure TS + 100 % tests.
