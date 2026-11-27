# ADRs.md — UDVASITO (উদ্ভাসিত) Architecture Decision Records

> **Status:** ✅ **APPROVED v1.2** (2026-11-23) — Step 5 of 8 (SpecPilot). **All 22 ADRs Accepted with their recommended option**; open choices T-1–T-5 accepted as recommended (§7). v1.1 = account setup details found in the Step 7 issue check; v1.2 = Step 7 decisions D-R1, D-R2, D-R4 recorded as consequences (no technology changed).
> **Last updated:** 2026-11-23 (all prices, limits and versions researched on this date — they change; re-check at account creation)
> **Depends on:** `vision.md` v1.2, `user-stories.md` v1.1, `grilling-notes.md` v1.0, `PRD.md` v1.0 (all APPROVED).
> **Rule for the AI coding agent:** use exactly the technologies accepted here. Do not add a paid service, a new vendor that stores personal data, or a library that replaces an accepted one without a new ADR approved by the team.

---

## 0. Stack at a glance (recommended)

| Layer | Choice | Cost |
|---|---|---|
| App (Android + web, one codebase) | **Expo SDK 57** + Expo Router + TypeScript (strict) + React Native Web | ৳0 |
| Styling & components | **NativeWind v4** (Tailwind) + **React Native Reusables** (copy-paste accessible components) | ৳0 |
| Backend, database, real-time, jobs, files | **Convex** (Free plan, EU-Dublin region) | ৳0 |
| Sign-in | **Better Auth** via the official Convex component — Google sign-in (+ optional email code) | ৳0 |
| Phone verification | **Telegram bot "share my number"** now; **WhatsApp "send us a message"** later (needs a spare SIM) | ৳0 |
| Push notifications | **Expo Push** (Android) via the Convex push component + **Web Push** (VAPID) for browsers | ৳0 |
| AI | **Gemini API free tier**, Flash-Lite, called only from Convex server actions | ৳0 |
| Voice input | **expo-speech-recognition** (phone/browser built-in speech recognition) | ৳0 |
| Location & maps | **expo-location** + local nearest-hospital search; **MapLibre + OpenFreeMap** for the optional pin map; Google Maps link for directions | ৳0 |
| Images | **Convex storage** for private slip photos; **Cloudinary** for public share-card images | ৳0 |
| Web hosting | **Cloudflare Workers** (Free, static assets + a tiny Worker) → `udvasito.com`; DNS on Cloudflare (ADR-024) | ৳0 |
| Android builds & distribution | **EAS Build** (free quota) + local build fallback → **APK on GitHub Releases + website**; **EAS Update** for quick fixes | ৳0 |
| Error monitoring | **Sentry** Developer plan | ৳0 |
| Tests & CI | **Vitest + convex-test**, **Playwright** smoke tests, **GitHub Actions** | ৳0 |
| Payments | **None in v1** (later: manual bKash/Nagad transaction-ID check, no gateway) | ৳0 |

**Golden rule for every account:** sign up with a team Google account, **never enter a credit card**. If a service asks for a card to continue, stop and tell the team — that service is not ৳0.

---

## 1. Decision drivers (from the PRD)

1. **৳0, no card** (`vision.md` §1).
2. **One vibe-coding developer + Claude Code**, 15–20 days → one language end-to-end, popular libraries the AI knows well, official integrations over glue code.
3. **One codebase for Android and web** (team decision).
4. **Timers measured in seconds** (30 s volunteer hotline, 5-min waves, "still coming?" checks) and **real-time screens** (PRD §5.4, F-407).
5. **Server-side enforcement** of who sees which phone number (PRD §3.3) — never trust the app.
6. **Bangla + English**, **low-end Android**, **weak networks** (PRD §7).
7. **The emergency path must survive** AI, image, email and map failures (PRD §7 Reliability).
8. **Personal and health data** handled under Bangladesh's PDPO 2025; AI provider terms forbid sending personal data on the free tier (PRD §6).

---

## 2. Architecture decision records

### ADR-001 — App framework, language and SDK version
**Status:** ✅ Accepted (2026-11-23)
**Context:** Team decision: React Native with Expo for Android + web (installable on iPhone). Need the version with the best library compatibility in November 2026.

| Option | Pros | Cons | Cost | Beginner-friendly |
|---|---|---|---|---|
| **A. Expo SDK 57 universal app** (Expo Router, React Native Web, TypeScript) | One codebase for Android + web; file-based routes = URLs for shared links; libraries we need were tested on SDK 57 (NativeWind v5 RC was tested on Expo 57.0.22) | Not the newest SDK; upgrade later | ৳0 | ★★★★★ — most documented setup, AI tools know it well |
| B. Expo SDK 58 (latest, RN 0.88) | Newest; released 15 Oct 2026 | Fewer libraries verified on it yet; more chance of version conflicts mid-build | ৳0 | ★★★★ |
| C. Expo for Android + separate Next.js website | Best possible web SEO | Two UIs to build and keep in sync — doubles the work for one developer | ৳0 | ★★ |

**Recommendation: A (Expo SDK 57).** Stability beats novelty for a 15–20-day build; upgrade to SDK 58 after the competition.
**Consequences:**
- Minimum **Android 7** (Expo SDK 57 supports Android 7+), compile/target SDK 36; iPhone via the web app (PWA). Resolves NFR-12.
- TypeScript **strict mode**; ESLint + Prettier.
- Native features (push, voice, Google sign-in redirect) need a **development build**, not Expo Go.
- `web.output: "single"` (single-page app) with the single-page-application fallback to `index.html` on Cloudflare (ADR-024); shared-link previews handled by ADR-006.

---

### ADR-002 — Backend, database, real-time and background jobs
**Status:** ✅ Accepted (2026-11-23)
**Context:** The team named Convex or Supabase. Needs: real-time, second-level timers, server functions with access checks, file storage, cron, never pauses, ৳0.

