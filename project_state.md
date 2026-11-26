# project_state.md — agent memory (for Claude Code only)

> Read this FIRST in every new context window, after CLAUDE.md. Keep it short and current.
> Update it at the end of every slice. The human guide is `for_me.md`.

Last updated: 2026-11-27 (Fri, Day 4 of the build calendar)

## 1. Where things are
- Repo root: `E:\ROUGH CODING\Udvasito new` → GitHub `udvasitobd/udvasito-main` (PUBLIC). Push works via the developer's
  personal GitHub (collaborator, `gh` logged in as the developer). Default branch `main`; `staging` = integration.
- Docs moved into `docs/` (vision, user-stories, grilling-notes, PRD, ADRs, specs, roadmap, build-prompts).
  `CLAUDE.md` stays at root. Large files (brand-kit zip, 2 promo mp4s ~60 MB each) are in `_local/` (git-ignored).
- Brand kit extracted (scratchpad, may vanish): re-extract `_local/Udvasito-Brand-Kit.zip` if needed. Asset mapping is in
  the kit README (icon/adaptive/splash-icon/notification-icon → `assets/`; favicon/icon-192/512/apple-touch/og → `public/`;
  `svg/udvasito-symbol-red.svg`, `svg/udvasito-wordmark-color.svg` → `assets/logo/`). Adaptive icon bg `#C1121F`,
  splash bg `#FFFFFF` imageWidth 200, notification icon colour `#C1121F`. Logo red `#E63946` = mark only, never text.
- Machine: Windows 11, Node 25.6.1, npm 11.8, git 2.53, gh 2.97. No Java/Android SDK (native builds via EAS cloud or
  the GitHub Actions "Android local build" workflow).

## 2. Accounts (all owned by the team Gmail udvasitobd@gmail.com — NEVER a card)
| Service | State |
|---|---|
| GitHub repo udvasitobd/udvasito-main | exists, empty at start, public |
| Convex | blank account exists; need projects `udvasito-staging` + `udvasito-prod` (EU) |
| Expo | account `udvasitos-team` exists; need `eas init`, project id |
| Vercel | developer creates it on 2026-11-28 |
| Domain udvasito.com | bought at Namecheap (only paid item). Docs assume `udvasito.vercel.app`; using the domain needs a docs/ADR note + team OK (logged in docs/questions.md Q-002) |
| Google Cloud OAuth, Firebase FCM, Telegram bots, Gemini, Cloudinary, Sentry | not yet |

## 3. Key versions (pin these)
- expo ~57.0.34, react-native 0.86.3, react 19.2.3, expo-router ~57.0.32, reanimated 4.5.1, worklets 0.10.1, TS ~6.0.3
- nativewind 4.2.7 (+ react-native-css-interop 0.2.7, tailwindcss 3.4.19) — ADR-005 option A
- Better Auth per Convex guide: `convex@latest @convex-dev/better-auth`, `better-auth@~1.7.25 @better-auth/expo@~1.7.25`,
  `npx expo install expo-secure-store`. convex/auth.ts: `createClient<DataModel>(components.betterAuth)`, plugins
  `[expo(), convex({authConfig}), crossDomain({siteUrl})]`, trustedOrigins `[siteUrl, "udvasito://"]`;
  http.ts `authComponent.registerRoutes(http, createAuth, { cors: true })`; client: `convexClient()` +
  (web ? `crossDomainClient()` : `expoClient({scheme, storagePrefix, storage: SecureStore})`) — never both.
  Google redirect URI = `<CONVEX_SITE_URL>/api/auth/callback/google`. Convex env: BETTER_AUTH_SECRET, SITE_URL.
  Guide also says follow Better Auth Expo integration steps 3, 6, 7 (better-auth.com/docs/integrations/expo).

## 4. Decisions made in this build (not in docs)
- Routes live in root `app/` (specs §1.2), not the SDK-57 template's `src/app/`. `@/*` → `./src/*`.
- Template extras removed: @expo/ui, expo-glass-effect, expo-symbols, template AGENTS.md/CLAUDE.md.
- Light theme only (specs §1.3.1) → `userInterfaceStyle: "light"`.

## 5. Phase status
- P0 🟦 started 2026-11-27. Schedule is ~4 days behind roadmap (P0 was Mon 23–Wed 25). Raised as Q-001.
- Build order (build-prompts P0): 1 scaffold ▶ 2 app.config ▶ 3 native modules ▶ 4 design system ▶ 5 i18n+extract-copy ▶
  6 Convex schema/_lib/settings/rules ▶ 7 Better Auth ▶ 8 appConfig + gates ▶ 9 seeds ▶ 10 Home ▶ 11 CI ▶ 12 Vercel ▶
  13 Sentry scrubber ▶ 14 scripts+README. Spikes S1–S4 → docs/spikes.md.

### Done
- (nothing committed yet)

### Next
- Finish item 1 (scaffold into root, folder contract), first commit `P0: scaffold Expo SDK 57 …`, push `main` + `staging`.

## 6. Rules I must not forget (short)
- PR workflow: feature branch → PR into `staging`. **Never merge a PR before the code-review + fix phase** (user order).
- Never commit secrets; never put the developer's personal email anywhere external.
- Stop & ask: new dependency not in ADRs/specs, prod schema change, rule number/copy/visibility change, skipping a test,
  isolation changes, prod deploy, EAS native build (15/month).
- Every string via t(); exact copy from specs; rules numbers from settings; rules/* pure TS + 100 % tests.