| Option | Pros | Cons | Cost | Beginner-friendly |
|---|---|---|---|---|
| **A. Convex** (Free plan) | TypeScript everywhere (schema, queries, server code) — one language for Claude Code; real-time by default; **built-in scheduler** (`runAfter` in seconds) and crons — perfect for waves, the 30 s hotline and "still coming?"; official components for push notifications, rate limiting and Better Auth; EU region on the free plan; no inactivity pause | Not SQL; free plan has tight limits (1M function calls / month, 0.5 GB database, 1 GB files, about 1 GB database I/O) that require careful query design | ৳0 | ★★★★★ |
| B. Supabase (Free plan) | Postgres + SQL; Row Level Security; auth included | **Free projects pause after a week of low activity**; second-level timers need extra pieces (pg_cron/queues/Edge Functions); two languages (SQL + TS) | ৳0 | ★★★ |
| C. Firebase (Spark) | Familiar from v0 | Server-side functions need the pay-as-you-go Blaze plan (card) — fails ৳0; v0's audit showed how easy it is to leave data publicly readable | ৳0 → card | ★★★ |

**Recommendation: A (Convex), region EU (Dublin).** Dublin is closer to Bangladesh than the US default; the free plan's included amounts are the same in either region.
**Consequences:**
- **Two Convex projects:** `udvasito-staging` and `udvasito-prod` (NFR-01). Developers get personal dev deployments.
- **Design rules for the free plan (the coding agent must follow them):**
  1. Every query uses an **index**; no full-table scans in user-facing queries.
  2. Dashboards and the public impact page read **pre-computed stats documents** updated by a cron every 5 minutes — never live scans of all donors.
  3. Raw events older than 90 days are rolled up into daily totals and deleted (keeps the 0.5 GB database small).
  4. Public pages use one-shot queries or cached HTTP endpoints, not live subscriptions.
- All access control lives in Convex functions (custom `query`/`mutation` wrappers that load the user and role first). The app is never trusted.
- If a limit is exceeded for a long time, Convex may return errors → F-911 usage monitor and the degradation order (PRD §7) are mandatory.

---

### ADR-003 — Sign-in
**Status:** ✅ Accepted (2026-11-23)
**Context:** One-tap sign-in, no password to remember, works on Android app and web, ৳0, **no owned domain** (we use free subdomains).

| Option | Pros | Cons | Cost | Beginner-friendly |
|---|---|---|---|---|
| **A. Better Auth + official Convex component** | User data stays in our Convex database (fewer processors under PDPO); Google sign-in for Expo and web; runs on Convex's own `*.convex.site` URL — **no domain needed** | Newer integration; needs careful setup (exact pinned versions from the Convex guide) | ৳0 | ★★★★ |
| B. Clerk | Polished prebuilt screens; native Google sign-in; free up to 50,000 retained users | **Production instances require a domain you own, even for Expo apps** — fails ৳0; user data stored by another vendor | ৳0 + domain | ★★★★★ |
| C. Convex Auth | Convex-native | Less momentum than the Better Auth component; fewer Expo examples | ৳0 | ★★★ |

**Recommendation: A (Better Auth via the Convex component).**
**Consequences:**
- **Google sign-in** is the primary method (one tap on Android; works in every browser). Google Cloud OAuth client: free, no billing account.
- **Email one-time code** is optional (F-102 fallback) and only if ADR-015 email is set up.
- Date of birth (18+ gate), consent records and roles live in our own `profiles` table, linked to the auth user.
- Follow the Convex + Better Auth **Expo guide exactly**, with the versions it pins; Expo native sign-in needs a development build.
- **Practice sign-in (D-R4):** Better Auth's email + password provider is also enabled in production, but a server hook accepts only practice accounts (`<id>@practice.udvasito.invalid`, profile `isDemo: true`) while the practice area is on; sign-up through it is disabled and wrong PINs lock the ID for 15 minutes. Real users only ever use Google.

---

### ADR-004 — Phone verification at ৳0
**Status:** ✅ Accepted (2026-11-23)
**Context:** PRD F-103: verify the phone once, never blocking a request; SMS codes cost money everywhere.

| Option | How it works | Pros | Cons | Cost | Beginner-friendly |
|---|---|---|---|---|---|
| **A. Telegram bot "Share my number"** | App opens `t.me/UdvasitoBot?start=<one-time token>` → user taps **Share my phone number** → bot receives the number Telegram has verified → Convex HTTP webhook marks the account verified (only if the shared contact belongs to the sender) | Free, instant, reliable; no business verification; a bot is created in minutes | User needs Telegram installed (common among students, less among older users) | ৳0 | ★★★★★ |
| **B. WhatsApp "send us a message"** | App opens `wa.me/<our number>?text=VERIFY <code>` → user taps Send → WhatsApp Cloud API webhook receives the message with the sender's number → verified; confirmation shown **in the app** (we don't reply on WhatsApp) | Almost everyone in Bangladesh has WhatsApp; messages users send to a business are free | Needs a **spare SIM not used on WhatsApp**, a Meta business setup and display-name review (days); since 1 Oct 2026 business replies are billable beyond a monthly free allowance — so we never reply | ৳0 if we never reply | ★★★ |
| C. User sends an SMS to a team Android phone running an SMS-gateway app | User's SMS costs them a little; gateway forwards it to our webhook | Works for anyone with a SIM | Depends on one phone being online 24/7; fragile; costs users money | ~৳0 for us | ★★ |
| D. SMS one-time codes (Firebase, Twilio, local gateways) | Classic | — | Paid per SMS — **rejected (৳0)** | Paid | — |

**Recommendation: A now (Phase with sign-in), B later** if the team has a spare SIM and Meta approval arrives in time. Both sit behind one "Verify your phone" screen; the admin can switch each method on/off.
**Consequences:** "Post first, verify in parallel" (G-01) keeps working if neither method is available. The verified number comes from Telegram/WhatsApp, not from what the user typed.
**Added by D-R1 (2026-11-23) — E. Verified in person:** for people without Telegram, an admin or approved volunteer types the person's 6-character code, sees only their first name and the last 4 digits, the person rings the verifier's phone (rejected, so ৳0), and the verifier confirms the digits match. Audit-logged, limited per verifier per day, reversible by an admin. Needs no new service.

---

### ADR-005 — Styling, components, fonts
**Status:** ✅ Accepted (2026-11-23)

| Option | Pros | Cons | Cost | Beginner-friendly |
|---|---|---|---|---|
| **A. NativeWind v4 (stable, Tailwind 3) + React Native Reusables** | Tailwind classes — what AI coding tools write best; same styles on Android and web; copy-paste components we own and can make accessible | Must pin versions compatible with SDK 57 | ৳0 | ★★★★★ |
| B. gluestack-ui v5 (stable since Jun 2026) on NativeWind v5 | Large ready component set | NativeWind v5 is still a release candidate | ৳0 | ★★★★ |
| C. Tamagui | Fast, typed | Own styling language; steeper learning curve | ৳0 | ★★ |

**Recommendation: A.** If NativeWind v4 conflicts with SDK 57 during setup, switch to B (same Tailwind mental model) and record it.
**Consequences:**
- Fonts: **Noto Sans Bengali** + **Noto Sans** (via `@expo-google-fonts`) so Bangla and English line up; loaded at start with a system-font fallback.
- A small design-token file (colours, spacing, radius, type scale) defined in Step 6; brand red from v0 checked for WCAG AA contrast.
- Every component gets accessibility labels and ≥ 48 dp touch targets by default.

---

### ADR-006 — Web hosting, domain and share-link previews
**Status:** ✅ Accepted (2026-11-23) — **hosting superseded by ADR-024 (Cloudflare Workers, 2026-11-27)**; the share-link preview decision stands

| Option | Pros | Cons | Cost | Beginner-friendly |
|---|---|---|---|---|
| **A. Vercel Hobby** (team choice) | Git push → deploy; preview URL for every branch (our staging web); small serverless functions included | Hobby is for **non-commercial** use — fine for a volunteer project that sells nothing; re-check when community funding (F3) starts | ৳0 | ★★★★★ |
| B. EAS Hosting (Expo) | Built for Expo Router | Newer; smaller free quota | ৳0 | ★★★★ |
| C. Cloudflare Pages / Netlify | Generous free tiers | Different from the team's choice; no benefit here | ৳0 | ★★★★ |

**Recommendation: A**, at **`udvasito.com`** (custom domain on Vercel Hobby — see ADR-023; originally the free subdomain `udvasito.vercel.app`, which resolved OQ-11).
**Consequences:**
- Production web = `main` branch; staging web = `staging` branch preview, pointed at the staging Convex project.
- **Share-link previews:** Facebook/WhatsApp don't run JavaScript, so a shared request link needs server-rendered preview tags. One small route `/r/<id>` (originally a Vercel function; now the Cloudflare Worker, ADR-024) returns a tiny HTML page with Open Graph title/description (no personal data) and the Cloudinary share-card image, then redirects to the app route.

---

### ADR-007 — Android builds, distribution and updates
**Status:** ✅ Accepted (2026-11-23)
**Context:** OQ-05 decided: APK from the website + GitHub Releases.

| Option | Pros | Cons | Cost | Beginner-friendly |
|---|---|---|---|---|
| **A. EAS Build free quota + local/GitHub-Actions build fallback** | Cloud builds without Android Studio; up to 15 Android builds per month free | Free builds wait in a low-priority queue (can be 90+ min at peak) and stop at 45 min | ৳0 | ★★★★ |
| B. Local builds only (Android Studio) | Unlimited | Heavy setup on the developer's PC | ৳0 | ★★ |

**Recommendation: A.** Builds are precious — **only build the APK when native code changes**; ship JavaScript-only fixes with **EAS Update** (free plan covers up to 1,000 monthly active users for updates — enough for the pilot; F-911 watches it).
**Consequences:** signing keys managed by EAS (never committed); APK attached to a GitHub Release and linked from the website's download page with a simple install guide; the app checks a `minimumVersion` setting and shows "Update available" with the download link.

---

### ADR-008 — Push notifications
**Status:** ✅ Accepted (2026-11-23)

| Option | Pros | Cons | Cost | Beginner-friendly |
|---|---|---|---|---|
| **A. Expo Push (Android) via `@convex-dev/expo-push-notifications` + standard Web Push (VAPID) for browsers** | Expo Push is free; the official Convex component batches and retries; Web Push is an open standard sent from a Convex Node action with the `web-push` library | Two channels to maintain; Expo's own service doesn't send to browsers, so web push is ours | ৳0 | ★★★★ |
| B. OneSignal | One dashboard for both | Another vendor holding device data; SDK config work in Expo | ৳0 tier | ★★★ |
| C. Firebase Cloud Messaging directly | No middleman | More native setup; still need web separately | ৳0 | ★★★ |

**Recommendation: A.**
**Consequences:**
- Android needs FCM credentials from a **free Firebase project (FCM only — no other Firebase features)** uploaded to EAS.
- Android notification channel **"Urgent blood requests"** with high importance (F-303).
- **iPhone:** web push only works after "Add to Home Screen" (iOS 16.4+) — the install guide says so; "Requests for me" (F-305) covers everyone else.
- Delivery receipts → `notification_sent`; opening the app from a notification → `notification_opened` (F-306).

---

### ADR-009 — Timers, waves and automation
**Status:** ✅ Accepted (2026-11-23)
**Decision (recommended): Convex scheduler + Convex crons only.** No external cron service.

| Job | Mechanism |
|---|---|
| Wave 1, volunteer alert, 30 s hotline check | `scheduler.runAfter(0)` / `runAfter(30 s)` at publish |
| Next waves, final-wave escalation | `runAfter(S-09)` chained per request; cancelled when covered/closed |
| "Still coming?" checks and 5-min answer window | `runAfter` per confirmed donor |
| Auto-close, donation confirmation prompt + reminder | `runAt` per request |
| Pauses ending, eligible-again and 90-day reminders | Daily cron |
| Stats documents for dashboards/public page | Cron every 5 min |
| Retention clean-up (slips, personal fields, AI logs, events roll-up) | Nightly cron |
| Daily data export (NFR-03) | Nightly cron → admin-only download |

**Consequences:** every scheduled job is **idempotent** (re-checks the current state before acting) so retries never double-notify.

---

### ADR-010 — AI provider and integration
**Status:** ✅ Accepted (2026-11-23)
**Context:** Re-check of the provider's terms (NFR-11) done on 2026-11-23: the current Gemini API Additional Terms (effective 23 Mar 2026) still say unpaid usage may be used to improve Google's products and reviewed by humans, ask not to submit sensitive or personal information to unpaid services, forbid medical advice and clinical use, and forbid apps directed at or likely accessed by under-18s. Gemini API is available in Bangladesh.

| Option | Pros | Cons | Cost | Beginner-friendly |
|---|---|---|---|---|
| **A. Gemini API free tier, Flash-Lite**, from Convex Node actions with the official `@google/genai` SDK and JSON-schema output | Team choice; handles Bangla; ~500 free requests/day on Flash-Lite; structured output = reliable form filling | Quotas change without notice; free-tier data terms | ৳0 | ★★★★★ |
| B. Add a second free provider as fallback (e.g. Groq, OpenRouter free models) | Survives a Gemini outage | Another processor with its own terms to review; more code | ৳0 | ★★★ |

**Recommendation: A only.** The non-AI fallbacks (PRD §6.1) are our backup, not a second AI vendor.
**Consequences:**
- The API key lives only in Convex environment variables — never in the app.
- One `ai/` module: **redact → call → validate JSON → log redacted input/output → count quota**. Model name is a setting (`gemini-*-flash-lite`, set at build time from AI Studio's current list).
- Rate guard: ≤ 15 calls/minute queue; at 80 % of the daily quota the assistant and appeal text switch to non-AI fallbacks (PRD §6.3).
- **OQ-17 resolved:** the FAQ assistant uses AI only to pick and rephrase approved FAQ entries; a no-AI switch stays.

---

### ADR-011 — Voice input
**Status:** ✅ Accepted (2026-11-23)
**Decision (recommended): `expo-speech-recognition`** (one API over Android's speech recogniser, the browser's Web Speech API and iOS speech). Languages `bn-BD` and `en-US`.
**Honest privacy note (changes earlier wording):** the phone's or browser's built-in speech service turns speech into text. On many Android phones and in Chrome this is **Google's speech service**, sometimes on-device. **UDVASITO never receives or stores audio, and audio never goes to the Gemini API** — only the text the person sees and can edit. The consent screen says this. Where the device supports on-device recognition we request it.
**Consequences:** availability differs by device/browser (Android needs Google's speech services; Safari support is limited) → platform parity table in `specs.md`; the button hides with an explanation where unsupported.
**Alternatives rejected:** sending audio to a cloud AI (Gemini/Whisper) — breaks "no personal data to free-tier AI".

---

### ADR-012 — Location and maps
**Status:** ✅ Accepted (2026-11-23)

| Need | Recommended | Rejected and why |
|---|---|---|
| "Use my current location" | `expo-location`, one reading, used only to compute nearest hospitals/area on the device; never stored | Continuous tracking (privacy) |
| Nearest hospitals | Local distance calculation over the seeded hospital list | Paid places APIs |
| Optional pin map | **MapLibre** (`@maplibre/maplibre-react-native` on Android, `maplibre-gl` on web) with **OpenFreeMap** tiles — free, no key, no request limits, OpenStreetMap attribution shown | Google Maps SDK (needs an API key with a billing account → card); direct OpenStreetMap tile servers (usage policy) |
| Directions for donors | Link that opens Google Maps / the phone's maps app at the hospital's coordinates | In-app routing |

**Consequences:** the map is lazy-loaded and never on the emergency path; GPS + list is the primary place picker (F-202). **D-R2:** the pin map is an "if time" feature (`features.pinMap`); MapLibre is installed only when it is built, at the cost of one native build.

---

### ADR-013 — Reference data (places, hospitals, blood banks)
**Status:** ✅ Accepted (2026-11-23)
**Decision (recommended):** seed divisions → districts → upazilas/thanas (English + Bangla names + centre coordinates) from an **open, permissively licensed GitHub dataset** (candidates: `bd-geocode-with-lat-long` (MIT), `bangladesh-geo-data` (includes metropolitan thanas such as Chattogram city's), `bangladesh-geocode`) — licence checked at import and credited on the About page. Chattogram hospitals and blood banks come from the team's own list (DEP-01).
**Consequences:** stored in Convex tables, plus a compact copy bundled in the app for instant offline pickers; neighbouring thanas pre-computed (centres within S-32 km).

---

### ADR-014 — Images and files
**Status:** ✅ Accepted (2026-11-23)

| Use | Recommended | Why |
|---|---|---|
| Hospital slip photos (sensitive) | **Convex file storage** — compressed on the phone (`expo-image-manipulator`), served only through an auth-checked HTTP endpoint to volunteers/admins and the owner; deleted by the retention cron | Keeps sensitive images with the rest of our data under our access rules |
| Share-card images (public) | **Cloudinary** free plan (25 credits per rolling 30 days, no card) — text overlays generate the bilingual card from a template; Bangla font uploaded once | Image transformations without writing an image server |
| Logos, static images | Bundled in the app / Cloudflare static assets | No need for a service |

**Rejected:** putting slip photos on Cloudinary (public delivery by default; another processor for health data).

---

### ADR-015 — Email (optional, "if time")
**Status:** ✅ Accepted (2026-11-23)
**Context:** Useful for email sign-in codes and opt-in alert copies (F-307). Most email APIs need a domain we own to send to other people.
**Recommendation:** **Gmail SMTP** from a dedicated team Gmail account with an App Password, sent from a Convex Node action (Nodemailer). ৳0, no domain; Gmail's daily sending limits for personal accounts are enough for a pilot. **Rejected:** Resend/Brevo-style APIs (need an owned domain for sending to users).
**Consequences:** never on the emergency path; if Gmail blocks sending, the feature switches off and Google sign-in still works.

---

### ADR-016 — Client data, forms, offline, languages
**Status:** ✅ Accepted (2026-11-23)

| Concern | Recommended |
|---|---|
| Server data | Convex React client (`useQuery` / `useMutation`) — real-time, with the 15 s refresh fallback logic in F-1101 |
| Offline outbox | Small outbox module persisted with `@react-native-async-storage/async-storage` (works on web via localStorage); every create/accept carries a client-generated ID; the server ignores duplicates |
| Local UI state | Zustand |
| Forms & validation | `react-hook-form` + `zod` (same rules re-checked on the server with Convex validators) |
| Languages | `i18next` + `react-i18next` + `expo-localization` (detect Bangla device language); all strings in `en.json` / `bn.json` |
| Dates & numbers | `date-fns` with the `bn` locale; `Intl.NumberFormat('bn-BD')` for Bangla digits; time zone Asia/Dhaka |

---

### ADR-017 — Abuse protection and access control
**Status:** ✅ Accepted (2026-11-23)
**Decision (recommended):** official **`@convex-dev/rate-limiter`** component for every limit in PRD §5.8; custom Convex function wrappers (`memberQuery`, `volunteerMutation`, `adminMutation`, …) that load the caller's profile, check role, freeze status and consent version **before** any logic; phone numbers returned only by dedicated functions that check the visibility matrix (PRD §3.3) and write an audit entry.
**Consequences:** automated tests prove each role cannot read data it shouldn't (NFR-02).

---

### ADR-018 — Observability and monitoring
**Status:** ✅ Accepted (2026-11-23)

| Concern | Recommended | Free limits |
|---|---|---|
| App crashes and errors (Android + web) | **Sentry** Developer plan (`@sentry/react-native`) | 5,000 errors/month, 1 user |
| Backend logs | Convex dashboard logs | — |
| Product events & metrics | Our own `events` table (PRD §2.2) — no third-party analytics (privacy) | Counts toward Convex storage (rolled up after 90 days) |
| Usage vs free limits | F-911 panel: our own counters + links to each provider's usage page | — |

Sentry is configured to **strip phone numbers, names and request free text** from error reports.

---

### ADR-019 — Testing and CI/CD
**Status:** ✅ Accepted (2026-11-23)

| Layer | Tool | Runs |
|---|---|---|
| Pure rules (eligibility, compatibility, ranking, waves, redaction) | **Vitest** | every push |
| Convex functions incl. access control, idempotency, scheduler flows | **convex-test** + Vitest | every push |
| Web smoke test (post → match → accept in the practice area) | **Playwright** | before each production deploy |
| Android smoke test (optional) | Maestro | before each APK release |
| Type check, lint | `tsc --noEmit`, ESLint | every push |
| Pipeline | **GitHub Actions** (checks) + **Cloudflare Workers Builds** deploys `main` and `staging` (ADR-024); `npx convex deploy` runs in the production Worker build | — |

---

### ADR-020 — Repository, environments and secrets
**Status:** ✅ Accepted (2026-11-23)

| Decision | Recommended | Alternative |
|---|---|---|
| Repository visibility | **Public** on GitHub (transparency for judges and partners; unlimited free Actions minutes for public repos) | Private (2,000 free Actions minutes/month) |
| Licence | **MIT** — lets other blood clubs and cities reuse it (sustainability) | AGPL-3.0 (forces derivatives to stay open) |
| Branches | `main` → production; `staging` → staging; feature branches → Cloudflare preview URLs (staging Worker) against staging | — |
| Secrets | Only in Convex env vars, Cloudflare build secrets and EAS secrets; `.env.local` git-ignored; a `.env.example` with names only | — |
| Environments | Staging (`udvasito-staging` Convex + `staging` web) and Production (`udvasito-prod` + `udvasito.com`); the **practice area** (F-912) lives inside production, logically isolated | — |

---

### ADR-021 — Payments
**Status:** ✅ Accepted (2026-11-23)
**Decision (recommended): no payment code in v1.** F3 (later) = manual bKash/Nagad: supporters send money to an organisation-owned number and paste the transaction ID; two admins check it against the statement. **Rejected for now:** payment gateways (SSLCommerz, bKash PGW) — merchant registration, fees and compliance work not justified before the platform is proven.

---

### ADR-022 — Project structure
**Status:** ✅ Accepted (2026-11-23)
**Decision (recommended): one repository, one package.**
```
/app            Expo Router routes (screens = URLs)
/src/features   one folder per module (requests, matching-ui, donor, volunteer, admin, public…)
/src/components shared UI (Reusables-based)
/src/lib        outbox, i18n, analytics-events, platform helpers
/src/i18n       en.json, bn.json
/convex         schema, functions, crons, http endpoints, ai/, rules/ (pure TS, unit-tested)
/worker         Cloudflare Worker: /api/auth pass-through, share-link previews (ADR-006, ADR-024)
/docs           vision, stories, grilling, PRD, ADRs, specs, roadmap
/tests          Playwright and fixtures
```
The full folder contract is fixed in `specs.md`.

---

### ADR-023 — Own domain udvasito.com
**Status:** ✅ Accepted (2026-11-27, developer decision)
**Context:** the team bought `udvasito.com` at Namecheap — the only yearly paid item in the project (the ৳0 rule covers services; the domain is a one-off team purchase). All documents used the free `udvasito.vercel.app`.
**Decision:** `udvasito.com` is the address everywhere (app deep links, shared links, legal pages, Google sign-in consent screen, OG previews, promo material made from now on). Staging web uses `staging.udvasito.com`. *(Hosting and DNS updated by ADR-024: DNS moved from Namecheap to Cloudflare; `udvasito.vercel.app` was never created.)*
**Consequences:**
- Google OAuth consent screen: authorised domain `udvasito.com` (ownership verified in Google Search Console with a DNS TXT record); privacy/terms links on `udvasito.com`.
- Spike S3 tests the Better Auth callback through `udvasito.com` (Cloudflare Worker pass-through to the Convex site, ADR-024).
- The rendered promo videos show `www.udvasito.com` on the end card (checked 2026-11-27); `www` must keep redirecting to `udvasito.com` (ADR-024 Redirect Rule).
- No extra service, no card, no personal data at a new vendor.

### ADR-024 — Web hosting on Cloudflare Workers (replaces Vercel)
**Status:** ✅ Accepted (2026-11-27, developer decision — the Vercel account could not be created: sign-in failed
repeatedly). Supersedes the hosting part of ADR-006 and the DNS sentence of ADR-023.
**Context:** the web app is a static Expo export (one `index.html` + hashed bundles) plus two small server pieces:
the Google sign-in pass-through for spike S3 and, later, the share-link preview `/r/<slug>` (ADR-006). Cloudflare's
docs (checked 2026-11-27): "Start new projects with Workers"; Pages is still supported but no longer the recommendation.

| Option | Pros | Cons | Cost | Beginner-friendly |
|---|---|---|---|---|
| **A. Cloudflare Workers + static assets** (Workers Builds from GitHub) | Cloudflare's main platform; static requests free and unlimited; `_headers`, SPA fallback, custom domains, preview URLs; DNS + TLS + DDoS in one free place; no non-commercial clause | Apex domain needs Cloudflare nameservers; Worker code limited to 100,000 requests/day | ৳0 | ★★★★ |
| B. Cloudflare Pages | Built-in production/preview variables | No longer recommended for new projects; same DNS requirement for a branch subdomain | ৳0 | ★★★★ |
| C. Vercel Hobby (ADR-006) | — | Account could not be created | ৳0 | — |

**Decision: A.** One `wrangler.jsonc`, two Workers:
- **`udvasito-web`** (production): branch `main` → `udvasito.com`. `www.udvasito.com` never reaches the Worker: a proxied placeholder record (A `192.0.2.1`) + the zone Redirect Rule answer 301 → `https://udvasito.com/<path>?<query>`.
  Build command `npx convex deploy --cmd-url-env-var-name EXPO_PUBLIC_CONVEX_URL --cmd "npm run build:web"` with
  `CONVEX_DEPLOY_KEY` (production) as a Cloudflare **build secret**; deploy command `npx wrangler@<pinned> deploy --env=""`.
- **`udvasito-web-staging`** (`--env staging`): branch `staging` → `staging.udvasito.com`; every other branch gets a
  **preview URL** (`wrangler versions upload --env staging`) built against staging. Build command `npm run build:web`
  (staging Convex is deployed by CI, RB-2).
- Build variables per Worker: `EXPO_PUBLIC_CONVEX_URL`, `EXPO_PUBLIC_CONVEX_SITE_URL`, `EXPO_PUBLIC_SENTRY_DSN`,
  `EXPO_PUBLIC_APP_ENV`, `WRANGLER_SEND_METRICS=false`. Runtime variable `CONVEX_SITE_URL` (public) lives in
  `wrangler.jsonc`. Workers Logs stay **off** (no request data stored).
- Registration stays at Namecheap (the one paid item); **DNS moves to Cloudflare** (free). Email records found on the
  domain (Namecheap Private Email: MX, SPF, autoconfig) are kept, DNS-only.

**Trade-offs and how they are handled**

| Trade-off | Handling |
|---|---|
| An apex domain on Workers needs Cloudflare nameservers | Nameservers at Namecheap → Cloudflare (free); registration unchanged |
| A static `_redirects` rule cannot proxy to another host (Vercel rewrites could) | `worker/index.ts` passes `/api/auth/*` to this environment's Convex site; `/api/*` always runs the Worker (`run_worker_first`); the share preview `/r/*` is added there in its phase |
| Worker code: 100,000 requests/day, 10 ms CPU per request (static assets: free, unlimited) | Only auth, share previews and non-navigation requests for addresses with no file (crawlers, link previews) run code (hundreds a day). Above the limit those paths answer 429 until 00:00 UTC while the site keeps serving — budget table row, Workers usage page |
| `_headers` does not apply to responses from Worker code | `worker/security-headers.ts` adds the §7.4 headers to every Worker response (a test keeps them equal to `public/_headers`); the auth pass-through skips only the app CSP; the share-preview HTML sets its own CSP |
| www → apex cannot be written in `_redirects` (path-only) | Zone **Redirect Rule** "www to udvasito.com" (free plan, 1 of 10) + "Always Use HTTPS" — set up and checked with curl 2026-11-27 |
| One Worker has one set of build variables | Two Workers (production, staging) |
| Cloudflare's SPA fallback answers only browser navigations (`Sec-Fetch-Mode: navigate`); crawlers, link-preview bots and older browsers reach the Worker for any address with no file | `routeFor` in `worker/index.ts`: app addresses (no dot, not `/_expo/`, `/assets/`, `/.well-known/`) get `index.html` through the `ASSETS` binding; missing files get 404 (found in the PR #2 review; `scripts/serve-dist.ts` uses the same rule) |
| Builds: 1 at a time, 3,000 build minutes a month, 20-minute timeout | The web export takes a few minutes; far below the limit |
| The rendered promo videos show `www.udvasito.com` | The Redirect Rule above keeps it working (path and query kept); never delete the `www` placeholder record |

**Consequences:** `vercel.json` is replaced by `wrangler.jsonc` + `public/_headers` (specs §7.4 headers, checked
against Cloudflare's limits by a unit test); `scripts/serve-dist.ts` serves `dist/` the same way for the Playwright
smoke test. Secrets live in Convex, Cloudflare and EAS (CLAUDE.md rule 18). Spike S3 uses the Worker pass-through.

### ADR-025 — Date picker: the phone's and the browser's own
**Status:** ✅ Accepted (2026-11-27, developer — Q-011).
**Context:** date of birth (SCR-O03), last donation (SCR-D02) and "Pick date & time" (CMP-NeededByPicker) need a date
picker; specs names none and has no copy for typed day/month/year boxes.

| Option | Pros | Cons | Cost | Beginner-friendly |
|---|---|---|---|---|
| **A. `@react-native-community/datetimepicker`** (MIT, in the Expo SDK) on Android + the browser's `<input type="date">` / `"datetime-local"` on the web | Native, accessible, already in the phone's / browser's language; no new copy; tiny | Android dialog follows the phone's language, not the app's; needs a native build (before build #1, so no extra build) | ৳0 | ★★★★★ |
| B. Typed day / month / year boxes | No library | Three new copy strings; easier to mistype | ৳0 | ★★★ |

**Consequences:** `src/components/DateField.tsx` (Android) and `DateField.web.tsx` (web) share one API that reads and
writes `"YYYY-MM-DD"`; the value is still checked by the VAL rule on the server.

---

## 3. Free-tier budget table (NFR-07)

Pilot assumptions: ~500 donors, ~300 daily active users at peak, ~30 requests/day, ~10 volunteers.

| Service | Free limit (Nov 2026) | Expected pilot use | Breaks first when… | What degrades | Where we watch |
|---|---|---|---|---|---|
| Convex function calls | 1,000,000 / month | ~300–500k | Live dashboards re-run on every change; viral sign-up spike | Public page switches to cached stats; then admin charts refresh less often | F-911 + Convex usage page |
| Convex database I/O | ~1 GB / month | Low if indexed | Unindexed scans of donors/events | Same as above — **design rule: indexes + pre-computed stats** | Convex usage page |
| Convex database storage | 0.5 GB | < 50 MB | Raw events never rolled up | Nightly roll-up/deletion | F-911 |
| Convex file storage | 1 GB | < 100 MB (slips deleted at close) | Slips not deleted | Retention cron | F-911 |
| Convex action compute | 20 GB-hours / month | Small (AI + push batches) | Very heavy AI use | AI features off first | Convex usage page |
| Gemini Flash-Lite | ~500 requests/day, 15/min | 50–200/day | Assistant becomes popular | Assistant/appeal → non-AI at 80 % | F-902 / F-911 |
| Gemini Flash | ~20 requests/day | 0 (reserve) | — | — | F-902 |
| Expo Push | Free service | Hundreds/day | — (Expo rate limits are far above pilot volume) | Web push / inbox continue | Push receipts |
| EAS Build | 15 Android builds / month | 4–8 | Building for every JS change | Use EAS Update for JS fixes; local build fallback | Expo dashboard |
| EAS Update | 1,000 monthly active users | < 1,000 in pilot | Pilot grows past 1,000 app users | Ship a new APK instead of OTA | F-911 |
| Cloudflare Workers (Free) | Static assets free and unlimited; Worker code 100,000 requests/day (10 ms CPU each); Workers Builds 3,000 min/month, 1 at a time | Static site + auth pass-through (hundreds/day) | A share link goes viral (later `/r/*`) | Static site keeps serving; `/api/*` (and later `/r/*`) answer 429 until 00:00 UTC | Cloudflare Workers usage page |
| Cloudinary | 25 credits / rolling 30 days | Share cards only | Cards re-generated per view | Cards cached; template fallback | F-911 (usage API) |
| Sentry | 5,000 errors / month | Hundreds | Crash loop | Error sampling | Sentry |
| Telegram Bot API | Free | Sign-ups | — | WhatsApp method / unverified flow | — |
| WhatsApp Cloud API (later) | Messages from users free; replies billable after a monthly allowance | Inbound only | We start replying | Never reply; confirm in-app | — |
| OpenFreeMap | Free, no request limits | Small | Service change | Map hidden; list picker works | — |
| GitHub (public repo) | Free Actions minutes | CI on each push | — | — | — |

---

## 4. Platform capability matrix (preliminary — final in `specs.md`, NFR-05)

| Capability | Android app | Android Chrome | iPhone (installed web app) | Desktop browser |
|---|---|---|---|---|
| Push alerts | ✅ Expo Push | ✅ Web Push | ✅ only after "Add to Home Screen" (iOS 16.4+) | ✅ Web Push |
| Voice input (Bangla) | ✅ if Google speech services present | ✅ | ⚠ limited | ✅ Chrome/Edge |
| GPS "use my location" | ✅ | ✅ (HTTPS) | ✅ | ✅ |
| Pin map | ✅ MapLibre native | ✅ maplibre-gl | ✅ | ✅ |
| Google sign-in | ✅ | ✅ | ✅ | ✅ |
| Telegram / WhatsApp verification | ✅ opens the app | ✅ | ✅ | ✅ (or phone) |
| Install | APK download | PWA install | Add to Home Screen | PWA install |

---

## 5. Accounts the team must create (all free — never add a card)

| # | Account | Used for | Owner |
|---|---|---|---|
| 1 | Team Google account (e.g. `udvasito.team@gmail.com`) | Owns every other account; Gmail SMTP (optional) | Developer |
| 2 | GitHub | Code, Actions, Releases (APK) | Developer |
| 3 | Expo (EAS) | Builds, updates, push credentials | Developer |
| 4 | Convex | Backend (staging + production projects, EU region) | Developer |
| 5 | Cloudflare | Web hosting (Workers) + DNS for `udvasito.com` (ADR-024) | Developer |
| 6 | Google Cloud (no billing) | OAuth client for Google sign-in. Consent screen: External, **basic scopes only** (openid, email, profile), publishing status **In production** before the pilot (in Testing, Google shows a "testing" warning to everyone); **no logo uploaded** — a logo requires Google's brand verification | Developer |
| 7 | Firebase (FCM only, Spark plan) | Android push credentials | Developer |
| 8 | Google AI Studio | Gemini API key | Developer |
| 9 | Cloudinary | Share-card images | Developer |
| 10 | Sentry | Error monitoring | Developer |
| 11 | Telegram BotFather | **Two bots** — production `@UdvasitoBot` and staging `@UdvasitoStagingBot` (or similar): a bot has one webhook, so each environment needs its own | Developer |
| 12 | Meta for Developers + WhatsApp (later, optional) | WhatsApp verification; needs a spare SIM | Member 4 + developer |

---

## 6. Effects on earlier documents (applied with this step)

| Document | Change |
|---|---|
| `PRD.md` | F-205 and §6.1 voice wording: "phone/browser built-in speech recognition (may use Google's speech service); UDVASITO never receives audio; audio never reaches the AI provider" (ADR-011). OQ-11 and OQ-17 marked resolved (ADR-006, ADR-010). NFR-07, NFR-11, NFR-12 resolved here |
| `user-stories.md` | US-R02 and US-X08 wording on speech recognition (ADR-011) |
| `vision.md` | §6 voice row wording (ADR-011) |

---

## 7. Team choices (accepted 2026-11-23)

| ID | Choice | Decision |
|---|---|---|
| T-1 | Expo SDK | **57** (upgrade to 58 after the competition) |
| T-2 | Convex region | **EU (Dublin)** |
| T-3 | Phone verification | **Telegram now**; WhatsApp only if the team finds a spare SIM not used on WhatsApp (optional later phase) |
| T-4 | Repository | **Public on GitHub, MIT licence** — secrets never committed |
| T-5 | Email sign-in code | **Google sign-in only for judging (practice accounts use practice sign-in, D-R4)**; Gmail SMTP email codes only if time allows |

## 8. Sources (checked 2026-11-23)

- Expo SDK versions and supported Android versions: https://docs.expo.dev/versions/latest/sdk/overview/ · https://expo.dev/changelog/sdk-58.md · https://www.nativewind.dev/v5/getting-started/installation
- Convex free plan limits and regions: https://docs.convex.dev/production/state/limits.md · https://ship.convex.dev/changelog/eu-region-hosting-dublin · https://www.convex.dev/pricing/faq
- Supabase free-project pausing: https://supabase.com/kb/faqs/platform/free-project-pausing
- Better Auth + Convex for Expo: https://labs.convex.dev/better-auth/framework-guides/expo
- Clerk needs a domain for production Expo apps: https://clerk.com/docs/guides/development/deployment/expo
- WhatsApp pricing change (1 Oct 2026): https://www.vonage.com/communications-apis/messages/features/whatsapp/pricing/
- Expo notifications and web: https://docs.expo.dev/guides/using-push-notifications-services.md · Convex push component: https://convex.dev/components/push-notifications
- EAS free plan: https://newly.app/guides/eas-build · https://docs.expo.dev/billing/faq.md
- expo-speech-recognition: https://github.com/jamsch/expo-speech-recognition
- Gemini API Additional Terms (effective 23 Mar 2026): https://ai.google.dev/terms
- Vercel Hobby non-commercial: https://vercel.com/docs/plans/hobby-plan (replaced by ADR-024)
- Cloudflare (checked 2026-11-27): https://developers.cloudflare.com/workers/platform/limits/ · https://developers.cloudflare.com/workers/static-assets/ · https://developers.cloudflare.com/workers/ci-cd/builds/limits-and-pricing/ · https://developers.cloudflare.com/workers/configuration/routing/custom-domains/ · https://developers.cloudflare.com/pages/ ("Start new projects with Workers")
- Cloudinary free plan: https://cloudinary.com/documentation/billing_and_plans.md
- Sentry free plan: https://last9.io/blog/sentry-pricing/
- OpenFreeMap: https://github.com/hyperknot/openfreemap
- Bangladesh geodata: https://github.com/nuhil/bangladesh-geocode · https://shodorsonnath.github.io/bangladesh-geo-data/

---

## 9. Change log

| Version | Date | Change |
|---|---|---|
| 0.1 | 2026-11-23 | 22 ADRs proposed with options, costs, beginner-friendliness and recommendations; free-tier budget table; platform matrix; account checklist; 5 open choices |
| 1.0 | 2026-11-23 | **Approved.** All ADRs accepted; T-1–T-5 accepted as recommended |
| 1.1 | 2026-11-23 | Step 7 issue check: Google OAuth consent-screen settings (§5 row 6); one Telegram bot per environment (§5 row 11) |
| 1.2 | 2026-11-23 | Step 7 decisions: practice sign-in rule (ADR-003), in-person verification (ADR-004 option E), pin map timing (ADR-012) |
| 1.3 | 2026-11-27 | ADR-023: own domain `udvasito.com` replaces `udvasito.vercel.app` everywhere (developer decision, Q-002) |
| 1.4 | 2026-11-27 | ADR-024: web hosting on Cloudflare Workers, DNS on Cloudflare (developer decision — Vercel sign-up failed); ADR-006/019/020/022/023, budget table and accounts updated |
