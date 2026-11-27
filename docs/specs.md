# specs.md — UDVASITO (উদ্ভাসিত) True Specifications

> **Status:** ✅ APPROVED v1.2 — Step 6 of 8 (SpecPilot). v1.0 approved with proposals P-1–P-13; v1.1 adds the Step 7 issue-check fixes; v1.2 applies decisions D-R1–D-R5 and the "real platform, not a demo" rule (§1.9) — see §9.
> **Last updated:** 2026-11-23
> **Depends on:** `vision.md` v1.4, `user-stories.md` v1.3, `grilling-notes.md` v1.1, `PRD.md` v1.3, `ADRs.md` v1.2 (all APPROVED); build order and dates in `roadmap.md` v1.1.
> **Rule for the AI coding agent:** build exactly what this file says. Every route, screen state, string, field, function and error code is defined here. If something you need is missing or ambiguous, **stop and ask** — do not invent it. Product rules (who is matched, who sees which number, limits, timers) come from `PRD.md` §3 and §5; their default values live in the `settings` table (§5.2 of this file), never hard-coded.

## Contents
1. Foundations — conventions, folder contract, design system, navigation, global states, i18n, accessibility, events
2. Page inventory
3. Screen specifications (onboarding, requester, donor, shared, volunteer, admin, public)
4. Validation rules (exact messages)
5. Data model (Convex schema)
6. API specification (functions, HTTP endpoints, jobs, error codes, notification templates)
7. Non-functional specifications (performance, accessibility, browser/device support, security, testing, platform parity)
8. Proposals that need team confirmation
9. Change log

---

## 1. Foundations

### 1.1 ID conventions
| Prefix | Meaning | Example |
|---|---|---|
| `SCR-` | Screen | `SCR-M02` New request |
| `CMP-` | Shared UI component | `CMP-SafetyCard` |
| `VAL-` | Validation rule | `VAL-06` units |
| `ERR_` | Error code returned by the backend | `ERR_OPEN_REQUEST_LIMIT` |
| `EVT` | Analytics event name (PRD §2.2) | `request_published` |
| `NTF-` | Notification template | `NTF-01` donor alert |
| `S-` | Setting key (PRD §5.10) | `S-13` |
| copy key | i18n key in `src/i18n/en.json` / `bn.json` | `request.new.title` |

### 1.2 Folder contract (ADR-022 — the agent must keep this layout)
```
app/                          Expo Router routes (one file per route in §2)
  _layout.tsx                 Root: providers (Convex+Better Auth, i18n, fonts, theme), version gate, consent gate
  index.tsx                   SCR-P01 (web) / redirect (native)
  (public)/                   r/[slug].tsx, learn/index.tsx, learn/dengue.tsx, about.tsx, privacy.tsx, terms.tsx, download.tsx
  (onboarding)/               welcome.tsx, sign-in.tsx, onboarding.tsx, verify-phone.tsx, update-required.tsx, account-status.tsx
  (app)/                      Signed-in area — tab layout
    _layout.tsx               Tab bar (role-aware)
    home.tsx  requests.tsx  more.tsx  settings/…  assistant.tsx  confirm/[requestId].tsx
    request/new.tsx  request/[id]/index.tsx  request/[id]/share.tsx
    donor/index.tsx  donor/setup.tsx  donor/settings.tsx  donor/history.tsx  donor/alert-guide.tsx
    alerts/index.tsx  alerts/[requestId].tsx
    volunteer/index.tsx  volunteer/apply.tsx  volunteer/request/[id].tsx  volunteer/verify.tsx  volunteer/slips.tsx  volunteer/post.tsx
    admin/…                   index, moderation/index, moderation/[id], people/index, people/[id], audit, ai, usage, demo, settings, directory, faq, data
  +not-found.tsx
src/
  components/                 CMP-* (React Native Reusables-based, NativeWind classes)
  features/<module>/          hooks + screen sections per module (requests, intake, donor, alerts, volunteer, admin, public, account)
  lib/                        outbox.ts, i18n.ts, phone.ts (normalise/validate), dates.ts, events.ts, platform.ts, speech.ts, location.ts, push.ts, helpline.ts (`useHelpline()`, D-R3), appConfig.ts
  i18n/en.json, i18n/bn.json  ALL user-facing strings
  theme/tokens.ts             §1.3 tokens
  data/places.min.json        bundled compact places + hospitals for offline pickers
  content/                    Markdown written by the team: legal/privacy.<lang>.md, legal/terms.<lang>.md, <lang>/learn.md, <lang>/dengue.md
  content/generated/          JSON built from content/ by scripts/build-content.ts (never edited by hand)
convex/
  schema.ts                   §5
  _lib/                       auth wrappers (memberQuery, donorMutation, volunteerMutation, adminMutation…), errors.ts, settings.ts, audit.ts, events.ts, visibility.ts
  rules/                      PURE TypeScript, no Convex imports: eligibility.ts, compatibility.ts, ranking.ts, waves.ts, redaction.ts, intakeParser.ts, limits.ts
  ai/                         gemini.ts (Node action), quota.ts, prompts.ts
  profiles.ts consents.ts phoneVerification.ts places.ts hospitals.ts requests.ts intake.ts donors.ts responses.ts contacts.ts
  volunteers.ts slips.ts reports.ts assistant.ts push.ts notifications.ts admin/*.ts matching.ts lifecycle.ts stats.ts retention.ts demo.ts public.ts support.ts
  crons.ts  http.ts  convex.config.ts (components: betterAuth, pushNotifications, rateLimiter)
worker/index.ts               Cloudflare Worker — /api/auth pass-through; share-link preview /r/<slug> (ADR-006, ADR-024)
public/                       manifest.json, service-worker.js (web push), icons
tests/                        Vitest (rules, convex-test), Playwright (web smoke)
docs/                         all SpecPilot documents
```

#### 1.2.1 App identity and build profiles (fixed before the first native build — cannot change later without a new app)
| Item | Value |
|---|---|
| Android package (`android.package`) | `org.udvasito.app` |
| App name (launcher label) | `UDVASITO` (Bangla name shown inside the app, not in the launcher) |
| Deep-link scheme | `udvasito` (§1.4) |
| Version | Semantic `MAJOR.MINOR.PATCH` in `app.config.ts`; Android `versionCode` auto-incremented by EAS (`autoIncrement: true`) |
| Runtime version | `runtimeVersion: { policy: "fingerprint" }` — EAS Update only reaches builds whose native layer matches, so a JS update can never crash an older APK |
| EAS build profiles | `development` (dev client, internal), `preview` (APK, channel `preview`, points at **staging**), `production` (APK, channel `production`, points at **production**) |
| Environment per build | `EXPO_PUBLIC_CONVEX_URL`, `EXPO_PUBLIC_CONVEX_SITE_URL`, `EXPO_PUBLIC_SENTRY_DSN` set per EAS profile; web uses the same names from the Cloudflare Worker build variables (ADR-024) |
| Android notification channel | id `blood-requests`, importance MAX, sound default, vibration on, lock-screen visibility PUBLIC — safe because alert text never contains names or numbers (P-13), and a donor should see "B+ needed · 3 km" without unlocking — created at first launch |
| Permissions declared | `POST_NOTIFICATIONS`, `RECORD_AUDIO`, `ACCESS_COARSE_LOCATION`, `ACCESS_FINE_LOCATION`, `CAMERA` (slip photo), `INTERNET`. No background location, no contacts, no SMS, no call-log permissions |

### 1.3 Design system

#### 1.3.1 Colour tokens (light theme only in v1; contrast ratios checked against WCAG 2.2 AA)
| Token | Hex | Use | Contrast |
|---|---|---|---|
| `brand.primary` | `#C1121F` | Primary buttons, key accents, links | white text on it 6.22:1 ✅ |
| `brand.primaryPressed` | `#A50F1A` | Pressed / hover state | 7.83:1 ✅ |
| `brand.primarySoft` | `#FDECEE` | Tinted backgrounds, selected chips | `#C1121F` text on it 5.46:1 ✅ |
| `brand.logoRed` | `#E63946` | **Logo and illustrations only** — never behind text (4.17:1 ❌ with white) | — |
| `brand.navy` | `#1D3557` | Headers on web, secondary buttons | white text 12.36:1 ✅ |
| `text.primary` | `#111827` | Body text | 17.74:1 ✅ |
| `text.muted` | `#4B5563` | Secondary text (never lighter) | 7.56:1 ✅ |
| `border.input` | `#8A94A6` | Input borders, focus-less outlines | 3.06:1 ✅ (non-text) |
| `border.subtle` | `#E5E7EB` | Card dividers only (decorative) | — |
| `bg.app` | `#FFFFFF` | Screen background | — |
| `bg.surface` | `#F6F7F9` | Cards, sections | `#4B5563` on it 7.05:1 ✅ |
| `status.success` | `#1B7F3B` (fill) / `#1B6B34` on `#E8F5EC` (text) | Confirmed, verified | 5.07 / 5.85 ✅ |
| `status.warning` | `#8A4B00` on `#FFF4E0` | Unverified, waiting | 6.24 ✅ |
| `status.info` | `#1D4ED8` | Info banners, links on surface | 6.70 ✅ |
| `component.platelets` | `#6D28D9` | Platelet label (paired with an icon + word) | 7.10 ✅ |
| `component.dengue` | `#92400E` on `#FEF3C7` | Dengue chip | 6.37 ✅ |
| `focus.ring` | `#1D4ED8`, 2 px, 2 px offset | Keyboard focus (web) | — |

Status is **never shown by colour alone**: every coloured chip also has an icon and a word.

#### 1.3.2 Typography
Fonts: **Noto Sans** (Latin) + **Noto Sans Bengali** (Bangla), weights 400/600/700, loaded via `@expo-google-fonts`; system font fallback while loading.

| Token | Size / line height (EN) | Line height (BN) | Weight | Use |
|---|---|---|---|---|
| `display` | 28 / 34 | 40 | 700 | Home hero ("Need blood?") |
| `title` | 22 / 28 | 34 | 700 | Screen titles |
| `heading` | 18 / 24 | 30 | 600 | Section headings, card titles |
| `body` | 16 / 24 | 28 | 400 | Default text — **minimum size for content** |
| `bodyStrong` | 16 / 24 | 28 | 600 | Labels, values |
| `small` | 14 / 20 | 24 | 400 | Helper text, metadata |
| `caption` | 12 / 16 | 20 | 400 | Timestamps only — never instructions |

Text must scale with the OS font size up to 200 % without clipping (use `maxFontSizeMultiplier` 2.0 on key buttons only).

#### 1.3.3 Spacing, radius, elevation
Spacing scale 4/8/12/16/24/32/48 px. Screen padding 16 (mobile) / 24 (≥ 768 px). Radius: 8 (inputs, chips), 12 (cards), 999 (pills). Elevation: cards use a 1 px `border.subtle` border, no heavy shadows (performance on low-end phones). Touch targets ≥ 48 × 48 dp; primary buttons 52 dp tall, full width on mobile.

#### 1.3.4 Icons and imagery
`lucide-react-native` icons (free, tree-shaken). Logo: v0 blood-drop + cross, redrawn as SVG in `brand.logoRed` + white. No stock photos of real people (ethics + bandwidth). Illustrations: simple flat SVG, ≤ 15 KB each.

#### 1.3.5 Shared components (`src/components`)
| Component | Purpose / rules |
|---|---|
| `CMP-Button` | Variants `primary` (brand.primary), `secondary` (navy outline), `ghost`, `danger` (primary outline + warning icon). States: default, pressed, disabled (40 % opacity + `accessibilityState.disabled`), loading (spinner + label kept for screen readers). |
| `CMP-Input` | Label above (never placeholder-only), helper text, error text (red + icon, announced via `accessibilityLiveRegion="polite"`), character counter when a max applies. |
| `CMP-Select` / `CMP-SearchSelect` | Bottom sheet with search (Bangla + English matching), used for places and hospitals. |
| `CMP-BloodGroupPicker` | 4 × 2 grid of large tiles (A+ A− B+ B− AB+ AB− O+ O−) + row "Not sure" + "Any group (replacement donor)". Selected tile: `brand.primarySoft` background + check icon. |
| `CMP-ComponentToggle` | Segmented: "Whole blood" / "Platelets"; + "Dengue patient" chip that selects Platelets. |
| `CMP-NeededByPicker` | Chips: Now (urgent) / Today / Tomorrow / Pick date & time. |
| `CMP-PlacePicker` | Entry points: "Use my current location" button (nearest hospitals), hospital search (names + aliases), "My place isn't in the list" (thana + text). **"Drop a pin on the map" only when `features.pinMap` is on** (if-time, D-R2 — MapLibre is installed only when this is built). Shows the chosen place as a card with Change. |
| `CMP-AISuggestedField` | Wraps any form field filled by AI: small sparkle icon + label "AI suggested" until the user edits or confirms the field. |
| `CMP-SafetyCard` | Fixed copy `safety.money` with shield icon; shown at every number reveal. |
| `CMP-StatusTimeline` | Vertical steps for a request (posted → notified → opened → accepted → covered → closed) with counts and times. |
| `CMP-ContactCard` | Name, role chip, area/distance, phone, **Call** and **WhatsApp** buttons (`tel:` and `https://wa.me/<number>`), copy-number button. |
| `CMP-Banner` | `info` / `warning` / `success` / `error` with icon + text + optional action. |
| `CMP-OfflineBanner` | Sticky top banner when offline; shows pending outbox count. |
| `CMP-Skeleton` | Grey blocks matching the final layout. |
| `CMP-EmptyState` | Icon + title + body + optional action. |
| `CMP-ErrorState` | Icon + `errors.generic.title` + message from the error code + **Try again** + **Get help** (opens the helpline through `useHelpline()`, D-R3). |
| `CMP-LanguageToggle` | Two-segment "বাংলা / EN" in every header; on the welcome screen as two large buttons. |
| `CMP-Sheet` / `CMP-Dialog` | Accessible modal (focus trapped, Escape/back closes, title announced). |
| `CMP-Toast` | Short confirmations; never the only place an error is shown. |
| `CMP-PracticeBadge` | Yellow "PRACTICE" / "অনুশীলন" pill shown on every screen when the signed-in account or the viewed request is in the practice area (§1.9). |
| `CMP-CountdownChip` | "Volunteer contact in 0:21" / "Next search in 3:40" — updates every second, announced only on change of minute. |
| `CMP-ReportSheet` | Reasons + details + Block toggle (see SCR-C01). |
| `CMP-Markdown` | Renders team-written content pages (legal, learn, dengue) from `src/content/generated/*.json`. Supports only: `##`/`###` headings, paragraphs, bullet and numbered lists, **bold**, *italic*, links (external links open in the browser). No raw HTML. The JSON is produced at build time by `scripts/build-content.ts` using the `marked` lexer (MIT), so content changes ship with EAS Update. |

### 1.4 Navigation and layout

#### 1.4.1 Tab bar (signed-in area, mobile < 768 px)
| Tab | Route | Icon | Shown to |
|---|---|---|---|
| Home | `/home` | `house` | Everyone signed in |
| Requests | `/requests` | `clipboard-list` | Everyone (my requests) |
| Donate | `/donor` | `droplet` | Everyone (intro if no donor profile) — badge = unanswered alerts |
| Volunteer | `/volunteer` | `hand-heart` | Approved volunteers (and admins) |
| Admin | `/admin` | `shield` | Admins |
| More | `/more` | `menu` | Everyone (settings, assistant, learn, about, apply to volunteer, sign out) |

On screens ≥ 1024 px (desktop web) the tabs become a left sidebar; admin pages use a two-column layout (list + detail).

**Copy** (Q-014, 2026-11-27):
| Key | English | বাংলা |
|---|---|---|
| `tabs.home` | Home | হোম |
| `tabs.requests` | Requests | অনুরোধ |
| `tabs.donate` | Donate | রক্ত দিন |
| `tabs.volunteer` | Volunteer | স্বেচ্ছাসেবক |
| `tabs.admin` | Admin | অ্যাডমিন |
| `tabs.more` | More | আরও |

#### 1.4.2 Header (every screen)
Back button (when not a tab root) · screen title · `CMP-LanguageToggle` · `CMP-PracticeBadge` when applicable. No hamburger menus on mobile.

#### 1.4.3 Deep links
- App scheme `udvasito://` and web `https://udvasito.com` map to the same routes.
- Notification taps open `data.url` (e.g. `/alerts/<requestId>`, `/request/<id>`, `/confirm/<requestId>`).
- Shared links `https://udvasito.com/r/<slug>` (Cloudflare Worker preview route → `/r/<slug>` screen).

### 1.5 Global gates and states (root `_layout.tsx`, in this order)
| Gate | Condition | Result |
|---|---|---|
| G1 Version | `appVersion < public.appConfig.minimumAppVersion` (native only) | Redirect `SCR-O05 /update-required` |
| G2 Fonts/i18n | Not loaded | Splash (logo on white), max 2 s then system fonts |
| G3 Consent | User tries any action route and has **no** consent for the current `settings.consentVersion` — checked in the local record first; when signed in, a server `consents` row for that version also counts (then the local record is written from it, so a new device or reinstall does not ask again) | Redirect `SCR-O01 /welcome` (public routes exempt). A **new** consent version always shows the welcome screen once, with the changes summarised at the top |
| G4 Session | Route in `(app)` and not signed in | Redirect `SCR-O02 /sign-in?next=<route>` |
| G5 Onboarding | Signed in but profile incomplete (no name/DOB/phone) | Redirect `SCR-O03 /onboarding` |
| G6 Account status | `profile.status` ∈ frozen/suspended/banned/deletion_pending | Redirect `SCR-O06 /account-status` (frozen users can still **view** their own open request read-only) |
| G7 Role | Volunteer/admin route without the role | Show `CMP-ErrorState` with `ERR_FORBIDDEN` copy + Home button |

**Network states (every data screen):** loading → `CMP-Skeleton` (never a blank screen; spinner only inside buttons); offline → `CMP-OfflineBanner` + last cached data marked "Last updated hh:mm"; error → `CMP-ErrorState`; real-time disconnected > 10 s → poll every `S-33` (15 s).

### 1.6 Internationalisation rules
1. **Every** user-facing string comes from `en.json` / `bn.json` via `t('key')`. No string literals in components (lint rule `i18next/no-literal-string`).
2. Default language: English; Bangla if `expo-localization` reports `bn*`, if the shared link has `?lang=bn`, or after the user picks it. Stored in AsyncStorage and `profiles.language`.
3. Numbers and dates: `Intl.NumberFormat(lang === 'bn' ? 'bn-BD' : 'en-BD')`; dates with `date-fns` locale `bn` / `enGB`, time zone **Asia/Dhaka**. Formats: date `d MMM yyyy`, time `h:mm a`, relative "in 2 h" / "২ ঘণ্টার মধ্যে".
4. Plurals with i18next plural keys (`_one`, `_other`).
5. Blood groups are always written in Latin letters (A+, O−) in both languages — that is how they appear on hospital slips — with the Bangla name in accessibility labels ("এ পজিটিভ").
6. **Bangla copy in this file is a draft.** Member 3 reviews every Bangla string before public launch; keys never change after review.

### 1.7 Accessibility rules (apply to every screen)
- Every interactive element has `accessibilityRole`, `accessibilityLabel` (from i18n) and, where useful, `accessibilityHint`.
- Logical focus order top → bottom; after navigation, focus moves to the screen title.
- Errors: field-level message linked to the field + a summary banner on submit; announced politely.
- Countdown chips announce only on minute changes; toasts are also announced.
- Colour never carries meaning alone; contrast per §1.3.1.
- Web: semantic headings (`role="heading"` with level), skip-to-content link, visible focus ring, all actions keyboard-reachable, no keyboard traps, `lang` attribute switches with the language.
- Motion: respect "reduce motion" (no animated transitions when set).

### 1.8 Event emission points (PRD §2.2)
Events are written **only by the backend** (never trusted from the client) inside the mutation/action that causes them, via `convex/_lib/events.ts → recordEvent(name, {requestId, actorRole, props})`. `props` must never contain a phone number, a name or free text. Practice-area events carry `isDemo: true` and are excluded from all metrics.

### 1.9 Real, working platform — never a mock-up (vision principle 10)
Judges and users see the **live production platform**. These rules apply to every screen, function and deploy:
1. **Production holds only real data.** Real people, real requests, real reference data (places, hospitals, settings, reviewed FAQ). No sample records, invented numbers, placeholder donors, fake phone numbers or made-up testimonials — not even "for the presentation". Seed scripts other than `seed-places`, `seed-settings` and `import-hospitals` never run against production.
2. **Every visible control works.** No "coming soon" labels, placeholder screens, lorem ipsum, disabled-forever buttons or links to nowhere. A feature that is not finished is **invisible** (its `settings.features` switch is off) — never shown half-working.
3. **The practice area is the live system, not a simulation.** Same code paths, real push notifications, real AI calls, real Telegram, real phone calls — only the audience is limited to practice accounts, so a test request never wakes real donors. Code name `demo` (`isDemo`, `demoAreaEnabled`, `admin.demo.*`, `/admin/demo`, `ERR_DEMO_ISOLATION`); user-facing name **Practice area / অনুশীলন এলাকা**. Every practice screen shows `CMP-PracticeBadge` so nobody mistakes a practice request for a real emergency.
4. **Practice accounts belong to real phones** held by team members or judges and carry those phones' **real, verified numbers**, so Call and WhatsApp buttons really connect. There are no accounts without a person behind them.
5. **Real numbers are shown as real.** Dashboards and public pages show only measured values from real data, labelled with their update time; practice data is always excluded from them and shown separately, labelled "Practice".

---

## 2. Page inventory

**Release:** `core` = v1 core (Must) · `if-time` = v1 if time (Should). **Auth:** P = public, S = signed in, V = volunteer, A = admin. Platforms: all routes work on Android app and web unless noted.

| Screen | Route | Purpose | Auth | Release | Features / stories |
|---|---|---|---|---|---|
| SCR-P01 | `/` | Web landing + live anonymised impact; native: redirect to `/home` or `/welcome` | P | core (landing) / if-time (impact numbers) | F-1001, P01 |
| SCR-P02 | `/r/[slug]` | Anonymised shared request; "I can help" | P | if-time | F-1002, P02 |
| SCR-P03 | `/learn` | Donation basics, eligibility guidance, myths | P | if-time | F-1003, P03 |
| SCR-P04 | `/learn/dengue` | Dengue & platelets page | P | if-time | F-1004, P05 |
| SCR-P05 | `/about` | About, team, Responsible-AI commitments, data credits | P | core | F-1003, PRD §6.4 |
| SCR-P06 | `/privacy` | Privacy notice (versioned) | P | core | F-1003, F-101 |
| SCR-P07 | `/terms` | Terms of use (versioned) | P | core | F-1003, F-101 |
| SCR-P08 | `/download` | APK download + install guide; iPhone "Add to Home Screen" guide | P | core | F-1006, OQ-05 |
| SCR-P09 | `+not-found` | 404 | P | core | — |
| SCR-O01 | `/welcome` | Language choice + consent & permissions | P | core | F-101, F-104, X08 |
| SCR-O02 | `/sign-in` | Google sign-in | P | core | F-102, X01 |
| SCR-O03 | `/onboarding` | Name, date of birth (18+ gate), mobile number | S | core | F-102, X01 |
| SCR-O04 | `/verify-phone` | Telegram (later WhatsApp) phone verification | S | core | F-103, X01 |
| SCR-O05 | `/update-required` | App too old → download link | P | core | ADR-007 |
| SCR-O06 | `/account-status` | Frozen / suspended / banned / deletion pending | S | core | F-801, F-603 |
| SCR-M01 | `/home` | Role-aware home: Need blood CTA, my active request, requests for me, donor status, duty toggle | S | core | R01, D02, D05, V09 |
| SCR-M02 | `/request/new` | New request: speak / write / form → review → post | S | core | F-201–F-207, R01–R03, R14 |
| SCR-M03 | `/request/[id]` | Requester's live request status and contacts | S (owner) | core | F-407, F-403, F-406, F-501, F-504 |
| SCR-M04 | `/requests` | My requests (active, closed) + Request again | S | core (list) / if-time (repeat) | R08, R15 |
| SCR-M05 | `/request/[id]/share` | Appeal card + share | S (owner) | if-time | F-1005, R11 |
| SCR-M06 | `/settings` | Account settings: language, profile, notifications, privacy & data links, sign out | S | core | F-104, F-105 |
| SCR-M07 | `/settings/my-data` | Who has my number, download data, delete account | S | core | F-603, D07 |
| SCR-M08 | `/assistant` | "Can I donate?" FAQ assistant | S | if-time | F-604, D10 |
| SCR-M09 | `/confirm/[requestId]` | "Did the donation happen?" | S | core | F-502, R09 |
| SCR-M10 | `/more` | More menu | S | core | — |
| SCR-D01 | `/donor` | Donor tab: intro or donor dashboard | S | core | D01, D05, D06 |
| SCR-D02 | `/donor/setup` | Become a donor (4 steps) | S | core | F-601, D01 |
| SCR-D03 | `/alerts` | Requests for me (inbox) | S (donor) | core | F-305, D02 |
| SCR-D04 | `/alerts/[requestId]` | Donor's view of one request: decide, act, still coming, withdraw, report | S (donor) | core | F-401–F-405, F-408, D03, D04, D08, D16 |
| SCR-D05 | `/donor/settings` | Alert limits, privacy options, platelets opt-in, hide profile | S (donor) | core (privacy, platelets) / if-time (limits) | F-404, F-308, D09, D16 |
| SCR-D06 | `/donor/history` | Donation history & badges | S (donor) | if-time | F-506, D12 |
| SCR-D07 | `/donor/alert-guide` | Make sure alerts reach you | S | core | F-304 |
| SCR-C01 | (sheet) | Report & block | S | core | F-801, D08 |
| SCR-V01 | `/volunteer/apply` | Volunteer application | S | core | F-701, V01 |
| SCR-V02 | `/volunteer` | Duty toggle, areas, request board | V | core | F-702, F-703, V02, V09 |
| SCR-V03 | `/volunteer/request/[id]` | Volunteer view: claim, find donors, ask, contacts, slip | V | core | F-704, F-705, V03, V10 |
| SCR-V04 | `/volunteer/slips` | Slip check queue | V | if-time | F-706, V05 |
| SCR-V05 | `/volunteer/post` | Post on behalf of a family from a public post | V | if-time | F-211, V04 |
| SCR-V06 | `/volunteer/verify` | Verify a person's number in person (volunteers and admins) | V | core | F-103, D-R1 |
| SCR-A01 | `/admin` | Dashboard | A | core | F-901 |
| SCR-A02 | `/admin/moderation` | Moderation queue | A | core | F-803 |
| SCR-A03 | `/admin/moderation/[id]` | Moderation item detail + decision | A | core | F-803 |
| SCR-A04 | `/admin/people` | People search + volunteer applications | A | core | F-903 |
| SCR-A05 | `/admin/people/[id]` | Person detail: roles, status, reveal number with reason | A | core | F-903, F-805 |
| SCR-A06 | `/admin/audit` | Audit log | A | core | F-804 |
| SCR-A07 | `/admin/ai` | AI controls & log | A | core | F-902 |
| SCR-A08 | `/admin/usage` | Free-tier usage monitor | A | core | F-911 |
| SCR-A09 | `/admin/demo` | Practice area controls | A | core | F-912 |
| SCR-A10 | `/admin/settings` | Rule settings (read-only in core; editable if-time) | A | core (read-only) / if-time (edit) | F-904 |
| SCR-A11 | `/admin/directory` | Hospitals & blood banks | A | if-time | F-906 |
| SCR-A12 | `/admin/faq` | FAQ management | A | if-time | F-907 |
| SCR-A13 | `/admin/data` | Import / export | A | if-time | F-905 |

---

## 3. Screen specifications

Template per screen: **Purpose · Layout (top → bottom) · Copy · States · Behaviour · Events · Accessibility notes.** Copy is given as `key` — English — বাংলা. Common keys (`common.*`) are defined once in §3.0.

### 3.0 Common copy
| Key | English | বাংলা |
|---|---|---|
| `common.appName` | UDVASITO | উদ্ভাসিত |
| `common.tagline` | Find blood donors when time matters | সময় যখন জরুরি, রক্তদাতা খুঁজুন |
| `common.continue` | Continue | এগিয়ে যান |
| `common.back` | Back | পেছনে |
| `common.cancel` | Cancel | বাতিল |
| `common.save` | Save | সংরক্ষণ করুন |
| `common.done` | Done | সম্পন্ন |
| `common.edit` | Edit | সম্পাদনা |
| `common.change` | Change | পরিবর্তন |
| `common.retry` | Try again | আবার চেষ্টা করুন |
| `common.getHelp` | Get help | সাহায্য নিন |
| `common.call` | Call | কল করুন |
| `common.whatsapp` | WhatsApp | হোয়াটসঅ্যাপ |
| `common.copyNumber` | Copy number | নম্বর কপি করুন |
| `common.copied` | Copied | কপি হয়েছে |
| `common.lastUpdated` | Last updated {{time}} | সর্বশেষ আপডেট {{time}} |
| `common.offline` | You're offline. We'll send your changes when you're back online. ({{count}} waiting) | আপনি অফলাইনে আছেন। অনলাইনে ফিরলে পরিবর্তনগুলো পাঠানো হবে। ({{count}}টি অপেক্ষায়) |
| `common.saving` | Saving… | সংরক্ষণ হচ্ছে… |
| `common.sent` | Sent | পাঠানো হয়েছে |
| `common.waitingNetwork` | Waiting for network | নেটওয়ার্কের অপেক্ষায় |
| `common.aiSuggested` | AI suggested | AI প্রস্তাবিত |
| `common.demo` | PRACTICE | অনুশীলন |
| `common.notMedicalAdvice` | This is general guidance, not medical advice. The blood bank decides. | এটি সাধারণ নির্দেশনা, চিকিৎসা পরামর্শ নয়। চূড়ান্ত সিদ্ধান্ত ব্লাড ব্যাংকের। |
| `common.notBloodBank` | UDVASITO connects people. It is not a blood bank or a medical service. | উদ্ভাসিত মানুষকে যুক্ত করে। এটি কোনো ব্লাড ব্যাংক বা চিকিৎসা সেবা নয়। |
| `safety.money` | UDVASITO never asks for money. Never send money to anyone for blood. | উদ্ভাসিত কখনো টাকা চায় না। রক্তের জন্য কাউকে কখনো টাকা পাঠাবেন না। |
| `errors.generic.title` | Something went wrong | কিছু একটা সমস্যা হয়েছে |
| `blood.wholeBlood` | Whole blood | সম্পূর্ণ রক্ত |
| `blood.platelets` | Platelets | প্লাটিলেট |
| `blood.notSure` | Not sure | নিশ্চিত নই |
| `blood.any` | Any group (replacement donor) | যেকোনো গ্রুপ (রিপ্লেসমেন্ট ডোনার) |
| `units_one` / `units_other` | {{count}} bag / {{count}} bags | {{count}} ব্যাগ |
| `urgency.now` | Now (urgent) | এখনই (জরুরি) |
| `urgency.today` | Today | আজ |
| `urgency.tomorrow` | Tomorrow | আগামীকাল |
| `urgency.pick` | Pick date & time | তারিখ ও সময় বেছে নিন |

### 3.1 Onboarding

#### SCR-O01 · Welcome, language & consent · `/welcome`
**Purpose:** first screen on first open; choose language; read and accept terms, privacy, AI notice and permissions list (X08, C3).
**Layout:** (1) logo + `common.appName` + `common.tagline`; (2) two large buttons **বাংলা** / **English** (pre-selected per §1.6); (3) card "Before you start" with 4 expandable rows: Terms, Privacy, How AI is used, Permissions we may ask for; (4) checkbox `welcome.consent`; (5) primary button `common.continue` (disabled until ticked); (6) footer `common.notBloodBank`.
**Copy:**
| Key | English | বাংলা |
|---|---|---|
| `welcome.title` | Welcome to UDVASITO | উদ্ভাসিতে স্বাগতম |
| `welcome.chooseLanguage` | Choose your language | ভাষা বেছে নিন |
| `welcome.beforeStart` | Before you start | শুরু করার আগে |
| `welcome.terms` | Terms of use | ব্যবহারের শর্তাবলি |
| `welcome.privacy` | Privacy notice — what we collect and why | গোপনীয়তা নীতি — আমরা কী তথ্য নিই এবং কেন |
| `welcome.ai` | How AI is used: when you type or paste a request, the text (with phone numbers, names and illnesses removed) may be processed by an AI service to fill the form. You always check it before posting. AI never decides who is contacted. | AI কীভাবে ব্যবহার হয়: আপনি অনুরোধ লিখলে বা পেস্ট করলে, লেখাটি (ফোন নম্বর, নাম ও রোগের তথ্য বাদ দিয়ে) ফর্ম পূরণের জন্য একটি AI সেবায় যেতে পারে। পোস্ট করার আগে আপনি সবসময় তা যাচাই করবেন। কাকে যোগাযোগ করা হবে তা AI কখনো ঠিক করে না। |
| `welcome.voice` | Voice: your phone's or browser's own speech service turns your voice into text (this may be Google's service). UDVASITO never receives your audio. | ভয়েস: আপনার ফোন বা ব্রাউজারের নিজস্ব সেবা কণ্ঠস্বরকে লেখায় রূপান্তর করে (এটি Google-এর সেবা হতে পারে)। উদ্ভাসিত কখনো আপনার অডিও পায় না। |
| `welcome.permissions` | Permissions we may ask for, only when you use the feature: Location — to find where blood is needed or your area (we never store your live location). Notifications — to alert donors and update you. Microphone — to speak a request. Camera/Photos — to attach a hospital slip. | যে অনুমতিগুলো চাওয়া হতে পারে, শুধু ফিচার ব্যবহারের সময়: অবস্থান — কোথায় রক্ত লাগবে বা আপনার এলাকা খুঁজতে (আপনার সরাসরি অবস্থান আমরা কখনো সংরক্ষণ করি না)। নোটিফিকেশন — রক্তদাতাদের জানাতে ও আপনাকে আপডেট দিতে। মাইক্রোফোন — মুখে বলে অনুরোধ করতে। ক্যামেরা/ছবি — হাসপাতালের স্লিপ যুক্ত করতে। |
| `welcome.consent` | I am 18 or older and I agree to the Terms and Privacy notice. | আমার বয়স ১৮ বা তার বেশি এবং আমি শর্তাবলি ও গোপনীয়তা নীতিতে সম্মত। |
**States:** loading — none (static); error — if the consent version can't be fetched offline, use the bundled version; success — store `{consentVersion, acceptedAt, lang}` locally, then route to `next` or `/sign-in` (consent is copied to the server at onboarding, `consents.accept`).
**Behaviour:** language buttons switch the whole screen immediately. Public pages linked from rows open in a sheet.
**A11y:** checkbox label is the full sentence; the Continue button's disabled state is announced.

#### SCR-O02 · Sign in · `/sign-in`
**Purpose:** one-tap Google sign-in (ADR-003). Email code only if `settings.emailSignInEnabled` (T-5: off). Practice sign-in only while the practice area is on (D-R4).
**Layout:** (1) title; (2) body; (3) **Continue with Google** button (Google logo per Google branding rules); (4) small text `signin.why`; (5) button `signin.helpline` — on tap, `useHelpline()` fetches the number from `GET /public/helpline` and shows it as a tap-to-call button (`signin.helplineCall`); the number is **never in the page HTML or the app bundle** (D-R3); (6) small link `signin.practice`, shown only when `public.appConfig.practiceAreaEnabled` — opens a sheet with Practice ID (e.g. `P-07`) + 6-digit PIN (VAL-27) + `signin.practiceNote`; signs in through Better Auth email + password with the synthetic address `<id>@practice.udvasito.invalid` (D-R4).
**Copy:**
| Key | English | বাংলা |
|---|---|---|
| `signin.title` | Sign in | সাইন ইন করুন |
| `signin.body` | One tap with your Google account. You'll only do this once. | আপনার Google অ্যাকাউন্ট দিয়ে এক ট্যাপে। এটি শুধু একবারই করতে হবে। |
| `signin.google` | Continue with Google | Google দিয়ে চালিয়ে যান |
| `signin.why` | We use your Google account only to sign you in. We never post anything. | আমরা আপনার Google অ্যাকাউন্ট শুধু সাইন ইনের জন্য ব্যবহার করি। কখনো কিছু পোস্ট করি না। |
| `signin.helpline` | Need blood right now? Call the UDVASITO helpline | এখনই রক্ত লাগবে? উদ্ভাসিত হেল্পলাইনে কল করুন |
| `signin.helplineCall` | Call {{phone}} | {{phone}} নম্বরে কল করুন |
| `signin.practice` | Practice sign-in (for judges and training) | অনুশীলন সাইন ইন (বিচারক ও প্রশিক্ষণের জন্য) |
| `signin.practiceId` | Practice ID | অনুশীলন আইডি |
| `signin.practicePin` | 6-digit PIN | ৬ অঙ্কের পিন |
| `signin.practiceNote` | Practice requests reach only practice accounts — never real donors. Everything else works exactly like the real app. | অনুশীলনের অনুরোধ শুধু অনুশীলন অ্যাকাউন্টে যায় — কখনো আসল রক্তদাতাদের কাছে নয়। বাকি সবকিছু আসল অ্যাপের মতোই কাজ করে। |
| `signin.practiceLocked` | Too many wrong PINs. Try again in 15 minutes. | অনেকবার ভুল পিন দেওয়া হয়েছে। ১৫ মিনিট পর আবার চেষ্টা করুন। |
| `signin.error` | Sign-in didn't finish. Please try again. | সাইন ইন সম্পন্ন হয়নি। আবার চেষ্টা করুন। |
**States:** loading — button spinner while the browser session is open; error — `signin.error` banner + retry; practice — wrong PIN → `ERR_VALIDATION` message, 5 wrong PINs per ID in 15 min → `signin.practiceLocked`; helpline over its rate limit → `ERR_RATE_LIMITED` with minutes; success — if profile incomplete → `/onboarding`, else `next` or `/home`. A practice account goes through the same onboarding with the **real number of the phone it is used on**.

#### SCR-O03 · About you · `/onboarding`
**Purpose:** collect the minimum profile: full name, date of birth (18+), mobile number. Under-18 → blocked (G-13).
**Layout:** (1) title + body; (2) `Full name` input (VAL-01); (3) `Date of birth` date picker (VAL-02) with helper `onboarding.dobHelp`; (4) `Mobile number` input with fixed "+88" prefix (VAL-03) + helper `onboarding.phoneHelp`; (5) primary `common.continue`.
**Copy:**
| Key | English | বাংলা |
|---|---|---|
| `onboarding.title` | About you | আপনার সম্পর্কে |
| `onboarding.body` | Three quick details. You can change them later. | তিনটি তথ্য দিন। পরে পরিবর্তন করা যাবে। |
| `onboarding.name` | Full name | পূর্ণ নাম |
| `onboarding.dob` | Date of birth | জন্ম তারিখ |
| `onboarding.dobHelp` | You must be 18 or older to use UDVASITO. | উদ্ভাসিত ব্যবহার করতে বয়স ১৮ বা তার বেশি হতে হবে। |
| `onboarding.phone` | Mobile number | মোবাইল নম্বর |
| `onboarding.phoneHelp` | Shared only inside a blood request you take part in, and with on-duty volunteers when you ask for blood. Never shown publicly. | শুধু আপনি যে রক্তের অনুরোধে যুক্ত সেখানে, এবং আপনি রক্ত চাইলে দায়িত্বরত স্বেচ্ছাসেবকদের সাথে শেয়ার হয়। কখনো প্রকাশ্যে দেখানো হয় না। |
| `onboarding.underage.title` | Sorry, you need to be 18 or older | দুঃখিত, বয়স ১৮ বা তার বেশি হতে হবে |
| `onboarding.underage.body` | Please ask an adult family member to post the request. In an emergency, call the helpline. | অনুগ্রহ করে পরিবারের কোনো প্রাপ্তবয়স্ক সদস্যকে অনুরোধ করতে বলুন। জরুরি প্রয়োজনে হেল্পলাইনে কল করুন। |
**States:** loading — submit spinner; error — field errors (§4) + `ERR_*` banner; special — **under-18**: replace the form with the underage message + helpline button; the account is marked `status: "underage_blocked"`, sign-out offered; success — `profiles.completeOnboarding` → route to `next` (if it was `/request/new`, go straight there) else `/home`; a non-blocking banner on Home invites phone verification.
**Events:** `profile_completed`.

#### SCR-O04 · Verify your phone · `/verify-phone`
**Purpose:** ৳0 verification via Telegram (ADR-004) or **in person** with an admin or volunteer (D-R1); WhatsApp shown only if `settings.verification.whatsapp`.
**Layout:** (1) title + body; (2) method card **Telegram** — button `verify.telegram` (opens `https://t.me/<bot>?start=<token>`); steps 1–3 shown; (3) method card **WhatsApp** (hidden unless enabled) — button opens `https://wa.me/<number>?text=VERIFY%20<code>`; (3b) method card **In person** (shown when `settings.verification.inPerson`) — button `verify.inPerson` → `phoneVerification.startInPerson` → large code `verify.inPersonCode` + `verify.inPersonSteps` + notice `verify.inPersonNotice`; (4) status area (live): waiting / verified / mismatch / expired; (5) link `verify.later`.
**Copy:**
| Key | English | বাংলা |
|---|---|---|
| `verify.title` | Verify your mobile number | আপনার মোবাইল নম্বর যাচাই করুন |
| `verify.body` | This keeps fake requests out. It takes about 30 seconds and costs nothing. | এতে ভুয়া অনুরোধ ঠেকানো যায়। প্রায় ৩০ সেকেন্ড লাগে, কোনো খরচ নেই। |
| `verify.telegram` | Verify with Telegram | টেলিগ্রাম দিয়ে যাচাই করুন |
| `verify.telegramSteps` | 1. Tap the button — Telegram opens. 2. Tap Start, then "Share my phone number". 3. Come back here. | ১. বোতামে ট্যাপ করুন — টেলিগ্রাম খুলবে। ২. Start চাপুন, তারপর "Share my phone number"। ৩. এখানে ফিরে আসুন। |
| `verify.whatsapp` | Verify with WhatsApp | হোয়াটসঅ্যাপ দিয়ে যাচাই করুন |
| `verify.whatsappSteps` | 1. Tap the button — WhatsApp opens with a message ready. 2. Tap Send. 3. Come back here. | ১. বোতামে ট্যাপ করুন — হোয়াটসঅ্যাপে একটি বার্তা তৈরি থাকবে। ২. Send চাপুন। ৩. এখানে ফিরে আসুন। |
| `verify.inPerson` | Verify in person (at a campus drive or with a volunteer) | সরাসরি যাচাই করুন (ক্যাম্পে বা স্বেচ্ছাসেবকের কাছে) |
| `verify.inPersonCode` | Your code: {{code}} (valid for 10 minutes) | আপনার কোড: {{code}} (১০ মিনিট পর্যন্ত বৈধ) |
| `verify.inPersonSteps` | 1. Show this code to an UDVASITO admin or volunteer. 2. When they ask, call their phone — they will reject the call, so it costs nothing. 3. They confirm, and your number is verified. | ১. এই কোডটি উদ্ভাসিতের একজন অ্যাডমিন বা স্বেচ্ছাসেবককে দেখান। ২. তাঁরা বললে তাঁদের ফোনে কল দিন — তাঁরা কল কেটে দেবেন, তাই কোনো খরচ নেই। ৩. তাঁরা নিশ্চিত করলেই আপনার নম্বর যাচাই হয়ে যাবে। |
| `verify.inPersonNotice` | When you call, the verifier's phone shows your number. They delete it from their call list afterwards. | কল দিলে যাচাইকারীর ফোনে আপনার নম্বর দেখা যাবে। পরে তাঁরা কল তালিকা থেকে তা মুছে ফেলবেন। |
| `verify.waiting` | Waiting for confirmation… | নিশ্চিতকরণের অপেক্ষায়… |
| `verify.success` | Your number {{phone}} is verified. | আপনার নম্বর {{phone}} যাচাই হয়েছে। |
| `verify.mismatch` | Telegram shared {{verified}}, which is different from {{entered}}. Use {{verified}} as your number? | টেলিগ্রাম {{verified}} নম্বরটি দিয়েছে, যা {{entered}} থেকে আলাদা। {{verified}} কি আপনার নম্বর হিসেবে ব্যবহার করবেন? |
| `verify.useVerified` | Yes, use {{verified}} | হ্যাঁ, {{verified}} ব্যবহার করুন |
| `verify.expired` | The link expired. Tap the button again. | লিংকের মেয়াদ শেষ। আবার বোতামে ট্যাপ করুন। |
| `verify.later` | Do this later | পরে করব |
| `verify.laterNote` | You can still post a request now. Until you verify, you can have 1 open request and donors will see "phone not yet verified". | এখনই অনুরোধ পাঠাতে পারবেন। যাচাই না করা পর্যন্ত একটি অনুরোধ খোলা রাখা যাবে এবং রক্তদাতারা দেখবেন "ফোন এখনো যাচাই হয়নি"। |
**States:** loading — creating token (button spinner); waiting — live query `phoneVerification.status`, timeout 10 min (`expired`); success — green banner, auto-return to `next` after 2 s; mismatch — confirm dialog; error — `ERR_VERIFICATION_EXPIRED`, `ERR_PHONE_IN_USE` messages.
**Events:** `phone_verification_started{method}`, `phone_verified{method}`.

#### SCR-O05 · Update required · `/update-required`
**Copy:** `update.title` "Please update UDVASITO" / "উদ্ভাসিত আপডেট করুন"; `update.body` "This version is too old to work safely. Download the latest version — it takes a minute." / "এই সংস্করণটি নিরাপদে কাজ করার জন্য অনেক পুরোনো। সর্বশেষ সংস্করণ ডাউনলোড করুন — এক মিনিট লাগবে।"; button `update.download` "Download update" / "আপডেট ডাউনলোড করুন" → `settings.apkUrl`; secondary "Use the web app" / "ওয়েব অ্যাপ ব্যবহার করুন" → `https://udvasito.com`.

#### SCR-O06 · Account status · `/account-status`
| Status | Title EN / BN | Body EN / BN | Actions |
|---|---|---|---|
| `frozen` | Your account is paused for review / আপনার অ্যাকাউন্ট পর্যালোচনার জন্য স্থগিত | We received a report and an admin will review it soon. You can still view your open request. / একটি অভিযোগ পাওয়া গেছে, একজন অ্যাডমিন শিগগিরই তা পর্যালোচনা করবেন। আপনি এখনো আপনার খোলা অনুরোধ দেখতে পারবেন। | View my request · Call helpline |
| `suspended` | Your account is suspended / আপনার অ্যাকাউন্ট সাময়িকভাবে বন্ধ | Reason: {{reason}}. Until {{date}}. / কারণ: {{reason}}। {{date}} পর্যন্ত। | Call helpline |
| `banned` | Your account is closed / আপনার অ্যাকাউন্ট বন্ধ করা হয়েছে | Reason: {{reason}}. / কারণ: {{reason}}। | Contact us (email) |
| `deletion_pending` | Your account is being deleted / আপনার অ্যাকাউন্ট মুছে ফেলা হচ্ছে | Your personal data will be removed by {{date}}. Changed your mind? / {{date}}-এর মধ্যে আপনার ব্যক্তিগত তথ্য মুছে ফেলা হবে। মত বদলেছেন? | Cancel deletion |

**Action copy** (Q-014; "Call helpline" uses `request.fallbackTitle`):
| Key | English | বাংলা |
|---|---|---|
| `accountStatus.viewRequest` | View my request | আমার অনুরোধ দেখুন |
| `accountStatus.contactUs` | Contact us by email | আমাদের ইমেইল করুন |
| `accountStatus.cancelDeletion` | Cancel deletion | মুছে ফেলা বাতিল করুন |

### 3.2 Requester

#### SCR-M01 · Home · `/home`
**Purpose:** fastest path to "Need blood"; show what needs attention.
**Layout (sections appear only when relevant, in this order):**
1. `CMP-Banner` (warning) if phone not verified: `home.verifyBanner` + Verify button.
2. **Hero card** (brand.primary background, white text): `home.needBlood` (display) + button `home.needBloodCta` → `/request/new`. Under it: small link `home.dengueCta` → `/request/new?dengue=1`.
3. **My active request** card(s) (max 2): blood group, units covered `x/y`, status chip, "Open" → `/request/[id]`.
4. **Requests for me** (donors only): count of unanswered alerts + top 3 items → `/alerts`.
5. **Donor status** card (donors only): availability chip + `donor.eligibleAgain` date or "Available now" + quick toggle "Pause".
6. **Volunteer duty** card (volunteers): On duty switch + "Open board".
7. **Become a donor** card (non-donors): `home.becomeDonor` → `/donor/setup`.
8. Footer links: Learn · Dengue & platelets · About.
**Copy:**
| Key | English | বাংলা |
|---|---|---|
| `home.needBlood` | Need blood? | রক্ত লাগবে? |
| `home.needBloodCta` | Request blood now | এখনই রক্তের অনুরোধ করুন |
| `home.dengueCta` | Dengue patient? Ask for platelets | ডেঙ্গু রোগী? প্লাটিলেটের অনুরোধ করুন |
| `home.verifyBanner` | Verify your number so donors trust your requests. | আপনার নম্বর যাচাই করুন, যাতে রক্তদাতারা আপনার অনুরোধে আস্থা রাখেন। |
| `home.verifyCta` | Verify | যাচাই করুন |
| `home.myRequest` | Your request | আপনার অনুরোধ |
| `home.covered` | {{confirmed}} of {{needed}} bags arranged | {{needed}} ব্যাগের মধ্যে {{confirmed}} ব্যাগের ব্যবস্থা হয়েছে |
| `home.requestsForMe` | Requests for you | আপনার জন্য অনুরোধ |
| `home.requestsForMeCount_one` / `_other` | {{count}} request waiting for your answer / {{count}} requests waiting for your answer | {{count}}টি অনুরোধ আপনার উত্তরের অপেক্ষায় |
| `home.becomeDonor` | Become a donor — it takes 2 minutes | রক্তদাতা হোন — মাত্র ২ মিনিট লাগে |
| `home.onDuty` | On duty | ডিউটিতে আছি |
**States:** loading — skeleton for hero + 2 cards (hero renders instantly without data); empty — hero + Become a donor only; error — hero still works (static), other sections show inline `CMP-ErrorState` small variant; offline — banner; hero still opens the form (outbox).
**Events:** none (navigation only).

#### SCR-M02 · New request · `/request/new`
**Purpose:** post a request in ≤ 60 s; voice, free text/paste, or form; AI suggestions confirmed by the requester (F-201–F-207).
**Query params:** `dengue=1` pre-selects Platelets + dengue chip; `repeat=<requestId>` pre-fills from an old request; `lang` respected.
**Layout — one scrolling screen with three parts:**
- **Part A · Tell us quickly (optional helper):** card with two buttons: 🎤 `request.speak` and ✍️ `request.write`. "Write" expands a multiline box (`request.writeLabel`, VAL-13) + `request.aiNotice` + button `request.fillForm`. "Speak" starts recognition (ADR-011): live transcript appears in the same box (editable), then `request.fillForm`.
- **Part B · Request details (the form):** `CMP-BloodGroupPicker` (VAL-04) · `CMP-ComponentToggle` + dengue chip (VAL-05) · Units stepper 1–10 (VAL-06) · `CMP-PlacePicker` (VAL-07) · `CMP-NeededByPicker` (VAL-08) · Contact number (pre-filled with my number, editable, VAL-03, helper `request.contactHelp`) · **More details (optional)** collapsible: Patient name (VAL-09), Ward/bed (VAL-10), Note (VAL-11), Attach hospital slip (if-time, VAL-12).
- **Part C · Review & post:** summary card (all chosen values, AI-suggested ones marked) · `common.notBloodBank` · primary button `request.post` · after tap: outbox state line.
**Copy:**
| Key | English | বাংলা |
|---|---|---|
| `request.new.title` | Request blood | রক্তের অনুরোধ |
| `request.quick` | Tell us quickly (optional) | দ্রুত বলুন (ঐচ্ছিক) |
| `request.speak` | Speak | মুখে বলুন |
| `request.write` | Write or paste | লিখুন বা পেস্ট করুন |
| `request.writeLabel` | Describe it in your own words, or paste a post | নিজের ভাষায় লিখুন, অথবা কোনো পোস্ট পেস্ট করুন |
| `request.writePlaceholder` | e.g. "2 bag B+ lagbe kal sokal CMCH e" | যেমন: "কাল সকালে চমেকে ২ ব্যাগ বি পজিটিভ লাগবে" |
| `request.aiNotice` | Please don't include names. Phone numbers, names and illnesses are removed before an AI service reads the text. | অনুগ্রহ করে কারও নাম লিখবেন না। AI সেবা পড়ার আগে ফোন নম্বর, নাম ও রোগের তথ্য সরিয়ে ফেলা হয়। |
| `request.fillForm` | Fill the form for me | আমার হয়ে ফর্ম পূরণ করুন |
| `request.listening` | Listening… speak now | শুনছি… এখন বলুন |
| `request.voiceUnavailable` | Voice isn't available on this device. Please write or use the form. | এই ডিভাইসে ভয়েস সুবিধা নেই। অনুগ্রহ করে লিখুন বা ফর্ম ব্যবহার করুন। |
| `request.aiFilled` | We filled {{count}} fields. Please check them. | আমরা {{count}}টি ঘর পূরণ করেছি। অনুগ্রহ করে যাচাই করুন। |
| `request.aiMissing` | We couldn't find: {{fields}}. Please fill these in. | এগুলো পাওয়া যায়নি: {{fields}}। অনুগ্রহ করে পূরণ করুন। |
| `request.aiUnavailable` | The AI helper isn't available right now. Your text is saved — please fill the form below. | AI সহায়তা এখন পাওয়া যাচ্ছে না। আপনার লেখা সংরক্ষিত আছে — নিচের ফর্মটি পূরণ করুন। |
| `request.details` | Request details | অনুরোধের বিবরণ |
| `request.bloodGroup` | Blood group needed | কোন গ্রুপের রক্ত লাগবে |
| `request.whatNeeded` | What is needed | কী প্রয়োজন |
| `request.dengue` | Dengue patient | ডেঙ্গু রোগী |
| `request.units` | How many bags | কত ব্যাগ |
| `request.where` | Where is blood needed? | কোথায় রক্ত লাগবে? |
| `request.useLocation` | Use my current location | আমার বর্তমান অবস্থান ব্যবহার করুন |
| `request.searchHospital` | Search hospital or area | হাসপাতাল বা এলাকা খুঁজুন |
| `request.dropPin` | Drop a pin on the map | মানচিত্রে পিন দিন |
| `request.nearestHospitals` | Hospitals near you | আপনার কাছের হাসপাতাল |
| `request.notInList` | My place isn't in the list | আমার জায়গাটি তালিকায় নেই |
| `request.when` | When is it needed? | কখন লাগবে? |
| `request.contact` | Contact number | যোগাযোগের নম্বর |
| `request.contactHelp` | Only donors who agree to help will see this number. | শুধু যে রক্তদাতারা সাহায্য করতে রাজি হবেন, তারাই এই নম্বর দেখবেন। |
| `request.more` | More details (optional) | আরও তথ্য (ঐচ্ছিক) |
| `request.patientName` | Patient's name | রোগীর নাম |
| `request.patientNameHelp` | Shown only to donors who are confirmed to help. | শুধু নিশ্চিত হওয়া রক্তদাতারা দেখবেন। |
| `request.ward` | Ward / bed | ওয়ার্ড / বেড |
| `request.note` | Note for donors | রক্তদাতাদের জন্য নোট |
| `request.slip` | Attach hospital slip (gets a "verified" badge) | হাসপাতালের স্লিপ যুক্ত করুন ("যাচাইকৃত" ব্যাজ পাবেন) |
| `request.review` | Check and post | যাচাই করে পাঠান |
| `request.post` | Post request | অনুরোধ পাঠান |
| `request.posting` | Posting… donors will be alerted in seconds | পাঠানো হচ্ছে… কয়েক সেকেন্ডের মধ্যে রক্তদাতাদের জানানো হবে |
| `request.duplicate.title` | This may already be posted | এটি হয়তো আগেই পোস্ট করা হয়েছে |
| `request.duplicate.body` | A {{group}} request at {{hospital}} was posted {{time}}. Is it the same patient? | {{hospital}}-এ {{group}} গ্রুপের একটি অনুরোধ {{time}} পোস্ট হয়েছে। এটি কি একই রোগী? |
| `request.duplicate.join` | Yes, open that request | হ্যাঁ, সেই অনুরোধটি খুলুন |
| `request.duplicate.postAnyway` | No, post mine | না, আমারটি পাঠান |
**Copy — labels the layout names in English only, or not at all** (Q-019, 2026-11-27; member 3 reviews the Bangla):
| Key | English | বাংলা |
|---|---|---|
| `request.unitsIncrease` | Increase bags | ব্যাগ বাড়ান |
| `request.unitsDecrease` | Decrease bags | ব্যাগ কমান |
| `request.unitsCount_one` | {{count}} bag | {{count}} ব্যাগ |
| `request.unitsCount_other` | {{count}} bags | {{count}} ব্যাগ |
| `request.placeText` | Hospital, clinic or area name | হাসপাতাল, ক্লিনিক বা এলাকার নাম |
| `request.distance` | {{km}} km away | {{km}} কিমি দূরে |
| `request.noHospitalsNear` | We couldn't find a listed hospital near you. Please choose your area below. | আপনার কাছে তালিকাভুক্ত কোনো হাসপাতাল পাওয়া যায়নি। অনুগ্রহ করে নিচে আপনার এলাকা বেছে নিন। |
| `request.pickDate` | Date | তারিখ |
| `request.pickTime` | Time | সময় |
| `request.neededByAt` | Needed by {{when}} | {{when}}-এর মধ্যে লাগবে |
| `request.monthlyLimit` | You've reached this month's request limit. | এ মাসের অনুরোধের সীমা শেষ। |
| `validation.VAL-08.empty` | Please choose when blood is needed. | কখন রক্ত লাগবে তা বেছে নিন। |
**States:**
- *Loading:* form renders immediately (no network needed); places/hospitals come from the bundled list.
- *AI working:* "Fill the form for me" shows spinner; form remains editable; timeout 8 s → `request.aiUnavailable`.
- *AI success:* fields set + `CMP-AISuggestedField` markers + `request.aiFilled` toast; `request.aiMissing` banner for empty required fields.
- *AI error / quota / switched off:* `request.aiUnavailable`; the AI button is hidden when `aiStatus.intake = off`.
- *Validation error:* field errors (§4) + summary banner "Please fix 2 things above" / "উপরের ২টি বিষয় ঠিক করুন" and scroll to the first error.
- *Duplicate found (if-time):* dialog with Join / Post anyway.
- *Offline:* Post stores the request in the outbox; state line "Waiting for network"; when sent → navigate to `/request/[id]`.
- *Server errors:* `ERR_OPEN_REQUEST_LIMIT`, `ERR_MONTHLY_REQUEST_LIMIT`, `ERR_FROZEN`, `ERR_UNDERAGE` → banner with that code's message (§6.5); form data kept.
- *Success:* navigate to `/request/[id]` with toast `common.sent`.
**Behaviour:**
- The rules parser (`convex/rules/intakeParser.ts`, shared) runs **on the device first**; only if required fields are still missing does the app call `intake.parse` (server redaction + AI).
- "Use my current location": request permission (reason text `welcome.permissions` location line) → one reading → list 5 nearest hospitals from the bundled list (distance shown) + "My place isn't in the list" → district/thana pickers + area text. Location reading is never sent to the server; only the chosen hospital or area (plus rounded point) is.
- Urgency derived: Now → `neededBy = now + 2 h`, urgency `now`; Today → end of today 23:59 (if < 2 h away, treat as `now`); Tomorrow → tomorrow 12:00 unless a time is picked; Pick → chosen.
- "Not sure" group shows inline note `request.notSureNote`: "We'll alert volunteers, not donors. Please ask the ward or blood bank and update the group." / "আমরা রক্তদাতাদের নয়, স্বেচ্ছাসেবকদের জানাব। অনুগ্রহ করে ওয়ার্ড বা ব্লাড ব্যাংকে জিজ্ঞেস করে গ্রুপ আপডেট করুন।"
**Events (server):** `request_published` (+ `aiAssisted`, `source`), `ai_call` (from intake).
**A11y:** blood-group tiles are a radio group; units stepper buttons labelled "Increase bags" / "Decrease bags"; mic button announces listening state.

#### SCR-M03 · My request · `/request/[id]`
**Purpose:** live status, contacts, actions for the request owner.
**Layout:**
1. Header: group + component chip + dengue chip + status chip (`Live` / `Covered` / `Closed`) + verified badge or "phone not yet verified" chip.
2. **Units bar:** `home.covered` progress bar.
3. **Help is on the way** section — one `CMP-ContactCard` per confirmed donor (name, group, area/distance, phone + Call/WhatsApp — or `contact.donorWillCall` for D16 donors) + "Donor not responding" link per donor; `CMP-SafetyCard` above the first card.
4. **Volunteer** section: appears when shown (V09) — `CMP-ContactCard` for ≤ 2 volunteers; before that a `CMP-CountdownChip` "Volunteer contact in 0:21".
5. **Search progress:** `CMP-StatusTimeline` with counts: notified, opened, accepted; current wave "Search 2 of 3 — wider area"; `CMP-CountdownChip` to the next wave.
6. **No donors yet** panel (F-504) when 0 eligible donors or after the final wave: steps list + blood-bank list (name, phone, Call).
7. **Actions:** `request.markFulfilled` (primary when covered), `request.needMore` (stepper), `request.notNeeded`, `request.share` (if-time), `request.addSlip` (if-time).
8. Request details (collapsed): hospital, needed-by, note, patient name, ward.
**Copy:**
| Key | English | বাংলা |
|---|---|---|
| `requestStatus.live` | Searching for donors | রক্তদাতা খোঁজা হচ্ছে |
| `requestStatus.covered` | All bags arranged | সব ব্যাগের ব্যবস্থা হয়েছে |
| `requestStatus.closed` | Closed | বন্ধ |
| `request.helpComing` | Help is on the way | সাহায্য আসছে |
| `contact.donorWillCall` | {{name}} will call you | {{name}} আপনাকে কল করবেন |
| `request.donorNotResponding` | Donor not responding | রক্তদাতা সাড়া দিচ্ছেন না |
| `request.donorNotRespondingConfirm` | We'll confirm the next donor and keep searching. {{name}} stays on your list in case they call. | আমরা পরের রক্তদাতাকে নিশ্চিত করব এবং খোঁজা চালিয়ে যাব। {{name}} কল করলে যাতে পান, তালিকায় থাকবেন। |
| `request.volunteerIn` | A volunteer's number will appear in {{time}} if no donor answers | কোনো রক্তদাতা সাড়া না দিলে {{time}} পর একজন স্বেচ্ছাসেবকের নম্বর দেখাবে |
| `request.volunteerTitle` | A volunteer can help you now | একজন স্বেচ্ছাসেবক এখন আপনাকে সাহায্য করতে পারেন |
| `request.fallbackTitle` | Call the UDVASITO helpline | উদ্ভাসিত হেল্পলাইনে কল করুন |
| `request.progress` | {{notified}} donors alerted · {{opened}} saw it · {{accepted}} said yes | {{notified}} জনকে জানানো হয়েছে · {{opened}} জন দেখেছেন · {{accepted}} জন রাজি |
| `request.wave` | Search {{n}} of {{total}} | খোঁজ {{n}}/{{total}} |
| `request.waveWider` | Searching a wider area | আরও বড় এলাকায় খোঁজা হচ্ছে |
| `request.nextWaveIn` | Next search in {{time}} | পরের খোঁজ {{time}} পর |
| `request.noDonors.title` | No matching donor is available yet | এখনো মিল আছে এমন কোনো রক্তদাতা পাওয়া যায়নি |
| `request.noDonors.body` | We're telling you now so you don't lose time. Try these too: | সময় নষ্ট না করতে আমরা এখনই জানাচ্ছি। এগুলোও চেষ্টা করুন: |
| `request.noDonors.step1` | Call the volunteer or helpline below | নিচের স্বেচ্ছাসেবক বা হেল্পলাইনে কল করুন |
| `request.noDonors.step2` | Share your request on Facebook and WhatsApp | ফেসবুক ও হোয়াটসঅ্যাপে আপনার অনুরোধ শেয়ার করুন |
| `request.noDonors.step3` | Contact these blood banks | এই ব্লাড ব্যাংকগুলোতে যোগাযোগ করুন |
| `request.markFulfilled` | All bags arranged — close request | সব ব্যাগের ব্যবস্থা হয়েছে — অনুরোধ বন্ধ করুন |
| `request.needMore` | Need more bags | আরও ব্যাগ লাগবে |
| `request.notNeeded` | No longer needed | আর প্রয়োজন নেই |
| `request.closeConfirm` | Close this request? Donors still deciding will be told it's no longer needed. | অনুরোধটি বন্ধ করবেন? যারা এখনো ভাবছেন, তাদের জানানো হবে যে আর প্রয়োজন নেই। |
| `request.closed.fulfilled` | Closed — all bags arranged. Thank you for using UDVASITO. | বন্ধ — সব ব্যাগের ব্যবস্থা হয়েছে। উদ্ভাসিত ব্যবহারের জন্য ধন্যবাদ। |
| `request.reopen` | Reopen request | অনুরোধ আবার খুলুন |
| `request.share` | Share request | অনুরোধ শেয়ার করুন |
**States:** loading — skeleton; not found / not owner → `ERR_NOT_FOUND`; live (no acceptance) — countdown + timeline; covered — success banner + fulfilled button prominent; closed — read-only + reopen (≤ `S-34`) + "Request again"; reveals frozen (`ERR_REVEALS_FROZEN`) — contact cards hidden with notice "Contact details are paused while we review a report." / "একটি অভিযোগ পর্যালোচনার সময় যোগাযোগের তথ্য স্থগিত আছে।"; offline — last data + banner; actions queue in the outbox.
**Events:** `donor_not_responding_marked`, `request_closed{reason}`, `request_updated`.

#### SCR-M04 · My requests · `/requests`
**Layout:** segmented tabs **Active** / **Closed**; list items (group, component, hospital, created time, status chip, units `x/y`); Closed items have `requests.again` (if-time) → `/request/new?repeat=<id>`. FAB "Request blood".
**Copy:** `requests.title` "My requests" / "আমার অনুরোধ"; `requests.active` "Active" / "চলমান"; `requests.closed` "Closed" / "বন্ধ"; `requests.empty` "You haven't requested blood. We hope you never need to." / "আপনি এখনো রক্তের অনুরোধ করেননি। আশা করি কখনো প্রয়োজন হবে না।"; `requests.again` "Request again" / "আবার অনুরোধ করুন".
**States:** loading skeleton (3 rows); empty → `requests.empty` + Request blood button; error → `CMP-ErrorState`.

#### SCR-M05 · Share request · `/request/[id]/share` (if-time)
**Layout:** preview image (Cloudinary card: logo, group, component, units, hospital, area, needed-by, link; **no phone**) · text preview (editable) · toggle `share.addMyNumber` (off by default) · buttons: Share (native share sheet / Web Share API), Copy link, Copy text.
**Copy:** `share.title` "Share your request" / "আপনার অনুরোধ শেয়ার করুন"; `share.addMyNumber` "Add my number to the shared text" / "শেয়ার করা লেখায় আমার নম্বর যোগ করুন"; `share.template` "URGENT: {{units}} bag {{group}} {{component}} needed at {{hospital}}, {{area}} by {{time}}. If you can donate, tap: {{link}}" / "জরুরি: {{hospital}}, {{area}}-এ {{time}}-এর মধ্যে {{units}} ব্যাগ {{group}} {{component}} প্রয়োজন। রক্ত দিতে পারলে ট্যাপ করুন: {{link}}".
**States:** card generating (skeleton) → template-only fallback if Cloudinary fails.
**Events:** `request_shared`.

#### SCR-M09 · Did the donation happen? · `/confirm/[requestId]`
**Purpose:** collect outcomes (F-502). Shown to the requester (about each confirmed donor) and to the donor (about themselves).
**Layout (requester):** per confirmed donor: name + three buttons **Yes, donated** / **No** / **Not yet**. **(donor):** single question with the same three buttons + note `confirm.cooldownNote`.
**Copy:** `confirm.title` "Did the donation happen?" / "রক্তদান কি হয়েছে?"; `confirm.yes` "Yes, donated" / "হ্যাঁ, দিয়েছেন/দিয়েছি"; `confirm.no` "No" / "না"; `confirm.notYet` "Not yet" / "এখনো না"; `confirm.cooldownNote` "If you donated, we'll pause your alerts until it's safe to donate again." / "রক্ত দিয়ে থাকলে, আবার নিরাপদে দেওয়ার সময় না আসা পর্যন্ত আপনার অ্যালার্ট বন্ধ থাকবে।"; `confirm.thanks` "Thank you — you've helped save a life." / "ধন্যবাদ — আপনি একটি জীবন বাঁচাতে সাহায্য করেছেন।"
**States:** already answered → show the answer + Change (within 7 days); error → banner.
**Events:** `donation_reported_by_requester`, `donation_confirmed_by_donor`.

### 3.3 Donor

#### SCR-D01 · Donate tab · `/donor`
**No donor profile:** illustration + `donor.intro.title` + 3 bullets + button `donor.intro.cta` → `/donor/setup`.
**Donor profile exists (dashboard):**
1. **Status card:** availability segmented control (Available / Paused / Not available) — Paused opens a sheet (1 week, 1 month, until date — VAL-20); below: eligibility line (`donor.eligibleNow` or `donor.eligibleAgain`); if profile not live: reason banner (`donor.notLive.phone` / `donor.notLive.consent` / `donor.notLive.group`).
2. **Requests for you** → `/alerts` (badge count).
3. **Alerts health:** if push permission not granted or token missing → warning banner `donor.alertsOff` + "Fix" → `/donor/alert-guide`.
4. Links: Alert & privacy settings · Donation history (if-time) · Can I donate? (if-time) · Hide my donor profile.
**Copy:**
| Key | English | বাংলা |
|---|---|---|
| `donor.intro.title` | Become a blood donor | রক্তদাতা হোন |
| `donor.intro.b1` | You'll only be alerted when someone nearby needs your blood group. | শুধু আশেপাশে কারও আপনার গ্রুপের রক্ত লাগলেই আপনাকে জানানো হবে। |
| `donor.intro.b2` | Your number is never public. It's shared only with a family you agree to help. | আপনার নম্বর কখনো প্রকাশ্য নয়। শুধু যে পরিবারকে সাহায্য করতে রাজি হবেন, তাদের সঙ্গেই শেয়ার হবে। |
| `donor.intro.b3` | You decide every time — and you can pause anytime. | প্রতিবার সিদ্ধান্ত আপনার — যেকোনো সময় বিরতি নিতে পারেন। |
| `donor.intro.cta` | Become a donor | রক্তদাতা হোন |
| `donor.available` | Available | প্রস্তুত |
| `donor.paused` | Paused until {{date}} | {{date}} পর্যন্ত বিরতিতে |
| `donor.unavailable` | Not available | এখন পারব না |
| `donor.eligibleNow` | You can donate now | আপনি এখন রক্ত দিতে পারবেন |
| `donor.eligibleAgain` | You can donate again from {{date}} | {{date}} থেকে আবার রক্ত দিতে পারবেন |
| `donor.notLive.phone` | Verify your number to start receiving requests. | অনুরোধ পেতে আপনার নম্বর যাচাই করুন। |
| `donor.notLive.group` | Add your blood group to start receiving requests. | অনুরোধ পেতে আপনার রক্তের গ্রুপ যোগ করুন। |
| `donor.notLive.consent` | Please review the updated consent to keep receiving requests. | অনুরোধ পেতে থাকতে হালনাগাদ সম্মতি পর্যালোচনা করুন। |
| `donor.alertsOff` | Alerts may not reach you. Fix it in 1 minute. | অ্যালার্ট হয়তো আপনার কাছে পৌঁছাবে না। ১ মিনিটে ঠিক করুন। |
**States:** loading skeleton; error → `CMP-ErrorState`; availability change is optimistic (outbox) with revert + toast on failure.
**Events:** `availability_changed{state}`.

#### SCR-D02 · Become a donor · `/donor/setup`
Four steps with a progress indicator "Step x of 4"; Back keeps entries; data saved per step (draft on device).
- **Step 1 · Blood group:** `CMP-BloodGroupPicker` (8 groups + "I don't know my group" → info sheet `donor.setup.unknownGroup` and the profile is saved but not live).
- **Step 2 · Where you live:** "Use my location once" button + Division → District → Thana/Upazila pickers (VAL-14a) + Area (optional, VAL-23) + Institution (optional, VAL-22) + "I can travel to": My thana / My district.
- **Step 3 · Donation history & eligibility:** Gender (Male / Female / Other / Prefer not to say — helper `donor.setup.genderWhy`) · Last donation: date picker or "I have never donated" (VAL-14b) · Type of last donation: Whole blood / Platelets · Checklist (all required, VAL-14c): "I weigh at least 50 kg", "I am in good health", "I understand the blood bank will check me before donating" · `common.notMedicalAdvice` · Optional toggle "I'm willing to donate platelets" (+ info).
- **Step 4 · Privacy & consent:** explanation of contact sharing (mutual by default; "I'll call them" option) · toggle "Don't share my number — I'll call families myself" (D16) · checkbox `donor.setup.consentHealth` (VAL-15) · if phone not verified: inline Verify button (opens SCR-O04 and returns) · primary `donor.setup.finish`.
**Copy (selection):**
| Key | English | বাংলা |
|---|---|---|
| `donor.setup.title` | Become a donor | রক্তদাতা হোন |
| `donor.setup.step` | Step {{n}} of 4 | ধাপ {{n}}/৪ |
| `donor.setup.groupTitle` | What is your blood group? | আপনার রক্তের গ্রুপ কী? |
| `donor.setup.unknownGroup` | No problem. Many hospitals and blood banks test blood groups for free or at low cost. Add your group here when you know it. | কোনো সমস্যা নেই। অনেক হাসপাতাল ও ব্লাড ব্যাংক বিনামূল্যে বা কম খরচে রক্তের গ্রুপ পরীক্ষা করে। জানার পর এখানে যোগ করুন। |
| `donor.setup.whereTitle` | Where do you usually stay? | আপনি সাধারণত কোথায় থাকেন? |
| `donor.setup.locationOnce` | Use my location once | একবার আমার অবস্থান ব্যবহার করুন |
| `donor.setup.locationNote` | We only use it to pick your area. We don't store your location. | শুধু আপনার এলাকা বেছে নিতে ব্যবহার করি। আপনার অবস্থান সংরক্ষণ করি না। |
| `donor.setup.travel` | I can travel to | আমি যেতে পারব |
| `donor.setup.travelThana` | Hospitals in my thana/upazila | আমার থানা/উপজেলার হাসপাতালে |
| `donor.setup.travelDistrict` | Hospitals anywhere in my district | আমার জেলার যেকোনো হাসপাতালে |
| `donor.setup.institution` | University / college / workplace (optional) | বিশ্ববিদ্যালয় / কলেজ / কর্মস্থল (ঐচ্ছিক) |
| `donor.setup.historyTitle` | Your last donation | আপনার শেষ রক্তদান |
| `donor.setup.genderWhy` | Used only to calculate when you can donate again. | শুধু আবার কবে রক্ত দিতে পারবেন তা হিসাব করতে ব্যবহার হয়। |
| `donor.setup.never` | I have never donated | আমি কখনো রক্ত দিইনি |
| `donor.setup.check50kg` | I weigh at least 50 kg | আমার ওজন অন্তত ৫০ কেজি |
| `donor.setup.checkHealth` | I am in good health | আমি সুস্থ আছি |
| `donor.setup.checkScreening` | I understand the blood bank will check me before I donate | আমি জানি, রক্ত দেওয়ার আগে ব্লাড ব্যাংক আমাকে পরীক্ষা করবে |
| `donor.setup.platelets` | I'm willing to donate platelets (for dengue and other patients) | আমি প্লাটিলেট দিতে আগ্রহী (ডেঙ্গু ও অন্যান্য রোগীর জন্য) |
| `donor.setup.plateletsInfo` | Platelet donation uses a machine at a blood bank and takes about 1–2 hours. You'll only get platelet requests if you turn this on. | প্লাটিলেট দান ব্লাড ব্যাংকে মেশিনের মাধ্যমে হয় এবং প্রায় ১–২ ঘণ্টা লাগে। এটি চালু করলেই শুধু প্লাটিলেটের অনুরোধ পাবেন। |
| `donor.setup.privacyTitle` | How your number is shared | আপনার নম্বর কীভাবে শেয়ার হয় |
| `donor.setup.privacyBody` | When you tap "I can help" and are confirmed, you and the family see each other's number. Nobody else does. | আপনি "আমি দিতে পারব" চাপলে এবং নিশ্চিত হলে, আপনি ও পরিবারটি পরস্পরের নম্বর দেখতে পাবেন। আর কেউ দেখবে না। |
| `donor.setup.callMode` | Don't share my number — I'll call families myself | আমার নম্বর শেয়ার করবেন না — আমি নিজেই পরিবারকে কল করব |
| `donor.setup.consentHealth` | I agree that UDVASITO stores my blood group, donation dates and area to match me with requests, and shares my number only as described above. | আমি সম্মত যে উদ্ভাসিত আমার রক্তের গ্রুপ, রক্তদানের তারিখ ও এলাকা সংরক্ষণ করবে অনুরোধের সঙ্গে মেলাতে, এবং উপরে বর্ণিতভাবে শুধু আমার নম্বর শেয়ার করবে। |
| `donor.setup.finish` | Start receiving requests | অনুরোধ পাওয়া শুরু করুন |
| `donor.setup.done` | You're a donor now. Thank you! We'll alert you only when you can help. | আপনি এখন একজন রক্তদাতা। ধন্যবাদ! শুধু যখন সাহায্য করতে পারবেন, তখনই জানাব। |
**Copy — labels the layout names in English only** (Q-018, 2026-11-27; member 3 reviews the Bangla):
| Key | English | বাংলা |
|---|---|---|
| `donor.setup.dontKnowGroup` | I don't know my group | আমি আমার গ্রুপ জানি না |
| `donor.setup.division` | Division | বিভাগ |
| `donor.setup.district` | District | জেলা |
| `donor.setup.upazila` | Thana / upazila | থানা / উপজেলা |
| `donor.setup.area` | Area (optional) | এলাকা (ঐচ্ছিক) |
| `donor.setup.locationFailed` | We couldn't find your area. Please choose it below. | আপনার এলাকা খুঁজে পাওয়া যায়নি। নিচে থেকে বেছে নিন। |
| `donor.setup.gender` | Gender | লিঙ্গ |
| `donor.setup.genderMale` | Male | পুরুষ |
| `donor.setup.genderFemale` | Female | নারী |
| `donor.setup.genderOther` | Other | অন্যান্য |
| `donor.setup.genderUnspecified` | Prefer not to say | বলতে চাই না |
| `donor.setup.lastDate` | Date of your last donation | শেষ রক্তদানের তারিখ |
| `donor.setup.lastType` | Type of last donation | শেষ রক্তদানের ধরন |
| `donor.availability` | Your status | আপনার অবস্থা |
| `donor.edit` | Update my donor details | আমার রক্তদাতার তথ্য হালনাগাদ করুন |
| `common.choose` | Choose | বেছে নিন |
| `common.search` | Search | খুঁজুন |
| `common.noMatches` | Nothing found. Try another spelling. | কিছু পাওয়া যায়নি। অন্য বানানে চেষ্টা করুন। |
**States:** step validation errors (§4); server error banner; success → `donor.setup.done` + prompt to allow notifications (OS dialog now — first contextual moment) → `/donor/alert-guide` if denied.
**Events:** `donor_profile_live`.

#### SCR-D03 · Requests for you · `/alerts`
**Layout:** list of requests where I'm `notified`/`opened`/`accepted`/`confirmed`/`standby`, newest first, grouped **Needs your answer** / **You said yes** / **Earlier**. Item: group chip, component chip, hospital, area, distance, needed-by (relative), verified chip, my state chip.
**Copy:** `alerts.title` "Requests for you" / "আপনার জন্য অনুরোধ"; `alerts.needsAnswer` "Needs your answer" / "আপনার উত্তরের অপেক্ষায়"; `alerts.saidYes` "You said yes" / "আপনি রাজি হয়েছেন"; `alerts.earlier` "Earlier" / "আগের"; `alerts.empty` "No requests right now. We'll alert you when someone nearby needs your help." / "এখন কোনো অনুরোধ নেই। আশেপাশে কারও আপনার সাহায্য লাগলে জানাব।"; `alerts.closedItem` "No longer needed" / "আর প্রয়োজন নেই".
**States:** loading skeleton; empty; error; closed requests greyed with `alerts.closedItem`.

#### SCR-D04 · Request for you · `/alerts/[requestId]`
**Purpose:** decide and act (F-401–F-405, F-408, D16, D08).
**Layout by my response state:**
- **notified/opened:** request card (group, component, units, hospital, area, distance, needed-by, verified chip or "phone not yet verified" chip, requester track record line `alert.trackRecord`) · note from requester · `common.notMedicalAdvice` · primary `alert.canHelp` · secondary `alert.cantHelp` · link Report.
  - Tap **I can help** → sheet: self-check checkbox `alert.selfCheck` (required) + call-mode choice (pre-set from profile: "Share numbers" / "I'll call them") + Confirm.
  - Tap **Can't this time** → sheet with optional reasons (Busy / Too far / Donated recently → asks date / Unwell / Other) + Send.
- **confirmed:** success banner `alert.confirmed` · `CMP-SafetyCard` · requester `CMP-ContactCard` (always visible to a confirmed donor) · hospital card with **Directions** (maps link) · patient name/ward if given · `alert.stillComing` prompt card when asked (Yes, on my way / Can't make it) · button `alert.cantMakeIt` · Report.
- **standby:** info banner `alert.standby` (no contact info).
- **declined / withdrew:** read-only summary.
- **request closed:** banner `alerts.closedItem` + thanks.
**Copy:**
| Key | English | বাংলা |
|---|---|---|
| `alert.title` | {{group}} {{component}} needed | {{group}} {{component}} প্রয়োজন |
| `alert.distance` | {{km}} km away | {{km}} কিমি দূরে |
| `alert.neededBy` | Needed by {{time}} | {{time}}-এর মধ্যে প্রয়োজন |
| `alert.trackRecord` | Requester: member since {{date}} · {{requests}} requests · {{donations}} donations confirmed | অনুরোধকারী: {{date}} থেকে সদস্য · {{requests}}টি অনুরোধ · {{donations}}টি রক্তদান নিশ্চিত |
| `alert.unverified` | Phone not yet verified | ফোন এখনো যাচাই হয়নি |
| `alert.verified` | Hospital slip verified | হাসপাতালের স্লিপ যাচাইকৃত |
| `alert.canHelp` | I can help | আমি দিতে পারব |
| `alert.cantHelp` | Can't this time | এবার পারছি না |
| `alert.selfCheck` | I feel well today, weigh at least 50 kg and haven't donated recently. | আমি আজ সুস্থ, ওজন অন্তত ৫০ কেজি এবং সম্প্রতি রক্ত দিইনি। |
| `alert.confirmed` | You're confirmed. Please contact the family now. | আপনি নিশ্চিত। অনুগ্রহ করে এখনই পরিবারের সঙ্গে যোগাযোগ করুন। |
| `alert.confirmedCallMode` | You chose to call them yourself — they can't see your number. | আপনি নিজেই কল করবেন বলে বেছে নিয়েছেন — তারা আপনার নম্বর দেখতে পাবেন না। |
| `alert.standby` | Thank you! Enough donors have said yes for now. You're on standby — we'll tell you right away if you're needed. | ধন্যবাদ! আপাতত যথেষ্ট রক্তদাতা রাজি হয়েছেন। আপনি অপেক্ষমাণ তালিকায় আছেন — প্রয়োজন হলে সঙ্গে সঙ্গে জানাব। |
| `alert.stillComing` | Still coming to {{hospital}}? | আপনি কি {{hospital}}-এ আসছেন? |
| `alert.onMyWay` | Yes, on my way | হ্যাঁ, আসছি |
| `alert.cantMakeIt` | I can't make it anymore | আমি আর আসতে পারছি না |
| `alert.cantMakeItConfirm` | We'll tell the family and find another donor. Thank you for letting us know. | আমরা পরিবারকে জানাব এবং আরেকজন রক্তদাতা খুঁজব। জানানোর জন্য ধন্যবাদ। |
| `alert.directions` | Directions | পথনির্দেশ |
| `alert.declineReason` | Why not? (optional) | কেন নয়? (ঐচ্ছিক) |
| `alert.reason.busy` | Busy | ব্যস্ত |
| `alert.reason.far` | Too far | অনেক দূরে |
| `alert.reason.donated` | Donated recently | সম্প্রতি রক্ত দিয়েছি |
| `alert.reason.unwell` | Not feeling well | শরীর ভালো নেই |
| `alert.reason.other` | Other | অন্য কারণ |
**States:** loading skeleton; `ERR_NOT_ELIGIBLE` (became ineligible) → banner with eligible date; `ERR_REQUEST_CLOSED`; `ERR_ALREADY_RESPONDED`; `ERR_BLOCKED`; offline → accept goes to the outbox with state line; screen open from a push → `notifications.markOpened` (once).
**Events:** `notification_opened`, `donor_accepted`, `donor_confirmed`/`donor_standby` (server), `donor_declined{reason}`, `still_coming_answered`, `donor_withdrew`.

#### SCR-D05 · Alert & privacy settings · `/donor/settings`
**Core:** platelets opt-in · "Don't share my number — I'll call them" · "Volunteers may call me directly in an emergency" (V10 opt-in, off by default) · "Only verified requests" (if-time) · Edit area / travel range / gender / last donation · Hide my donor profile.
**If-time:** max alerts per day (1–10, default `S-20`) · quiet hours (start/end) + urgent override.
**Copy:** `donorSettings.title` "Alert & privacy settings" / "অ্যালার্ট ও গোপনীয়তা সেটিংস"; `donorSettings.volunteersMayCall` "Volunteers may call me directly in an emergency" / "জরুরি প্রয়োজনে স্বেচ্ছাসেবকরা আমাকে সরাসরি কল করতে পারবেন"; `donorSettings.verifiedOnly` "Only alert me for verified requests" / "শুধু যাচাইকৃত অনুরোধে আমাকে জানাবেন"; `donorSettings.maxAlerts` "Maximum alerts per day" / "দিনে সর্বোচ্চ অ্যালার্ট"; `donorSettings.quietHours` "Quiet hours" / "নীরব সময়"; `donorSettings.urgentOverride` "Urgent requests may still reach me during quiet hours" / "নীরব সময়েও জরুরি অনুরোধ আমার কাছে আসতে পারবে"; `donorSettings.hide` "Hide my donor profile" / "আমার রক্তদাতা প্রোফাইল লুকান"; `donorSettings.hideConfirm` "You won't receive any requests until you show it again." / "আবার দেখানো না পর্যন্ত কোনো অনুরোধ পাবেন না।"; `donorSettings.rareTip` "Rare group? Limits help you stay active for longer without burning out." / "বিরল গ্রুপ? সীমা ঠিক করলে ক্লান্ত না হয়ে দীর্ঘদিন সক্রিয় থাকতে পারবেন।" (shown for O−, A−, B−, AB−).
**States:** each toggle saves immediately (optimistic) with toast; error reverts.

#### SCR-D06 · Donation history · `/donor/history` (if-time)
List of donor-confirmed donations (date, hospital, group, component) · total · badges (1, 5, 10, 25) · next eligible date. Empty: "Your confirmed donations will appear here." / "আপনার নিশ্চিত রক্তদান এখানে দেখাবে।"

#### SCR-D07 · Make sure alerts reach you · `/donor/alert-guide`
**Layout:** status checks with ✅/⚠: Notifications allowed · Push token registered · (Android) Battery optimisation guide for the detected brand (Xiaomi/Redmi/POCO, Samsung, Oppo/Realme, Vivo, Tecno/Infinix, Other) with 2–4 short steps each and an "Open settings" button (`Linking.openSettings()`), · "Send me a test alert" button (`push.sendTest`, rate-limited 3/hour).
**Copy:** `alertGuide.title` "Make sure alerts reach you" / "অ্যালার্ট যেন আপনার কাছে পৌঁছায়"; `alertGuide.notifications` "Notifications allowed" / "নোটিফিকেশন অনুমোদিত"; `alertGuide.battery` "Battery saver won't block UDVASITO" / "ব্যাটারি সেভার উদ্ভাসিতকে আটকাবে না"; `alertGuide.test` "Send me a test alert" / "আমাকে একটি পরীক্ষামূলক অ্যালার্ট পাঠান"; `alertGuide.testSent` "Test alert sent. Did it arrive?" / "পরীক্ষামূলক অ্যালার্ট পাঠানো হয়েছে। পেয়েছেন কি?"; iPhone note `alertGuide.ios` "On iPhone, alerts work only after you add UDVASITO to your Home Screen (Share → Add to Home Screen)." / "আইফোনে, উদ্ভাসিত হোম স্ক্রিনে যোগ করার পরই অ্যালার্ট কাজ করবে (Share → Add to Home Screen)।"
**Brand steps** (strings `alertGuide.brand.<brand>.stepN`) are written by member 3 with screenshots during build; placeholders allowed in staging only.

### 3.4 Shared

#### SCR-C01 · Report & block (sheet)
**Opened from:** SCR-D04, SCR-M03 (about a donor), SCR-V03, SCR-P02.
**Layout:** reasons (radio, required): Fake request · Asked for money · Harassment · Other · details (optional, VAL-17) · toggle "Block this person" (default on for money/harassment) · Send.
**Copy:** `report.title` "Report a problem" / "সমস্যা জানান"; `report.fake` "Fake request" / "ভুয়া অনুরোধ"; `report.money` "Asked for money" / "টাকা চেয়েছে"; `report.harassment` "Harassment" / "হয়রানি"; `report.other` "Other" / "অন্যান্য"; `report.details` "What happened? (optional)" / "কী হয়েছে? (ঐচ্ছিক)"; `report.block` "Block this person" / "এই ব্যক্তিকে ব্লক করুন"; `report.send` "Send report" / "অভিযোগ পাঠান"; `report.thanks` "Thank you. Our team will review this quickly." / "ধন্যবাদ। আমাদের দল দ্রুত বিষয়টি দেখবে।"
**Events:** `report_filed{reason}`; server applies automatic freezes (PRD §5.8).

#### SCR-M06 · Settings · `/settings`
Rows: Language · Profile (name, date of birth read-only after 24 h, mobile number → re-verify) · Phone verification status · Notifications (link to alert guide) · Privacy & my data → `/settings/my-data` · Terms · Privacy notice · About · Sign out.
**Copy:** `settings.title` "Settings" / "সেটিংস"; `settings.signOut` "Sign out" / "সাইন আউট"; `settings.phoneChangeNote` "Changing your number needs a new verification." / "নম্বর পরিবর্তন করলে আবার যাচাই করতে হবে।"; `settings.language` "Language" / "ভাষা"; `settings.privacy` "Privacy notice" / "গোপনীয়তা নীতি" (Q-014; the Terms row uses `welcome.terms`).

#### SCR-M07 · Privacy & my data · `/settings/my-data`
Sections: **Who has my number** — list of contact reveals (request date, hospital, the person's first name, role, until date) · **Download my data** — button → server builds a JSON file (profile, donor profile, my requests, my responses, consents) → download link valid 24 h · **Delete my account** — explains what is removed and kept (anonymous statistics) → confirm dialog requiring typing `DELETE` / `মুছুন` → status `deletion_pending` (cancelable for 30 days, S-27).
**Copy:** `myData.who` "Who has my number" / "কারা আমার নম্বর পেয়েছেন"; `myData.whoEmpty` "Nobody has your number through UDVASITO." / "উদ্ভাসিতের মাধ্যমে কেউ আপনার নম্বর পায়নি।"; `myData.download` "Download my data" / "আমার তথ্য ডাউনলোড করুন"; `myData.delete` "Delete my account" / "আমার অ্যাকাউন্ট মুছে ফেলুন"; `myData.deleteBody` "We'll remove your name, number, date of birth, donor details and requests' personal details within 30 days. Anonymous counts (e.g. 'one B+ donation in Chattogram') stay." / "৩০ দিনের মধ্যে আপনার নাম, নম্বর, জন্ম তারিখ, রক্তদাতার তথ্য এবং অনুরোধের ব্যক্তিগত তথ্য মুছে ফেলা হবে। নাম-পরিচয়হীন হিসাব (যেমন 'চট্টগ্রামে একটি বি পজিটিভ রক্তদান') থেকে যাবে।"; `myData.typeToConfirm` "Type DELETE to confirm" / "নিশ্চিত করতে 'মুছুন' লিখুন".

#### SCR-M08 · Can I donate? · `/assistant` (if-time)
**Layout:** banner `assistant.banner`; chat list; input (VAL-21); suggested questions chips (5 from approved FAQ); each answer shows "From FAQ: <question>" link and `common.notMedicalAdvice`.
**Copy:** `assistant.title` "Can I donate?" / "আমি কি রক্ত দিতে পারব?"; `assistant.banner` "Answers come from our reviewed FAQ. Please don't type personal details. For anything about your own health, ask a doctor." / "উত্তর আসে আমাদের যাচাই করা প্রশ্নোত্তর থেকে। ব্যক্তিগত তথ্য লিখবেন না। নিজের স্বাস্থ্যের বিষয়ে চিকিৎসকের পরামর্শ নিন।"; `assistant.askDoctor` "That's a question about your own health — please ask a doctor or the blood bank. They can check you properly." / "এটি আপনার নিজের স্বাস্থ্যের প্রশ্ন — অনুগ্রহ করে চিকিৎসক বা ব্লাড ব্যাংকে জিজ্ঞেস করুন। তারা সঠিকভাবে পরীক্ষা করতে পারবেন।"; `assistant.noMatch` "I couldn't find that in our FAQ. Try the questions below or ask a volunteer." / "আমাদের প্রশ্নোত্তরে এটি পাইনি। নিচের প্রশ্নগুলো দেখুন বা কোনো স্বেচ্ছাসেবককে জিজ্ঞেস করুন।"; `assistant.limit` "You've reached today's limit of {{n}} questions. Browse the FAQ below." / "আজকের {{n}}টি প্রশ্নের সীমা শেষ। নিচের প্রশ্নোত্তর দেখুন।"
**States:** AI off → FAQ search mode (same UI, results are FAQ entries); limit reached; error.

#### SCR-M10 · More · `/more`
Rows: Settings · Can I donate? (if-time) · Learn about donating · Dengue & platelets · Apply to volunteer (if not volunteer) · About UDVASITO · Download / install app · Call helpline · Sign out.
**Copy** (Q-014; Settings → `settings.title`, Can I donate? → `assistant.title`, Call helpline → `request.fallbackTitle`, Sign out → `settings.signOut`):
| Key | English | বাংলা |
|---|---|---|
| `more.learn` | Learn about donating | রক্তদান সম্পর্কে জানুন |
| `more.dengue` | Dengue & platelets | ডেঙ্গু ও প্লাটিলেট |
| `more.applyVolunteer` | Apply to volunteer | স্বেচ্ছাসেবক হতে আবেদন করুন |
| `more.about` | About UDVASITO | উদ্ভাসিত সম্পর্কে |
| `more.download` | Download / install app | অ্যাপ ডাউনলোড / ইনস্টল করুন |

### 3.5 Volunteer

#### SCR-V01 · Apply to volunteer · `/volunteer/apply`
**Layout:** intro · Areas (multi-select thanas with "Whole district" shortcut, VAL-16) · Institution (optional) · Why do you want to volunteer? (VAL-16) · checkbox `volunteer.apply.consent` (VAL-15) · verified-phone requirement notice (+ Verify button) · Submit.
**Copy:** `volunteer.apply.title` "Become a volunteer" / "স্বেচ্ছাসেবক হোন"; `volunteer.apply.body` "Volunteers help families when no donor answers fast. You choose when you're on duty." / "কোনো রক্তদাতা দ্রুত সাড়া না দিলে স্বেচ্ছাসেবকরা পরিবারকে সাহায্য করেন। কখন ডিউটিতে থাকবেন, তা আপনি ঠিক করবেন।"; `volunteer.apply.areas` "Areas you can help with" / "যেসব এলাকায় সাহায্য করতে পারবেন"; `volunteer.apply.why` "Why do you want to volunteer?" / "কেন স্বেচ্ছাসেবক হতে চান?"; `volunteer.apply.consent` "While I'm on duty, my first name and phone number may be shown to people requesting blood in my areas." / "আমি ডিউটিতে থাকাকালীন আমার নামের প্রথম অংশ ও ফোন নম্বর আমার এলাকার রক্তপ্রার্থীদের দেখানো হতে পারে।"; `volunteer.apply.submit` "Send application" / "আবেদন পাঠান"; `volunteer.apply.pending` "Application received. An admin will review it soon." / "আবেদন পাওয়া গেছে। একজন অ্যাডমিন শিগগিরই পর্যালোচনা করবেন।"; `volunteer.apply.rejected` "Your application wasn't approved: {{reason}}" / "আপনার আবেদন অনুমোদিত হয়নি: {{reason}}"
**States:** pending / rejected / approved (redirect to `/volunteer`).
**Events:** `volunteer_applied`.

#### SCR-V02 · Volunteer · `/volunteer`
**Layout:**
1. **Duty card:** big switch `volunteer.onDuty` + "since hh:mm" + areas summary + Edit areas; reminder text `volunteer.dutyNote`.
2. **Board** (F-703): filters (group, component, status: Unclaimed / Mine / All, hospital search); list sorted by (urgency now first) then minutes without a confirmed donor desc. Item: group, component, units `x/y`, hospital, area, minutes waiting, wave `n/3`, claim chip ("Unclaimed" / "Nusrat is on it"), "Not sure" badge, verified/unverified chip, slip pending chip.
3. Links: **Verify someone in person** (→ SCR-V06) · Slip checks (if-time, count) · Post for a family (if-time).
**Copy:** `volunteer.title` "Volunteer" / "স্বেচ্ছাসেবক"; `volunteer.onDuty` "I'm on duty" / "আমি ডিউটিতে আছি"; `volunteer.dutyNote` "While on duty, families in your areas may see your number after 30 seconds without a donor." / "ডিউটিতে থাকাকালীন, ৩০ সেকেন্ডে কোনো রক্তদাতা না পেলে আপনার এলাকার পরিবারগুলো আপনার নম্বর দেখতে পারে।"; `volunteer.board` "Open requests" / "খোলা অনুরোধ"; `volunteer.waiting` "Waiting {{min}} min" / "{{min}} মিনিট ধরে অপেক্ষায়"; `volunteer.unclaimed` "Unclaimed" / "কেউ দায়িত্ব নেননি"; `volunteer.claimedBy` "{{name}} is on it" / "{{name}} দেখছেন"; `volunteer.boardEmpty` "No open requests in your areas. Thank you for being on duty." / "আপনার এলাকায় কোনো খোলা অনুরোধ নেই। ডিউটিতে থাকার জন্য ধন্যবাদ।"
**States:** pending application → status card only; board loading skeleton; empty; error; real-time updates.
**Events:** `volunteer_duty_changed{onDuty}`.

#### SCR-V03 · Volunteer request view · `/volunteer/request/[id]`
**Layout:**
1. Request card (all request basics + patient name/ward + requester contact `CMP-ContactCard` — volunteers can see the requester's number, PRD §3.3) + `CMP-SafetyCard`.
2. Claim bar: `volunteer.claim` / `volunteer.unclaim`; shows who claimed.
3. **Progress:** timeline (same as SCR-M03) + confirmed donors' **first names only** (no donor numbers).
4. **Find donors** (F-705): filters (group default = compatible per §5.2 of the PRD, area default = request thana, available now, eligible now, platelets); results list (first name, group, area, last active "2 h ago", eligibility chip, already-notified chip) with **Ask** button each; opt-in donors show "Can be called" chip + **Reveal number** (reason required, VAL-18).
5. Slip (if-time): view image + Approve / Reject (reason).
6. Report (requester) · Merge (if-time).
**Copy:** `volunteer.claim` "I'm on it" / "আমি দেখছি"; `volunteer.unclaim` "Release" / "ছেড়ে দিন"; `volunteer.findDonors` "Find donors" / "রক্তদাতা খুঁজুন"; `volunteer.ask` "Ask" / "জিজ্ঞেস করুন"; `volunteer.asked` "Asked" / "জিজ্ঞেস করা হয়েছে"; `volunteer.canBeCalled` "Can be called" / "কল করা যাবে"; `volunteer.reveal` "Reveal number" / "নম্বর দেখুন"; `volunteer.revealReason` "Why do you need to call? (required)" / "কেন কল করা প্রয়োজন? (আবশ্যক)"; `volunteer.noResults` "No matching donors found. Try a wider area or call the blood banks." / "মিল আছে এমন রক্তদাতা পাওয়া যায়নি। আরও বড় এলাকা চেষ্টা করুন বা ব্লাড ব্যাংকে কল করুন।"; `volunteer.searchLimit` "Search limit reached. Try again in a few minutes." / "খোঁজার সীমা শেষ। কয়েক মিনিট পর আবার চেষ্টা করুন।"
**States:** loading; not volunteer → G7; rate-limited (`ERR_RATE_LIMITED`); request closed → read-only.
**Events:** `volunteer_claimed`, `volunteer_donor_search`, `volunteer_asked_donor`, `volunteer_revealed_optin_donor`.

#### SCR-V04 · Slip checks · `/volunteer/slips` (if-time)
Queue of requests with `slipStatus = pending` (oldest first). Detail: image (zoomable, no download button, watermark "UDVASITO — for verification only"), request basics; Approve / Reject with reason (VAL-18). Copy: `slips.title` "Slip checks" / "স্লিপ যাচাই"; `slips.approve` "Looks genuine — verify" / "সঠিক মনে হচ্ছে — যাচাই করুন"; `slips.reject` "Can't verify" / "যাচাই করা যাচ্ছে না"; `slips.empty` "No slips waiting." / "কোনো স্লিপ অপেক্ষায় নেই।"
**Events:** `slip_reviewed{result}`.

#### SCR-V06 · Verify someone in person · `/volunteer/verify` (D-R1)
**Who:** approved volunteers and admins (G7); admins reach it from More. **Use:** at campus drives and when a person without Telegram meets a volunteer.
**Layout:** (1) title + body; (2) code input, 6 characters (VAL-26), auto-upper-case; (3) after `phoneVerification.lookupInPerson`: card with the person's **first name** and `•••• ••{{last4}}` — the full number is never shown — plus `verifyInPerson.check`; (4) buttons **It matches** (primary) / **It doesn't match** (secondary) → `phoneVerification.confirmInPerson`; (5) after "It matches": `verifyInPerson.deleteCall` reminder + success toast; (6) footer `verifyInPerson.count`.
**Copy:**
| Key | English | বাংলা |
|---|---|---|
| `verifyInPerson.title` | Verify someone in person | সরাসরি নম্বর যাচাই |
| `verifyInPerson.body` | Use this only when the person is with you. | ব্যক্তিটি আপনার সামনে থাকলেই কেবল এটি ব্যবহার করুন। |
| `verifyInPerson.code` | Their 6-character code | তাঁর ৬ অক্ষরের কোড |
| `verifyInPerson.check` | Ask {{name}} to call your phone now. Reject the call, then check that the number ends in {{last4}}. | {{name}}-কে এখনই আপনার ফোনে কল দিতে বলুন। কল কেটে দিন, তারপর দেখুন নম্বরের শেষ চার অঙ্ক {{last4}} কি না। |
| `verifyInPerson.matches` | It matches | মিলেছে |
| `verifyInPerson.noMatch` | It doesn't match | মেলেনি |
| `verifyInPerson.deleteCall` | Please delete this call from your call list. | অনুগ্রহ করে কল তালিকা থেকে এই কলটি মুছে ফেলুন। |
| `verifyInPerson.done` | {{name}}'s number is verified. | {{name}}-এর নম্বর যাচাই হয়েছে। |
| `verifyInPerson.failed` | Not verified. Ask them to check the number they entered. | যাচাই হয়নি। তাঁকে দেওয়া নম্বরটি আবার দেখতে বলুন। |
| `verifyInPerson.count` | {{n}} of {{max}} verifications today | আজ {{max}}টির মধ্যে {{n}}টি যাচাই |
**States:** loading lookup; invalid or expired code → `ERR_VERIFICATION_EXPIRED`; own code → `ERR_SELF_VERIFICATION`; daily limit (`inPersonVerificationsPerDay`) → `ERR_RATE_LIMITED`; success; no match.
**Events:** `phone_verified{method: "in_person"}`; audit `phone_verified_in_person` / `phone_verification_failed_in_person`.

#### SCR-V05 · Post for a family · `/volunteer/post` (if-time)
Same intake + form as SCR-M02 with: required paste box, contact number taken from the post (editable, VAL-03), label `volunteerPost.label` "Posted by a volunteer from a public post" / "স্বেচ্ছাসেবক কর্তৃক একটি প্রকাশ্য পোস্ট থেকে প্রকাশিত", and `volunteerPost.sourceNote` "Only use posts the family made public." / "শুধু পরিবারের প্রকাশ্য করা পোস্ট ব্যবহার করুন।" Request created with `source: "volunteer_paste"`, `createdByVolunteerId`, `contactPhoneVerified: false`.

### 3.6 Admin (desktop-first two-column layout ≥ 1024 px; stacked on mobile)

Admin screens are **English and Bangla** like the rest of the app. Every admin action that touches personal data, roles, settings or moderation writes an audit entry (§5, `auditLog`).

#### SCR-A01 · Dashboard · `/admin`
**Data source:** `statsSnapshots` documents (computed every 5 min, ADR-002) — never live scans. Header shows "Updated hh:mm".
**Layout (cards):**
1. **Live now:** open requests (live/covered), requests waiting > 15 min without a confirmed donor (red if > 0), volunteers on duty now.
2. **Blood pool:** bar chart of live donors by group (8 bars) + "available now" overlay; table toggle for screen readers.
3. **Speed (G1):** median time to first wave (target ≤ 60 s), median time to first acceptance for "Now" requests (target ≤ 15 min) — last 7 days and 30 days.
4. **Funnel (G2):** published → notified → opened → accepted → contact shared → reported by requester → confirmed by donor, with counts and the confirmation response rate.
5. **Participation (G3):** donors live (verified), new in last 30 days (line chart), availability freshness %.
6. **Volunteer coverage:** 24-hour heat strip (hours with no volunteer on duty in the last 7 days).
7. **Alerts:** usage warnings (from A08), AI status, unresolved moderation items count.
**Copy:** `admin.dashboard` "Dashboard" / "ড্যাশবোর্ড"; `admin.liveNow` "Live now" / "এই মুহূর্তে"; `admin.waiting15` "Waiting over 15 min" / "১৫ মিনিটের বেশি অপেক্ষায়"; `admin.bloodPool` "Donor pool by blood group" / "রক্তের গ্রুপ অনুযায়ী রক্তদাতা"; `admin.speed` "Speed" / "গতি"; `admin.funnel` "From request to donation" / "অনুরোধ থেকে রক্তদান"; `admin.responseRate` "{{pct}}% of contacts answered 'Did it happen?'" / "{{pct}}% যোগাযোগে 'রক্তদান হয়েছে?' প্রশ্নের উত্তর এসেছে"; `admin.coverage` "Volunteer coverage" / "স্বেচ্ছাসেবকদের উপস্থিতি".
**States:** snapshot missing → "Stats are being prepared" banner + trigger recompute (admin only); practice data never included (badge "Real data only").

#### SCR-A02 · Moderation queue · `/admin/moderation`
List of `moderationItems` (open first, severity then age): type (Report / Flag), kind (fake, money, harassment, request-farming, money mention, reveal volume, sign-up burst), subject, request, created, auto-action applied chip (Account frozen / Reveals frozen). Filters by status and kind. Empty: "Nothing to review. 🎉" / "পর্যালোচনার কিছু নেই।"

#### SCR-A03 · Moderation item · `/admin/moderation/[id]`
Shows: reports (reasons, details), the request (with slip if any), subject's history (requests, reports, reveals count), audit trail. **Decision panel:** Dismiss · Warn user · Hide request · Suspend (1–30 days) · Ban · Restore — each needs a reason (VAL-18); the subject is notified with the reason (NTF-14). Decision closes the item and lifts or keeps automatic freezes as chosen.
**Events:** `moderation_decided{decision}`.

#### SCR-A04 · People · `/admin/people`
Tabs: **Volunteer applications** (pending first: name, areas, institution, motivation, phone verified ✅) with Approve / Reject (reason) · **Search people** by name or internal ID (not by phone — prevents directory use) → results with role, status, donor group, created.
**Copy:** `admin.people` "People" / "মানুষ"; `admin.applications` "Volunteer applications" / "স্বেচ্ছাসেবক আবেদন"; `admin.approve` "Approve" / "অনুমোদন"; `admin.reject` "Reject" / "প্রত্যাখ্যান".

#### SCR-A05 · Person · `/admin/people/[id]`
Profile (name, age — not full DOB, role, status, language, joined, phone **hidden**), donor profile summary, requests, responses, reports, consents. Actions: **Reveal number** (reason required → audit + flag check S-24) · Change role (member / volunteer / admin; super-admin only can grant admin; cannot remove the last admin → `ERR_LAST_ADMIN`) · Suspend / ban / restore (with reason) · **Undo phone verification** (reason required → `admin.people.revokeVerification`) · Toggle practice account (super-admin only).

#### SCR-A06 · Audit log · `/admin/audit`
Paginated table (50 per page): time, actor (name + role), action, target, reason. Filters: actor, action, date range. Read-only; export = super-admin only (if-time).

#### SCR-A07 · AI controls · `/admin/ai`
Per feature (Intake, Duplicate hint, FAQ assistant, Appeal text, Weekly summary): On/Off switch, calls today, failures today, last error. Global: model names (read from settings), today's usage vs limits (Flash-Lite, Flash), 80 % rule status. **AI log** (last 30 days, `aiCalls`): time, feature, ok/fail, latency, redacted input (first 200 chars), output (first 200 chars) — no names/phones by construction. Copy: `admin.ai` "AI controls" / "AI নিয়ন্ত্রণ"; `admin.aiOff` "Off — the app uses the non-AI version" / "বন্ধ — অ্যাপ AI ছাড়া সংস্করণ ব্যবহার করছে".

#### SCR-A08 · Free-tier usage · `/admin/usage`
Rows per service (ADRs §3): measured value / limit / % bar / status (OK, ≥ 70 % warning, ≥ 90 % critical) / "Open provider dashboard" link. Measured by us: requests, notifications sent (Expo/web), AI calls per model per day, slip storage bytes, events table size estimate, Cloudinary usage (Usage API, daily cron), EAS Update MAU (manual entry field, monthly). Shows the degradation order and which features are currently degraded. Copy: `admin.usage` "Free-tier usage" / "ফ্রি-টিয়ার ব্যবহার"; `admin.usageWarn` "Above 70% — plan ahead" / "৭০%-এর বেশি — আগে থেকে পরিকল্পনা করুন"; `admin.usageCritical` "Above 90% — act now" / "৯০%-এর বেশি — এখনই ব্যবস্থা নিন".

#### SCR-A09 · Practice area · `/admin/demo`
**Purpose:** let judges, new volunteers and the team use the **live platform** without alerting real donors (§1.9, F-912, D-R4).
**Layout:** (1) switch **Practice area enabled** (`demoAreaEnabled`); (2) practice accounts table (up to 10): Practice ID (`P-01`…), name, role, donor group, **phone status** (verified real number or "not signed in yet"), last used; actions **Create** (super-admin: name, role, optional donor group → shows the generated Practice ID + 6-digit PIN **once**), **New PIN**, **Remove**; (3) practice hospital "UDVASITO Practice Hospital" (a real `hospitals` row with `isDemo: true`, placed at the venue's coordinates when known); (4) **Reset practice data** (deletes practice requests, responses, notifications, contact reveals and events — keeps accounts); (5) **Walkthrough checklist** (read-only list from PRD §2.3); (6) practice funnel numbers (labelled "Practice", never mixed with real numbers).
**Rules:** practice accounts go through normal onboarding on the phone they are used on and give **that phone's real number**; donor practice accounts must verify it (Telegram or in person) like everyone else. No fake numbers anywhere. Switching the practice area off signs out all practice sessions and hides `signin.practice`.
**Copy:** `admin.demo` "Practice area" / "অনুশীলন এলাকা"; `admin.demoNote` "Practice requests only reach practice accounts. Everything else is the real platform. Practice data is never counted in real numbers." / "অনুশীলনের অনুরোধ শুধু অনুশীলন অ্যাকাউন্টে যায়। বাকি সবকিছু আসল প্ল্যাটফর্ম। অনুশীলনের তথ্য কখনো আসল হিসাবে গণনা হয় না।"; `admin.practicePinOnce` "Write this PIN down now — it won't be shown again." / "পিনটি এখনই লিখে রাখুন — এটি আর দেখানো হবে না।"

#### SCR-A10 · Rule settings · `/admin/settings`
**Core (read-only):** table of all settings (key, label, value, unit, description, 🩺 marker). **If-time (editable):** inline edit with validation per §5.2 ranges, reason required, audit entry, "Reset to default".

#### SCR-A11 · Hospitals & blood banks · `/admin/directory` (if-time)
Table with search; add/edit form: name EN/BN (required), type, district, thana, address, blood-bank phone (VAL-03 or landline format `0\d{6,10}`), latitude/longitude (or "pick on map"), active.

#### SCR-A12 · FAQ · `/admin/faq` (if-time)
List; editor: question EN/BN, answer EN/BN (VAL-24), tags; status Draft → Approved (approver + date recorded). Only approved entries are used by the assistant.

#### SCR-A13 · Import / export · `/admin/data` (if-time)
**Import donors (CSV):** columns `name, phone, bloodGroup, district, upazila, lastDonationDate, consentEvidence` → creates **invitations** only (no live donors) and a report of invalid rows. **Exports:** anonymised stats CSV (all admins); personal-data CSV (super-admin only, rate-limited 3/day, values prefixed to prevent formula injection — any cell starting with `= + - @` gets a leading `'`).

### 3.7 Public pages (web; also reachable in the app via More)

#### SCR-P01 · Landing · `/`
**Native:** no UI — redirect (`/home` if signed in, else `/welcome`).
**Web layout:** (1) header: logo, language toggle, "Download app", "Sign in"; (2) hero: `landing.hero` + `landing.sub` + buttons **Need blood** (→ `/request/new`, gates apply) and **Become a donor** (→ `/donor/setup`); (3) "How it works" 4 steps with icons; (4) **Live impact** (if-time, from `/public/stats` cached endpoint, practice area excluded): donors by group, requests helped, donations confirmed — "Updated every 5 minutes"; (5) dengue strip → `/learn/dengue`; (6) Responsible AI summary (3 bullets) → `/about`; (7) footer: `common.notBloodBank`, Privacy, Terms, About, contact email, "A student initiative, University of Chittagong".
**Copy:** `landing.hero` "One request. The right donor. Minutes, not hours." / "একটি অনুরোধ। সঠিক রক্তদাতা। ঘণ্টা নয়, মিনিটে।"; `landing.sub` "Free, bilingual blood-donor network for Bangladesh — starting in Chattogram. Your number is never public." / "বাংলাদেশের জন্য বিনামূল্যের দ্বিভাষিক রক্তদাতা নেটওয়ার্ক — শুরু চট্টগ্রাম থেকে। আপনার নম্বর কখনো প্রকাশ্য নয়।"; `landing.how1` "Post one request — type, speak or paste" / "একটি অনুরোধ দিন — লিখে, বলে বা পেস্ট করে"; `landing.how2` "Matching donors nearby are alerted in seconds" / "কয়েক সেকেন্ডে কাছের উপযুক্ত রক্তদাতাদের জানানো হয়"; `landing.how3` "A volunteer steps in if nobody answers in 30 seconds" / "৩০ সেকেন্ডে কেউ সাড়া না দিলে একজন স্বেচ্ছাসেবক এগিয়ে আসেন"; `landing.how4` "Numbers are shared only when a donor says yes" / "রক্তদাতা রাজি হলেই কেবল নম্বর শেয়ার হয়".
**Performance:** static HTML shell, hero renders without JS data; impact numbers load after.

#### SCR-P02 · Shared request · `/r/[slug]` (if-time)
Anonymised request (group, component, units, hospital name, area, needed-by, status) — **no names, no numbers**; language from `?lang`. If status live: **I can help** → consent → sign-in → donor setup (pre-filled group) → eligibility check → accept (server re-checks rules; if not eligible, explain and offer to share). If closed: "This request is no longer active. Thank you for caring." / "এই অনুরোধটি আর সক্রিয় নয়। আপনার আন্তরিকতার জন্য ধন্যবাদ।" Report link. Open Graph tags come from the Cloudflare Worker (ADR-006, ADR-024).

#### SCR-P03 · Learn · `/learn`, SCR-P04 · Dengue & platelets · `/learn/dengue` (if-time)
Content pages from Markdown files in `src/content/<lang>/*.md` (written by member 3, reviewed by the medical reviewer; a "Reviewed by {{name}} on {{date}}" line at the bottom). Every page shows `common.notMedicalAdvice`. Dengue page CTAs: "Ask for platelets" → `/request/new?dengue=1`; "Become a platelet donor" → `/donor/setup`.

#### SCR-P05 · About · `/about`
Mission, team (5 members, roles — no personal phone numbers), the 7 Responsible-AI commitments (PRD §6.4) verbatim, data sources and licences (geodata, OpenFreeMap/OpenStreetMap attribution), medical reviewer credit, open-source link (GitHub), contact email.

#### SCR-P06 / SCR-P07 · Privacy / Terms · `/privacy`, `/terms`
Versioned Markdown (`src/content/legal/privacy.<lang>.md`, `terms.<lang>.md`, rendered by `CMP-Markdown`) with version + effective date at the top; the version string equals `settings.consentVersion`. Content drafted by member 4 (data-protection lead) and reviewed per NFR-08. **Must cover:** who we are (OQ-09), what we collect and why (per field), legal basis (consent), who sees what (PRD §3.3 in plain words), AI processing and voice notice, processors (Convex, Cloudflare, Google — sign-in, Gemini, FCM; Expo; Telegram; Cloudinary; Sentry), hosting outside Bangladesh, retention (PRD §5.9), your rights (access, correction, deletion, withdraw consent), 18+ only, contact, changes.
**Copy** (Q-012, 2026-11-27):
| Key | English | বাংলা |
|---|---|---|
| `legal.version` | Version {{version}} · in effect from {{date}} | সংস্করণ {{version}} · কার্যকর {{date}} থেকে |

#### SCR-P08 · Download · `/download`
Android: big **Download APK** button (`settings.apkUrl`, version, size, date) + 4-step install guide ("Allow installs from this source") + SHA-256 checksum; "Or use the web app" link. iPhone: "Add to Home Screen" 3-step guide with illustrations + note on alerts (iOS 16.4+). Desktop: "Install" button (PWA `beforeinstallprompt`) where supported.
**Copy** (Q-014; "Or use the web app" → `update.useWeb`, iPhone alerts note → `alertGuide.ios`; icons stand in for the illustrations until they exist; the Android part is hidden while `settings.apkUrl` is empty):
| Key | English | বাংলা |
|---|---|---|
| `download.title` | Get the UDVASITO app | উদ্ভাসিত অ্যাপ নিন |
| `download.android` | Android | অ্যান্ড্রয়েড |
| `download.apk` | Download for Android | অ্যান্ড্রয়েডের জন্য ডাউনলোড করুন |
| `download.apkMeta` | Version {{version}} · {{size}} · {{date}} | সংস্করণ {{version}} · {{size}} · {{date}} |
| `download.step1` | Tap the button and open the file when the download finishes. | বোতামে ট্যাপ করুন, ডাউনলোড শেষ হলে ফাইলটি খুলুন। |
| `download.step2` | If your phone asks, allow installs from this source (your browser or Files app). | ফোন জিজ্ঞেস করলে এই উৎস থেকে ইনস্টলের অনুমতি দিন (আপনার ব্রাউজার বা ফাইলস অ্যাপ)। |
| `download.step3` | Tap Install. | Install চাপুন। |
| `download.step4` | Open UDVASITO and allow notifications, so blood requests reach you. | উদ্ভাসিত খুলুন এবং নোটিফিকেশনের অনুমতি দিন, যাতে রক্তের অনুরোধ আপনার কাছে পৌঁছায়। |
| `download.checksum` | SHA-256 checksum (to check the file is genuine) | SHA-256 চেকসাম (ফাইলটি আসল কি না যাচাই করতে) |
| `download.iphone` | iPhone | আইফোন |
| `download.iphoneStep1` | Open udvasito.com in Safari. | Safari-তে udvasito.com খুলুন। |
| `download.iphoneStep2` | Tap Share, then "Add to Home Screen". | Share চাপুন, তারপর "Add to Home Screen"। |
| `download.iphoneStep3` | Open UDVASITO from your Home Screen. | হোম স্ক্রিন থেকে উদ্ভাসিত খুলুন। |
| `download.computer` | Computer | কম্পিউটার |
| `download.install` | Install the web app | ওয়েব অ্যাপ ইনস্টল করুন |

#### SCR-P09 · Not found
"This page doesn't exist." / "এই পৃষ্ঠাটি নেই।" + Home button. (No helpline on this page — D-R3.)

---

## 4. Validation rules

**Single source of truth:** `convex/rules/validation.ts` (pure TypeScript + zod) is imported by the app for instant field errors **and** re-run by every Convex mutation. The server never trusts client validation. Messages below are the exact i18n strings (`validation.<rule>.<case>`).

| Rule | Field | Rule details | Case → message (English / বাংলা) |
|---|---|---|---|
| VAL-01 | Full name | Required; trimmed length 2–60; letters (Latin or Bangla), spaces, `.` `-` `'` only | empty → "Please enter your name." / "অনুগ্রহ করে আপনার নাম লিখুন।" · short → "Name must be at least 2 letters." / "নাম অন্তত ২ অক্ষরের হতে হবে।" · long → "Name can be at most 60 characters." / "নাম সর্বোচ্চ ৬০ অক্ষরের হতে পারে।" · chars → "Use letters only (no numbers or symbols)." / "শুধু অক্ষর ব্যবহার করুন (সংখ্যা বা চিহ্ন নয়)।" |
| VAL-02 | Date of birth | Required; real date; not in the future; age ≥ `S-01` (18) else **underage flow** (no field error); age ≤ 100 | empty → "Please enter your date of birth." / "অনুগ্রহ করে জন্ম তারিখ দিন।" · invalid → "Please enter a real date." / "সঠিক তারিখ দিন।" · >100 → "Please check the year." / "সালটি যাচাই করুন।" |
| VAL-03 | Mobile number (and contact numbers) | Normalise: Bangla digits → Latin; strip spaces, dashes, brackets; accept `01XXXXXXXXX`, `8801XXXXXXXXX`, `+8801XXXXXXXXX`; valid if national part matches `^01[3-9]\d{8}$`; store as `+8801XXXXXXXXX` (`src/lib/phone.ts` shared with server) | empty → "Please enter a mobile number." / "অনুগ্রহ করে মোবাইল নম্বর দিন।" · invalid → "Enter a Bangladeshi mobile number like 01712345678." / "০১৭১২৩৪৫৬৭৮-এর মতো একটি বাংলাদেশি মোবাইল নম্বর দিন।" |
| VAL-04 | Blood group (request) | Required; one of 8 groups, `any`, `not_sure` | empty → "Please choose a blood group (or 'Not sure')." / "অনুগ্রহ করে রক্তের গ্রুপ বেছে নিন (অথবা 'নিশ্চিত নই')।" |
| VAL-05 | What is needed | Required; `whole_blood` or `platelets`; platelets cannot be combined with `any` | combo → "Platelets need a specific blood group or 'Not sure'." / "প্লাটিলেটের জন্য নির্দিষ্ট রক্তের গ্রুপ বা 'নিশ্চিত নই' বেছে নিন।" |
| VAL-06 | Units | Integer 1–10 | range → "Choose between 1 and 10 bags." / "১ থেকে ১০ ব্যাগের মধ্যে বেছে নিন।" |
| VAL-07 | Place | Required: `hospitalId` **or** (`districtId` + `upazilaId` + `placeText` 3–80 chars) | empty → "Please choose where blood is needed." / "অনুগ্রহ করে কোথায় রক্ত লাগবে তা বেছে নিন।" · placeText → "Please write the place name." / "অনুগ্রহ করে জায়গার নাম লিখুন।" |
| VAL-08 | Needed by | Required; ≥ now − 5 min; ≤ now + 30 days | past → "This time has already passed. Choose 'Now' or a later time." / "এই সময় পেরিয়ে গেছে। 'এখনই' বা পরের কোনো সময় বেছে নিন।" · far → "Requests can be at most 30 days ahead." / "অনুরোধ সর্বোচ্চ ৩০ দিন আগে দেওয়া যায়।" |
| VAL-09 | Patient name | Optional; ≤ 60; VAL-01 character rules | long → "Patient's name can be at most 60 characters." / "রোগীর নাম সর্বোচ্চ ৬০ অক্ষরের হতে পারে।" |
| VAL-10 | Ward / bed | Optional; ≤ 40 | long → "Ward/bed can be at most 40 characters." / "ওয়ার্ড/বেড সর্বোচ্চ ৪০ অক্ষরের হতে পারে।" |
| VAL-11 | Note | Optional; ≤ 300; phone numbers are detected and removed | phone → "Please don't put phone numbers in the note — donors get your contact number after they agree." / "নোটে ফোন নম্বর দেবেন না — রক্তদাতা রাজি হলে আপনার যোগাযোগ নম্বর পাবেন।" · long → "Note can be at most 300 characters." / "নোট সর্বোচ্চ ৩০০ অক্ষরের হতে পারে।" |
| VAL-12 | Slip photo | JPEG/PNG/WebP/HEIC; original ≤ 10 MB; app resizes to ≤ 1600 px longest side, JPEG quality 0.7, result ≤ 500 KB | type → "Please choose a photo (JPG or PNG)." / "অনুগ্রহ করে একটি ছবি বেছে নিন (JPG বা PNG)।" · size → "This photo is too large. Please take a new photo." / "ছবিটি অনেক বড়। অনুগ্রহ করে নতুন ছবি তুলুন।" |
| VAL-13 | Intake text | 5–2,000 characters | short → "Please write a little more (at least 5 characters)." / "আরেকটু লিখুন (অন্তত ৫ অক্ষর)।" · long → "Text is too long — keep it under 2,000 characters." / "লেখাটি অনেক বড় — ২,০০০ অক্ষরের মধ্যে রাখুন।" |
| VAL-14a | Donor area | Division, district, thana/upazila required | "Please choose your district and thana/upazila." / "অনুগ্রহ করে আপনার জেলা ও থানা/উপজেলা বেছে নিন।" |
| VAL-14b | Last donation | Date required unless "never"; not in the future; not before 1970 | missing → "Please enter your last donation date or tick 'I have never donated'." / "শেষ রক্তদানের তারিখ দিন অথবা 'আমি কখনো রক্ত দিইনি' টিক দিন।" · future → "This date is in the future." / "এই তারিখটি ভবিষ্যতের।" |
| VAL-14c | Eligibility checklist | All 3 ticked | "Please confirm all three to become a donor." / "রক্তদাতা হতে তিনটিই নিশ্চিত করুন।" |
| VAL-14d | Gender | Required (4 options) | "Please choose an option." / "অনুগ্রহ করে একটি বেছে নিন।" |
| VAL-15 | Any consent checkbox | Must be ticked | "Please tick the box to continue." / "এগিয়ে যেতে বক্সে টিক দিন।" |
| VAL-16 | Volunteer application | ≥ 1 area; motivation 10–300 | areas → "Choose at least one area." / "অন্তত একটি এলাকা বেছে নিন।" · motivation → "Please write 10 to 300 characters." / "১০ থেকে ৩০০ অক্ষরের মধ্যে লিখুন।" |
| VAL-17 | Report | Reason required; details ≤ 500 | reason → "Please choose a reason." / "অনুগ্রহ করে একটি কারণ বেছে নিন।" · long → "Details can be at most 500 characters." / "বিবরণ সর্বোচ্চ ৫০০ অক্ষরের হতে পারে।" |
| VAL-18 | Reason (admin/volunteer actions) | 5–200 characters | "Please give a reason (5 to 200 characters)." / "কারণ লিখুন (৫ থেকে ২০০ অক্ষর)।" |
| VAL-19 | Setting value | Per-key range in §5.2 | "Value must be between {{min}} and {{max}}." / "মান {{min}} থেকে {{max}}-এর মধ্যে হতে হবে।" |
| VAL-20 | Pause until | 1–180 days from today | "Choose a date between tomorrow and 6 months from now." / "আগামীকাল থেকে ৬ মাসের মধ্যে একটি তারিখ বেছে নিন।" |
| VAL-21 | Assistant question | 3–300 characters | "Please ask in 3 to 300 characters." / "৩ থেকে ৩০০ অক্ষরের মধ্যে প্রশ্ন করুন।" |
| VAL-22 / VAL-23 | Institution / area text | Optional; ≤ 80 | "Keep it under 80 characters." / "৮০ অক্ষরের মধ্যে রাখুন।" |
| VAL-24 | FAQ entry | Question ≤ 200, answer ≤ 1,000, both languages required to approve | "Both English and Bangla are required before approval." / "অনুমোদনের আগে ইংরেজি ও বাংলা দুটোই প্রয়োজন।" |
| VAL-25 | Delete confirmation | Must equal `DELETE` or `মুছুন` | "Type the word exactly to confirm." / "নিশ্চিত করতে শব্দটি হুবহু লিখুন।" |
| VAL-26 | In-person verification code | 6 characters from `ABCDEFGHJKLMNPQRSTUVWXYZ23456789` (no 0/O/1/I); case-insensitive input | "Enter the 6-character code from their screen." / "তাঁর স্ক্রিনে দেখানো ৬ অক্ষরের কোডটি লিখুন।" |
| VAL-27 | Practice sign-in | ID `^P-\d{2}$`; PIN exactly 6 digits (Bangla digits accepted) | "Check the Practice ID and PIN on your card." / "আপনার কার্ডে থাকা অনুশীলন আইডি ও পিন দেখে নিন।" |

**Form-level summary** (shown on submit when ≥ 1 error): "Please fix {{count}} thing(s) above." / "উপরের {{count}}টি বিষয় ঠিক করুন।"

---

## 5. Data model (Convex)

### 5.1 Schema (`convex/schema.ts`)
Conventions: all timestamps are milliseconds since epoch (UTC) — `_creationTime` is used as "created at"; calendar dates (`YYYY-MM-DD`) are in Asia/Dhaka. Every table that can hold practice data has `isDemo: boolean` and **every query filters on it** (practice-area isolation, F-912). Phone numbers live **only** in `profiles.phone`, `requests.contactPhone`, `phoneVerifications.verifiedPhone` and are read **only** through `convex/_lib/visibility.ts`.

```ts
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export const bloodGroup = v.union(v.literal("A+"), v.literal("A-"), v.literal("B+"), v.literal("B-"),
  v.literal("AB+"), v.literal("AB-"), v.literal("O+"), v.literal("O-"));
export const requestGroup = v.union(bloodGroup, v.literal("any"), v.literal("not_sure"));
export const component = v.union(v.literal("whole_blood"), v.literal("platelets"));
export const lang = v.union(v.literal("en"), v.literal("bn"));
export const role = v.union(v.literal("member"), v.literal("volunteer"), v.literal("admin"), v.literal("superadmin"));
export const callMode = v.union(v.literal("mutual"), v.literal("donor_calls"));

export default defineSchema({
  // ── People ───────────────────────────────────────────────
  profiles: defineTable({
    authUserId: v.string(),                       // Better Auth user id (component tables hold email/Google data)
    name: v.string(),                             // VAL-01
    firstName: v.string(),                        // first word of name — the only name shown to other members
    dateOfBirth: v.string(),                      // "YYYY-MM-DD" (VAL-02); admins see age only
    language: lang,
    role,
    phone: v.string(),                            // "+8801XXXXXXXXX" — read only via visibility.ts
    phoneVerified: v.boolean(),
    phoneVerifiedAt: v.optional(v.number()),
    phoneVerifiedVia: v.optional(v.union(v.literal("telegram"), v.literal("whatsapp"), v.literal("in_person"))),
    phoneVerifiedBy: v.optional(v.id("profiles")),  // verifier for in_person (D-R1)
    practiceId: v.optional(v.string()),           // "P-07" — practice accounts only (D-R4)
    status: v.union(v.literal("active"), v.literal("frozen"), v.literal("suspended"), v.literal("banned"),
      v.literal("deletion_pending"), v.literal("underage_blocked")),
    statusReason: v.optional(v.string()),
    statusUntil: v.optional(v.number()),          // suspension end
    deletionRequestedAt: v.optional(v.number()),
    consentVersion: v.string(),                   // latest accepted terms/privacy version
    lastActiveAt: v.number(),
    campaignCode: v.optional(v.string()),         // V07 campus drive attribution
    isDemo: v.boolean(),
  }).index("by_authUserId", ["authUserId"])
    .index("by_phone", ["phone"])
    .index("by_role", ["role"])
    .index("by_status", ["status"])
    .searchIndex("search_name", { searchField: "name", filterFields: ["isDemo", "role"] }),

  donorProfiles: defineTable({
    profileId: v.id("profiles"),
    bloodGroup: v.union(bloodGroup, v.literal("unknown")),
    gender: v.union(v.literal("male"), v.literal("female"), v.literal("other"), v.literal("unspecified")),
    divisionId: v.id("places"), districtId: v.id("places"), upazilaId: v.id("places"),
    areaText: v.optional(v.string()),             // VAL-23
    institution: v.optional(v.string()),          // VAL-22
    travelRange: v.union(v.literal("thana"), v.literal("district")),
    neverDonated: v.boolean(),
    lastDonationDate: v.optional(v.string()),     // "YYYY-MM-DD"
    lastDonationType: v.optional(component),
    plateletOptIn: v.boolean(),
    availability: v.union(v.literal("available"), v.literal("paused"), v.literal("unavailable")),
    pausedUntil: v.optional(v.number()),
    availabilityConfirmedAt: v.number(),          // for the 90-day freshness metric
    eligibleFrom: v.number(),                     // computed by rules/eligibility.ts on every change
    eligibleFromPlatelets: v.number(),
    callMode,                                     // D16 default per donor
    volunteersMayCall: v.boolean(),               // V10 opt-in
    verifiedRequestsOnly: v.boolean(),
    alertCapPerDay: v.number(),                   // default S-20
    quietStart: v.string(), quietEnd: v.string(), // "HH:mm"
    urgentOverride: v.boolean(),
    hidden: v.boolean(),
    live: v.boolean(),                            // derived: verified phone && consent && group known && !hidden && status active
    selfCheckAt: v.number(),                      // checklist confirmed
    healthConsentVersion: v.string(),
    noShowAt: v.array(v.number()),                // timestamps (last 90 days kept)
    firstLiveAt: v.optional(v.number()),          // set once, when `donor_profile_live` fires (specs §6.3)
    isDemo: v.boolean(),
  }).index("by_profile", ["profileId"])
    .index("by_match", ["isDemo", "live", "bloodGroup", "districtId"])
    .index("by_upazila", ["isDemo", "live", "upazilaId"]),

  volunteerProfiles: defineTable({
    profileId: v.id("profiles"),
    status: v.union(v.literal("pending"), v.literal("approved"), v.literal("rejected"), v.literal("revoked")),
    upazilaIds: v.array(v.id("places")),
    districtIds: v.array(v.id("places")),         // "whole district" shortcut
    institution: v.optional(v.string()),
    motivation: v.string(),
    numberDisplayConsentAt: v.number(),
    onDuty: v.boolean(),
    onDutySince: v.optional(v.number()),
    lastShownAt: v.optional(v.number()),          // least-busy rotation (V09)
    activeClaims: v.number(),
    reviewedBy: v.optional(v.id("profiles")), reviewedAt: v.optional(v.number()), reviewReason: v.optional(v.string()),
    isDemo: v.boolean(),
  }).index("by_profile", ["profileId"])
    .index("by_status", ["status"])
    .index("by_duty", ["isDemo", "status", "onDuty"]),

  consents: defineTable({
    profileId: v.id("profiles"),
    kind: v.union(v.literal("terms_privacy"), v.literal("donor_health_contact"), v.literal("volunteer_number_display")),
    version: v.string(), lang, acceptedAt: v.number(),
  }).index("by_profile_kind", ["profileId", "kind"]),

  phoneVerifications: defineTable({
    profileId: v.id("profiles"),
    method: v.union(v.literal("telegram"), v.literal("whatsapp"), v.literal("in_person")),
    token: v.string(),                            // 32-char random, Telegram deep-link payload
    code: v.optional(v.string()),                 // 6-char code for WhatsApp text or in-person check (VAL-26)
    verifierId: v.optional(v.id("profiles")),     // in_person only
    expiresAt: v.number(),                        // +10 min
    status: v.union(v.literal("pending"), v.literal("verified"), v.literal("mismatch"), v.literal("expired")),
    verifiedPhone: v.optional(v.string()),
    externalUserId: v.optional(v.string()),       // Telegram user id / WhatsApp wa_id
  }).index("by_token", ["token"]).index("by_code", ["code"]).index("by_profile", ["profileId"])
    .index("by_external", ["externalUserId"]),   // Telegram contact → the chat's open row

  blocks: defineTable({ blockerId: v.id("profiles"), blockedId: v.id("profiles") })
    .index("by_blocker", ["blockerId"]).index("by_pair", ["blockerId", "blockedId"]),

  // ── Reference data ───────────────────────────────────────
  places: defineTable({
    level: v.union(v.literal("division"), v.literal("district"), v.literal("upazila")),
    code: v.string(), nameEn: v.string(), nameBn: v.string(),
    parentId: v.optional(v.id("places")),
    lat: v.number(), lng: v.number(),
    isMetroThana: v.boolean(),
    neighbourIds: v.array(v.id("places")),        // upazilas within S-32 km (pre-computed at seed)
  }).index("by_level_parent", ["level", "parentId"]).index("by_code", ["code"]),

  hospitals: defineTable({
    nameEn: v.string(), nameBn: v.string(),
    aliases: v.array(v.string()),                 // short names people actually type: "CMCH", "চমেক", "Chittagong Medical", "Medical"
    searchText: v.string(),                       // lower-cased nameEn + nameBn + aliases, written by the seed/import script and admin edits
    type: v.union(v.literal("hospital"), v.literal("blood_bank"), v.literal("clinic")),
    divisionId: v.id("places"), districtId: v.id("places"), upazilaId: v.id("places"),
    address: v.optional(v.string()),
    bloodBankPhone: v.optional(v.string()),       // public institutional number
    lat: v.number(), lng: v.number(),
    active: v.boolean(), isDemo: v.boolean(),
  }).index("by_district", ["isDemo", "active", "districtId"])
    .searchIndex("search_all", { searchField: "searchText", filterFields: ["isDemo", "active", "districtId"] }),

  // ── Requests and responses ───────────────────────────────
  requests: defineTable({
    requesterId: v.id("profiles"),
    createdByVolunteerId: v.optional(v.id("profiles")),
    source: v.union(v.literal("form"), v.literal("voice"), v.literal("text"), v.literal("paste"), v.literal("volunteer_paste")),
    clientId: v.string(),                         // idempotency key from the device (uuid v4)
    bloodGroup: requestGroup,
    component, isDengue: v.boolean(),
    unitsNeeded: v.number(), unitsConfirmed: v.number(),
    hospitalId: v.optional(v.id("hospitals")),
    placeText: v.optional(v.string()),
    divisionId: v.id("places"), districtId: v.id("places"), upazilaId: v.id("places"),
    approxLat: v.number(), approxLng: v.number(), // hospital point or pin rounded to 3 decimals
    neededBy: v.number(),
    urgency: v.union(v.literal("now"), v.literal("today"), v.literal("later")),
    patientName: v.optional(v.string()), ward: v.optional(v.string()), note: v.optional(v.string()),
    contactPhone: v.string(),                     // read only via visibility.ts
    contactPhoneVerified: v.boolean(),
    lang,
    publicSlug: v.string(),                       // 10-char random, for /r/<slug>
    status: v.union(v.literal("live"), v.literal("covered"), v.literal("closed")),
    closeReason: v.optional(v.union(v.literal("fulfilled"), v.literal("not_needed"), v.literal("expired"), v.literal("removed"), v.literal("merged"))),
    closedAt: v.optional(v.number()),
    wave: v.number(),                             // 0 before first wave
    nextWaveAt: v.optional(v.number()),
    volunteerShownIds: v.array(v.id("volunteerProfiles")),
    volunteerShownAt: v.optional(v.number()),
    fallbackShown: v.boolean(),
    claimedByVolunteerId: v.optional(v.id("volunteerProfiles")),
    escalatedAt: v.optional(v.number()),
    zeroEligibleAtPublish: v.boolean(),
    verifiedBadge: v.boolean(),
    slipStatus: v.union(v.literal("none"), v.literal("pending"), v.literal("approved"), v.literal("rejected")),
    slipFileId: v.optional(v.id("_storage")),
    slipReviewedBy: v.optional(v.id("profiles")), slipReviewReason: v.optional(v.string()),
    mergedIntoId: v.optional(v.id("requests")),
    revealsFrozen: v.boolean(),
    hiddenByModerator: v.boolean(),
    aiAssisted: v.boolean(),
    personalDataPurgedAt: v.optional(v.number()),
    isDemo: v.boolean(),
  }).index("by_clientId", ["clientId"])
    .index("by_requester_status", ["requesterId", "status"])
    .index("by_status_district", ["isDemo", "status", "districtId"])
    .index("by_status_neededBy", ["status", "neededBy"])
    .index("by_publicSlug", ["publicSlug"])
    .index("by_dup", ["isDemo", "status", "bloodGroup", "hospitalId"])
    .index("by_closedAt", ["closedAt"]),

  responses: defineTable({
    requestId: v.id("requests"),
    donorProfileId: v.id("donorProfiles"),
    donorId: v.id("profiles"),
    wave: v.number(),                             // 0 = asked by a volunteer
    viaVolunteerId: v.optional(v.id("profiles")),
    state: v.union(v.literal("notified"), v.literal("opened"), v.literal("accepted"), v.literal("confirmed"),
      v.literal("standby"), v.literal("declined"), v.literal("withdrew"), v.literal("not_responding")),
    notifiedAt: v.number(), openedAt: v.optional(v.number()),
    acceptedAt: v.optional(v.number()), confirmedAt: v.optional(v.number()),
    acceptClientId: v.optional(v.string()),
    declineReason: v.optional(v.union(v.literal("busy"), v.literal("far"), v.literal("donated"), v.literal("unwell"), v.literal("other"))),
    callMode,
    stillComingAskedAt: v.optional(v.number()),
    stillComingAnswer: v.optional(v.union(v.literal("yes"), v.literal("cant"))),
    stillComingAnsweredAt: v.optional(v.number()),
    outcomeDonor: v.optional(v.union(v.literal("donated"), v.literal("did_not_donate"), v.literal("not_yet"))),
    outcomeDonorAt: v.optional(v.number()),
    outcomeRequester: v.optional(v.union(v.literal("donated"), v.literal("did_not_donate"), v.literal("not_yet"))),
    outcomeRequesterAt: v.optional(v.number()),
    isDemo: v.boolean(),
  }).index("by_request_state", ["requestId", "state"])
    .index("by_donor_state", ["donorId", "state"])
    .index("by_request_donor", ["requestId", "donorProfileId"]),

  contactReveals: defineTable({
    requestId: v.id("requests"),
    viewerId: v.id("profiles"), subjectId: v.id("profiles"),
    subjectRole: v.union(v.literal("donor"), v.literal("requester"), v.literal("volunteer")),
    reason: v.union(v.literal("confirmed_slot"), v.literal("volunteer_hotline"), v.literal("volunteer_optin_call"),
      v.literal("admin_reveal"), v.literal("volunteer_case")),
    reasonText: v.optional(v.string()),           // required for admin_reveal / volunteer_optin_call
    expiresAt: v.number(),
    isDemo: v.boolean(),
  }).index("by_viewer_request", ["viewerId", "requestId"])
    .index("by_subject", ["subjectId"])
    .index("by_request", ["requestId"]),

  // ── Notifications ────────────────────────────────────────
  notifications: defineTable({
    recipientId: v.id("profiles"),
    template: v.string(),                         // NTF-xx
    requestId: v.optional(v.id("requests")),
    channel: v.union(v.literal("expo"), v.literal("webpush"), v.literal("email"), v.literal("inapp")),
    status: v.union(v.literal("queued"), v.literal("sent"), v.literal("failed")),
    failure: v.optional(v.string()),
    openedAt: v.optional(v.number()),
    isDemo: v.boolean(),
  }).index("by_recipient", ["recipientId"])
    .index("by_request", ["requestId"]),

  webPushSubscriptions: defineTable({
    profileId: v.id("profiles"), endpoint: v.string(), p256dh: v.string(), auth: v.string(),
    userAgent: v.optional(v.string()), lastSuccessAt: v.optional(v.number()), failures: v.number(),
  }).index("by_profile", ["profileId"]).index("by_endpoint", ["endpoint"]),
  // Expo push tokens are stored by the @convex-dev/expo-push-notifications component.

  // ── Trust & safety ───────────────────────────────────────
  reports: defineTable({
    reporterId: v.id("profiles"), subjectId: v.id("profiles"), requestId: v.optional(v.id("requests")),
    reason: v.union(v.literal("fake"), v.literal("money"), v.literal("harassment"), v.literal("other")),
    details: v.optional(v.string()),
    autoAction: v.optional(v.union(v.literal("account_frozen"), v.literal("reveals_frozen"))),
    moderationItemId: v.id("moderationItems"),
    isDemo: v.boolean(),
  }).index("by_subject", ["subjectId"]),

  moderationItems: defineTable({
    type: v.union(v.literal("report"), v.literal("flag")),
    kind: v.union(v.literal("fake"), v.literal("money"), v.literal("harassment"), v.literal("other"),
      v.literal("request_farming"), v.literal("money_mention"), v.literal("reveal_volume"), v.literal("signup_burst")),
    subjectId: v.optional(v.id("profiles")), requestId: v.optional(v.id("requests")),
    severity: v.union(v.literal("high"), v.literal("medium"), v.literal("low")),
    status: v.union(v.literal("open"), v.literal("decided")),
    decision: v.optional(v.union(v.literal("dismiss"), v.literal("warn"), v.literal("hide_request"),
      v.literal("suspend"), v.literal("ban"), v.literal("restore"))),
    decisionReason: v.optional(v.string()), decidedBy: v.optional(v.id("profiles")), decidedAt: v.optional(v.number()),
    isDemo: v.boolean(),
  }).index("by_status", ["isDemo", "status"]),

  auditLog: defineTable({
    actorId: v.optional(v.id("profiles")),        // undefined = system
    actorRole: v.string(),
    action: v.string(),                           // see §6.6 audit action list
    targetType: v.string(), targetId: v.string(),
    reason: v.optional(v.string()),
    meta: v.optional(v.any()),                    // never phone numbers or free text from users
  }).index("by_actor", ["actorId"]).index("by_action", ["action"]),

  // ── Configuration & content ──────────────────────────────
  settings: defineTable({ key: v.string(), value: v.any(), updatedBy: v.optional(v.id("profiles")) })
    .index("by_key", ["key"]),

  faqEntries: defineTable({
    questionEn: v.string(), questionBn: v.string(), answerEn: v.string(), answerBn: v.string(),
    tags: v.array(v.string()),
    status: v.union(v.literal("draft"), v.literal("approved")),
    approvedBy: v.optional(v.id("profiles")), approvedAt: v.optional(v.number()),
  }).index("by_status", ["status"])
    .searchIndex("search_en", { searchField: "questionEn", filterFields: ["status"] })
    .searchIndex("search_bn", { searchField: "questionBn", filterFields: ["status"] }),

  campaigns: defineTable({ code: v.string(), name: v.string(), institution: v.optional(v.string()), active: v.boolean() })
    .index("by_code", ["code"]),

  invitations: defineTable({                      // A07 import — invited, never matchable until they sign up
    phone: v.string(), name: v.string(), bloodGroup: v.optional(bloodGroup),
    source: v.string(), consentEvidence: v.string(), status: v.union(v.literal("pending"), v.literal("joined")),
  }).index("by_phone", ["phone"]),

  // ── AI, events, stats, files ─────────────────────────────
  aiCalls: defineTable({
    feature: v.union(v.literal("intake"), v.literal("duplicate"), v.literal("assistant"), v.literal("appeal"), v.literal("summary")),
    model: v.string(), ok: v.boolean(), errorKind: v.optional(v.string()),
    inputRedacted: v.string(), output: v.string(), latencyMs: v.number(),
    profileId: v.optional(v.id("profiles")), isDemo: v.boolean(),
  }),                                              // deleted after S-36 days by the retention cron

  aiQuota: defineTable({ day: v.string(), model: v.string(), count: v.number() })   // day in America/Los_Angeles (quota reset)
    .index("by_day_model", ["day", "model"]),

  events: defineTable({
    name: v.string(), requestId: v.optional(v.id("requests")), actorRole: v.optional(v.string()),
    props: v.optional(v.any()), isDemo: v.boolean(),
  }).index("by_name", ["name"]).index("by_request", ["requestId"]),

  dailyRollups: defineTable({ day: v.string(), metric: v.string(), dims: v.optional(v.any()), value: v.number() })
    .index("by_metric_day", ["metric", "day"]),

  statsSnapshots: defineTable({ key: v.union(v.literal("public"), v.literal("admin")), data: v.any(), computedAt: v.number() })
    .index("by_key", ["key"]),

  usageCounters: defineTable({ day: v.string(), service: v.string(), metric: v.string(), value: v.number() })
    .index("by_service_day", ["service", "day"]),

  exports: defineTable({
    kind: v.union(v.literal("my_data"), v.literal("anon_stats"), v.literal("personal_data"), v.literal("daily_backup")),
    requestedBy: v.optional(v.id("profiles")), fileId: v.id("_storage"), expiresAt: v.number(),
  }).index("by_requestedBy", ["requestedBy"]),
});
```

### 5.2 Settings (seeded rows in `settings`; key → default; allowed range; PRD ref)
| Key | Default | Range / type | Ref |
|---|---|---|---|
| `minAge` | 18 | fixed (cannot be lowered) | S-01 |
| `maxDonorAge` | 65 🩺 | 60–70 | S-02 |
| `minWeightKg` | 50 🩺 | 45–60 | S-03 |
| `intervalWholeMaleDays` | 90 🩺 | 56–180 | S-04 |
| `intervalWholeOtherDays` | 120 🩺 | 56–180 | S-05 |
| `intervalPlateletDays` | 14 🩺 | 2–30 | S-06 |
| `intervalPlateletToWholeDays` | 14 🩺 | 2–90 | S-07 |
| `waveSizes` | [10, 25, 50] | each 1–200 | S-08 |
| `waveIntervalMin` | {now: 5, today: 15, later: 30} | 1–120 | S-09 |
| `waveCount` | 3 | 1–5 | S-10 |
| `compatibleInFinalWave` | true 🩺 | boolean | S-11 |
| `extraConfirmedSlots` | 1 | 0–3 | S-12 |
| `volunteerHotlineDelaySec` | 30 | 10–600 | S-13 |
| `maxVolunteersShown` | 2 | 1–5 | S-14 |
| `stillComingAfterMin` | {now: 10, other: 20} | 5–120 | S-15 |
| `stillComingBeforeNeededMin` | 30 | 10–180 | S-15c |
| `stillComingAnswerMin` | 5 | 2–30 | S-16 |
| `autoCloseAfterNeededHours` | 6 | 1–48 | S-17 |
| `contactVisibleAfterCloseDays` | 7 | 1–30 | S-18 |
| `confirmPromptHours` / `confirmReminderHours` | 24 / 24 | 1–72 | S-19 |
| `donorAlertCapPerDay` | 3 | 1–10 | S-20 |
| `quietHours` | {start: "00:00", end: "07:00"} | HH:mm | S-21 |
| `openRequestsUnverified` / `openRequestsVerified` / `requestsPerMonth` / `volunteerRequestsPerMonth` | 1 / 2 / 5 / 20 | 1–50 | S-22 |
| `revealsPerRequesterPerDay` | 10 | 1–50 | S-23 |
| `revealFlagPerDay` | 20 | 5–200 | S-24 |
| `signupsPerDevicePerHour` | 5 | 1–50 | S-25 |
| `slipDeleteMaxDaysAfterClose` | 7 | 0–30 | S-26 |
| `deletionDays` | 30 | 1–30 | S-27 |
| `availabilityNudgeDays` | 90 | 30–365 | S-28 |
| `aiIntakeCallsPerRequest` / `assistantQuestionsPerDay` | 2 / 10 | 0–10 / 0–50 | S-29 |
| `usageWarnPct` / `usageCriticalPct` | 70 / 90 | 50–99 | S-30 |
| `duplicateWindowHours` | 24 | 1–72 | S-31 |
| `neighbourKm` | 10 | 2–50 | S-32 |
| `realtimeFallbackSec` | 15 | 5–60 | S-33 |
| `reopenWindowHours` | 24 | 0–72 | S-34 |
| `purgePersonalFieldsDays` | 30 | 7–90 | S-35 |
| `aiLogRetentionDays` | 30 | 1–30 | S-36 |
| `noShowPenalty` | {count: 2, days: 90} | 1–10 / 30–180 | S-37 |
| `consentVersion` | `2026-11-28-pilot` at pilot go-live (D-R5); the final version after the law review (Day 12) | string | X08 |
| `minimumAppVersion` / `latestAppVersion` / `apkUrl` / `apkSha256` | "1.0.0" / "1.0.0" / GitHub Release URL / hash | strings | ADR-007 |
| `fallbackContactPhone` | super-admin's number | VAL-03 | OQ-06 |
| `contactEmail` | team email | email | OQ-10 |
| `medicalReviewer` | {name, reviewedAt} | object | OQ-01 |
| `ai.features` | {intake: true, duplicate: true, assistant: true, appeal: true, summary: true} | booleans | F-902 |
| `ai.models` | {lite: "<current Flash-Lite id>", flash: "<current Flash id>"} | strings | ADR-010 |
| `ai.limits` | {liteDaily: 500, liteRpm: 15, flashDaily: 20} | numbers | §6.3 PRD |
| `verification` | {telegram: true, whatsapp: false, inPerson: true, telegramBot: "<bot username>", whatsappNumber: ""} | object | ADR-004, D-R1 |
| `inPersonVerificationsPerDay` | 60 | 10–200 | D-R1 (per verifier) |
| `emailSignInEnabled` | false | boolean | T-5 |
| `demoAreaEnabled` | true (staging) / false until judging prep (prod) | boolean | F-912 |
| `pilotDistrictIds` | [Chattogram district id] | ids | OQ-12 (requests elsewhere allowed) |
| `features` | all `false`: {duplicateWarning, sharedLinks, campaignStats, impactNumbers, learnPages, assistant, volunteerPost, slips, repeatRequest, donorHistory, reminders, editProfile, alertLimits, settingsEdit, directoryUi, faqUi, dataImportExport, weeklySummary, emailAlerts, installPrompts, pinMap} | booleans | `roadmap.md` §3 P7 — every "if-time" (Should) feature ships switched off and is turned on only after it passes QA; a switched-off feature shows no entry point anywhere |

### 5.3 Relationships
```
profiles 1─0..1 donorProfiles          profiles 1─0..1 volunteerProfiles
profiles 1─* consents                  profiles 1─* phoneVerifications
profiles 1─* requests (requesterId)    requests 1─* responses ─* 1 donorProfiles
requests 1─* contactReveals            requests 0..1─1 _storage (slip)
requests *─1 hospitals                 hospitals/donorProfiles/requests *─1 places (division/district/upazila)
places (upazila) *─* places (neighbourIds)
reports *─1 moderationItems            notifications *─1 profiles, *─0..1 requests
```

### 5.4 Derived values (always computed by `convex/rules/*`, never edited by hand)
- `donorProfiles.eligibleFrom` = last whole-blood donation + interval by gender (S-04/S-05), or last platelet donation + S-07; `eligibleFromPlatelets` = last platelet donation + S-06, or last whole-blood donation + whole-blood interval; never-donated → `0`.
- `donorProfiles.live` = phone verified ∧ health consent current ∧ group ≠ unknown ∧ ¬hidden ∧ profile status active ∧ age within S-01..S-02.
- `requests.urgency` from `neededBy` (§SCR-M02 behaviour).
- `requests.status` = `covered` when `unitsConfirmed ≥ unitsNeeded`, back to `live` if it drops.

---

## 6. API specification

### 6.0 Conventions
- **Transport:** Convex functions called from the app with `useQuery` / `useMutation` / `useAction` (names below = `api.<file>.<function>`), plus a few **HTTP endpoints** on the Convex site URL and one Cloudflare Worker (ADR-024).
- **"Who"** = minimum role. Every public function starts with an auth wrapper from `convex/_lib/auth.ts` that loads the caller's profile and enforces: signed in, consent current, status allowed, role. Internal functions (`internal.*`) are never callable by clients.
- **Errors:** `throw new ConvexError({ code, params?, field? })`. The app maps `code` → `errors.<code>` (§6.5). Validation failures use `ERR_VALIDATION` with `field` and the VAL rule's message key.
- **Idempotency:** functions marked 🔁 take a `clientId` (uuid v4 generated on the device and stored in the outbox) and return the original result when called again.
- **Phone numbers** are only ever returned by the functions marked 📞, which go through `convex/_lib/visibility.ts` (PRD §3.3) and write `contactReveals` / audit entries.
- **Practice-area isolation:** every read and write is scoped to the caller's `isDemo`; mixing throws `ERR_DEMO_ISOLATION`.
- **Rate limits** use `@convex-dev/rate-limiter`; exceeding throws `ERR_RATE_LIMITED {minutes}`.

### 6.1 Accounts, consent, verification
| Function | Type | Args | Returns | Who | Errors | Side effects |
|---|---|---|---|---|---|---|
| `profiles.me` | query | — | `{profile (incl. own phone), donor?: summary, volunteer?: summary, needsConsent: bool, flags}` | signed in | `ERR_UNAUTHENTICATED` | — |
| `profiles.completeOnboarding` | mutation | `{name, dateOfBirth, phone, language, consentVersion, consentAcceptedAt, campaignCode?}` | `{result: "ok" \| "underage"}` | signed in, no complete profile | `ERR_VALIDATION`, `ERR_RATE_LIMITED` (S-25) | Creates/updates profile; `consents` row; underage → `status: underage_blocked`; event `profile_completed`; audit `consent_accepted` |
| `profiles.updateLanguage` | mutation | `{language}` | `null` | member | — | — |
| `profiles.updateProfile` | mutation | `{name?, phone?}` | `null` | member | `ERR_VALIDATION` | Phone change → `phoneVerified=false`, donor `live` recomputed |
| `profiles.requestDeletion` | mutation | `{confirmWord}` | `{deleteBy}` | member | `ERR_VALIDATION` (VAL-25) | `status: deletion_pending`; purge scheduled at +S-27 days; audit |
| `profiles.cancelDeletion` | mutation | — | `null` | deletion_pending | — | Restore `active`; cancel purge |
| `profiles.exportMyData` | action | — | `{url, expiresAt}` | member | `ERR_RATE_LIMITED` (2/day) | JSON file in storage, `exports` row (24 h) |
| `profiles.whoHasMyNumber` 📞-meta | query | — | `[{requestDate, hospitalName, viewerFirstName, viewerRole, until}]` | member | — | — |
| `consents.accept` | mutation | `{kind, version, lang}` | `null` | member | — | `consents` row; profile.consentVersion; audit |
| `phoneVerification.start` | mutation | `{method: "telegram" \| "whatsapp"}` | `{verificationId, deepLink, expiresAt}` | member | `ERR_METHOD_DISABLED`, `ERR_RATE_LIMITED` (5/h) | `phoneVerifications` row; event `phone_verification_started` |
| `phoneVerification.status` | query | `{verificationId}` | `{status, verifiedPhone?, enteredPhone}` (own only) | member | `ERR_NOT_FOUND` | — |
| `phoneVerification.acceptMismatch` | mutation | `{verificationId}` | `null` | member | `ERR_PHONE_IN_USE`, `ERR_VERIFICATION_EXPIRED` | profile.phone = verifiedPhone, verified |
| `phoneVerification.startInPerson` | mutation | — | `{verificationId, code, expiresAt}` | member | `ERR_METHOD_DISABLED`, `ERR_RATE_LIMITED` (5/h) | `phoneVerifications` row (method `in_person`, code VAL-26, +10 min); event `phone_verification_started` |
| `phoneVerification.lookupInPerson` | query | `{code}` | `{verificationId, firstName, phoneLast4}` — never the full number | volunteer | `ERR_VERIFICATION_EXPIRED`, `ERR_SELF_VERIFICATION` | — |
| `phoneVerification.confirmInPerson` | mutation | `{verificationId, matches}` | `null` | volunteer | `ERR_VERIFICATION_EXPIRED`, `ERR_SELF_VERIFICATION`, `ERR_RATE_LIMITED` (`inPersonVerificationsPerDay`) | matches → `phoneVerified`, `phoneVerifiedVia: "in_person"`, `phoneVerifiedBy`, donor `live` recomputed, audit `phone_verified_in_person`, event `phone_verified`; no match → status `mismatch`, audit `phone_verification_failed_in_person` |
| `public.appConfig` | query | — | `{minimumAppVersion, latestAppVersion, apkUrl, apkSha256, consentVersion, emailSignInEnabled, practiceAreaEnabled, verification: {telegram, whatsapp, inPerson, telegramBot, whatsappNumber}, features, aiFeatures}` — **never a phone number** | public | — | Read by gates G1/G3, the sign-in and verify screens and every `features` check; cached on the device for 5 min |
| `support.helpline` | query | — | `{phone}` | member (signed in) | — | **Every** helpline button (sign-in, under-18, account status, no-donor fallback, limit errors, More, `CMP-ErrorState`) goes through `useHelpline()`: signed in → this query; signed out → `GET /public/helpline`. The number is fetched on tap, never pre-rendered (D-R3) |

### 6.2 Places, hospitals, intake, requests
| Function | Type | Args | Returns | Who | Errors | Side effects |
|---|---|---|---|---|---|---|
| `places.bundleVersion` | query | — | `{version}` | public | — | App refreshes its bundled list if newer |
| `places.list` | query | `{level, parentId?}` | `[{_id, nameEn, nameBn, lat, lng, parentId}]` | public | — | `parentId` lets the app resolve "use my location" on the device |
| `hospitals.search` | query | `{text, districtId?}` | top 10 `[{_id, nameEn, nameBn, upazila, lat, lng}]` — matches names **and aliases** (`search_all`) | public | — | — |
| `hospitals.bloodBanksNear` | query | `{districtId, upazilaId}` | `[{nameEn, nameBn, phone, distanceKm}]` (institutional numbers) | member | — | — |
| `intake.parse` | action | `{text, lang, source: "voice"\|"text"\|"paste"}` | `{fields: Partial<RequestFields>, hospitalCandidates: [...], missing: string[], aiUsed: bool, aiError?: "disabled"\|"quota"\|"unavailable", extractedPhone?: string}` | member | `ERR_VALIDATION` (VAL-13), `ERR_RATE_LIMITED` (10/h) | Rules parser → redaction (PRD §6.2) → AI only if required fields missing and allowed (S-29, quota, feature switch) → JSON validated → hospital names matched; `aiCalls` row (redacted); event `ai_call` |
| `requests.checkDuplicate` | query | `{bloodGroup, hospitalId?, upazilaId}` | `{match?: {slug, hospitalName, createdAt}}` | member | — | — (if-time) |
| `requests.create` 🔁 | mutation | `{clientId, bloodGroup, component, isDengue, unitsNeeded, hospitalId?, divisionId, districtId, upazilaId, placeText?, approxLat?, approxLng?, neededBy, contactPhone, patientName?, ward?, note?, source, aiAssisted, lang}` | `{requestId, existing: bool}` | member (active) | `ERR_VALIDATION`, `ERR_OPEN_REQUEST_LIMIT`, `ERR_MONTHLY_REQUEST_LIMIT`, `ERR_FROZEN`, `ERR_RATE_LIMITED` | Insert (urgency, slug, `contactPhoneVerified`); schedule `internal.matching.startRequest` now; money-word check → moderation flag (non-blocking); event `request_published` |
| `requests.getForOwner` 📞 | query | `{requestId}` | `{request, progress: {notified, opened, accepted, confirmed}, wave, nextWaveAt, confirmedDonors: [{responseId, firstName, group, areaName, distanceKm, phone?, callMode}], volunteers: [{firstName, phone}], fallbackPhone?, noDonors: {show, bloodBanks[]}, revealsFrozen}` | owner | `ERR_NOT_FOUND` | Phones only for existing unexpired `contactReveals` |
| `requests.listMine` | query | `{status: "active"\|"closed", paginationOpts}` | page of summaries | member | — | — |
| `requests.update` | mutation | `{requestId, unitsNeeded?, neededBy?, note?}` | `null` | owner | `ERR_VALIDATION`, `ERR_REQUEST_CLOSED` | Units up while covered → `live` + next wave now; event `request_updated` |
| `requests.close` | mutation | `{requestId, reason: "fulfilled"\|"not_needed"}` | `null` | owner, volunteer (claimed), admin | `ERR_REQUEST_CLOSED` | Cancel scheduled jobs; NTF-09 to notified/opened/standby donors; schedule confirmation prompt; event `request_closed` |
| `requests.reopen` | mutation | `{requestId}` | `null` | owner | `ERR_REQUEST_CLOSED` (window passed) | `live` + wave 1 for donors not yet notified |
| `requests.markDonorNotResponding` | mutation | `{requestId, responseId}` | `null` | owner | `ERR_NOT_FOUND` | Response → `not_responding` (kept visible); donor `noShowAt` += now; promote standby or run next wave now; event |
| `requests.generateSlipUploadUrl` | mutation | `{requestId}` | `{uploadUrl}` | owner | — | (if-time) |
| `requests.attachSlip` | mutation | `{requestId, storageId}` | `null` | owner | `ERR_VALIDATION` | `slipStatus: pending` (if-time) |
| `requests.publicView` | query | `{slug}` | `{bloodGroup, component, isDengue, unitsNeeded, unitsConfirmed, hospitalName, areaName, neededBy, status, lang}` — **no people data** | public | `ERR_NOT_FOUND` | — |
| `requests.shareCard` | action | `{requestId, lang, includeMyNumber: bool}` | `{imageUrl, text, link}` | owner | — | Cloudinary URL from template (no phone in image); event `request_shared` (if-time) |
| `requests.merge` | mutation | `{fromId, intoId}` | `null` | volunteer | — | (if-time) responses moved, `from` closed `merged` |

### 6.3 Donors and responses
| Function | Type | Args | Returns | Who | Errors | Side effects |
|---|---|---|---|---|---|---|
| `donors.getMine` | query | — | `{donor, eligibleFrom, eligibleFromPlatelets, live, notLiveReasons[]}` | member | — | — |
| `donors.upsert` | mutation | `{bloodGroup, gender, divisionId, districtId, upazilaId, areaText?, institution?, travelRange, neverDonated, lastDonationDate?, lastDonationType?, plateletOptIn, callMode, checklist: {weight, health, screening}, healthConsentVersion}` | `{live, notLiveReasons}` | member | `ERR_VALIDATION` | Eligibility computed; `consents` (donor_health_contact); event `donor_profile_live` on first live |
| `donors.setAvailability` | mutation | `{availability, pausedUntil?}` | `null` | donor | `ERR_VALIDATION` (VAL-20) | `availabilityConfirmedAt`; event `availability_changed` |
| `donors.updateSettings` | mutation | partial `{plateletOptIn, callMode, volunteersMayCall, verifiedRequestsOnly, alertCapPerDay, quietStart, quietEnd, urgentOverride, hidden, travelRange, divisionId, districtId, upazilaId, gender, lastDonationDate, lastDonationType}` | `null` | donor | `ERR_VALIDATION` | `live`/eligibility recomputed |
| `donors.confirmStillAvailable` | mutation | — | `null` | donor | — | `availabilityConfirmedAt = now` |
| `donors.history` | query | — | `[{date, hospitalName, group, component}]` | donor | — | (if-time) |
| `responses.inbox` | query | — | `{needsAnswer[], saidYes[], earlier[]}` | donor | — | — |
| `responses.getForDonor` 📞 | query | `{requestId}` | `{request (no phone/patient unless confirmed), myResponse, requester?: {firstName, phone}, patientName?, ward?, hospital: {name, lat, lng}, trackRecord}` | donor with a response | `ERR_NOT_FOUND` | — |
| `responses.markOpened` | mutation | `{requestId, notificationId?}` | `null` | donor | — | `opened` + notification.openedAt; event `notification_opened` |
| `responses.accept` 🔁 | mutation | `{requestId, clientId, selfCheck: true, callMode}` | `{state: "confirmed"\|"standby", contactsPaused: bool}` | donor | `ERR_NOT_ELIGIBLE{reason}`, `ERR_REQUEST_CLOSED`, `ERR_ALREADY_RESPONDED`, `ERR_BLOCKED`, `ERR_FROZEN` | **Transaction:** re-check rules; confirmed if confirmed count < unitsNeeded + S-12 else standby; on confirm: `contactReveals` (requester→donor always; donor→requester unless `donor_calls`), `unitsConfirmed = min(confirmed, unitsNeeded)`, status `covered` when reached (stop waves), schedule still-coming checks + confirmation prompt; NTF-04 to requester; events `donor_accepted`, `donor_confirmed`/`donor_standby`, `contact_shared{mode}` |
| `responses.decline` | mutation | `{requestId, reason?, donatedDate?}` | `null` | donor | `ERR_ALREADY_RESPONDED` | "donated" updates last donation; event `donor_declined` |
| `responses.answerStillComing` | mutation | `{responseId, answer: "yes"\|"cant"}` | `null` | donor | — | `cant` = withdraw flow |
| `responses.withdraw` | mutation | `{responseId}` | `null` | donor | — | `withdrew`; promote standby or next wave now; NTF to requester; event `donor_withdrew` |
| `responses.recordOutcome` | mutation | `{requestId, responseId?, outcome: "donated"\|"did_not_donate"\|"not_yet", donationDate?}` | `null` | donor (own) or requester (about a donor) | — | Donor "donated" → last donation = date, type = request component, eligibility recomputed; events `donation_confirmed_by_donor` / `donation_reported_by_requester` |

### 6.4 Volunteers, slips, reports, assistant, push, admin
| Function | Type | Args | Returns | Who | Errors | Side effects |
|---|---|---|---|---|---|---|
| `volunteers.apply` | mutation | `{upazilaIds, districtIds, institution?, motivation, consentVersion}` | `null` | member, verified phone | `ERR_PHONE_NOT_VERIFIED`, `ERR_VALIDATION` | `volunteerProfiles` pending; consent row; NTF-17 to admins; event `volunteer_applied` |
| `volunteers.getMine` | query | — | volunteer profile | member | — | — |
| `volunteers.setOnDuty` | mutation | `{onDuty}` | `null` | volunteer | — | event `volunteer_duty_changed` |
| `volunteers.setAreas` | mutation | `{upazilaIds, districtIds}` | `null` | volunteer | `ERR_VALIDATION` | — |
| `volunteers.board` | query | `{filters, paginationOpts}` | page of request summaries (no donor phones) | volunteer | — | — |
| `volunteers.getRequest` | query | `{requestId}` | request + progress + confirmed donors' first names + candidates already asked | volunteer | `ERR_NOT_FOUND` | — |
| `volunteers.openCase` 📞 | mutation | `{requestId}` | `{requesterPhone}` | volunteer | — | `contactReveals` (volunteer_case) + audit (once per request) |
| `volunteers.claim` / `unclaim` | mutation | `{requestId}` | `null` | volunteer | — | `claimedByVolunteerId`, `activeClaims`; event `volunteer_claimed` |
| `volunteers.searchDonors` | mutation | `{requestId, group?, upazilaId?, districtId?, availableNow, eligibleNow, platelets}` | `[{donorProfileId, firstName, group, areaName, lastActive, eligible, alreadyNotified, canBeCalled}]` | volunteer | `ERR_RATE_LIMITED` (30/h) | audit `volunteer_donor_search` |
| `volunteers.askDonor` | mutation | `{requestId, donorProfileId}` | `null` | volunteer | `ERR_RATE_LIMITED` (10/request), `ERR_NOT_ELIGIBLE` | Response (wave 0, viaVolunteerId) + NTF-02; event `volunteer_asked_donor` |
| `volunteers.revealOptInDonor` 📞 | mutation | `{requestId, donorProfileId, reason}` | `{phone}` | volunteer | `ERR_FORBIDDEN` (donor not opted in), `ERR_VALIDATION` (VAL-18) | `contactReveals` (volunteer_optin_call) + audit + reveal-volume check |
| `slips.queue` / `slips.review` | query / mutation | `{}` / `{requestId, decision: "approve"\|"reject", reason?}` | list / `null` | volunteer | — | Approve → `verifiedBadge`; audit (if-time) |
| `reports.create` | mutation | `{subjectId, requestId?, reason, details?, block}` | `{autoAction?}` | member | `ERR_VALIDATION`, `ERR_RATE_LIMITED` (10/day) | `money` → subject `frozen`; `fake` by a confirmed donor → request `revealsFrozen`; moderation item; block; NTF-17; event `report_filed` |
| `blocks.create` / `blocks.remove` | mutation | `{profileId}` | `null` | member | — | — |
| `assistant.ask` | action | `{question, lang}` | `{mode: "faq"\|"doctor"\|"nomatch"\|"limit", answer?, faqId?}` | member | `ERR_VALIDATION` (VAL-21) | Redaction; AI only over approved FAQ (if-time) |
| `assistant.faqList` | query | `{lang, search?}` | approved FAQ entries | public | — | — |
| `push.registerExpoToken` | mutation | `{token}` | `null` | member | — | Stored by the push component |
| `push.registerWebSubscription` | mutation | `{endpoint, p256dh, auth, userAgent}` | `null` | member | — | upsert |
| `push.unregister` | mutation | `{token? , endpoint?}` | `null` | member | — | — |
| `push.sendTest` | mutation | — | `null` | member | `ERR_RATE_LIMITED` (3/h) | NTF-18 |
| `notifications.markOpened` | mutation | `{notificationId}` | `null` | recipient | — | `openedAt` |
| `admin.dashboard` | query | — | admin `statsSnapshots` | admin | `ERR_FORBIDDEN` | — |
| `admin.recomputeStats` | mutation | — | `null` | admin | — | schedules stats job |
| `admin.moderation.list` / `get` / `decide` | query / query / mutation | `{status}` / `{itemId}` / `{itemId, decision, reason, suspendDays?}` | — | admin | `ERR_VALIDATION` | Apply decision; NTF-14 to subject; audit `moderation_decided` |
| `admin.people.applications` / `reviewVolunteer` | query / mutation | — / `{volunteerProfileId, decision, reason?}` | — | admin | — | NTF-15; audit |
| `admin.people.search` / `get` | query | `{text}` / `{profileId}` | people **without phone** | admin | — | — |
| `admin.people.setRole` | mutation | `{profileId, role, reason}` | `null` | admin (admin role: superadmin only) | `ERR_LAST_ADMIN`, `ERR_FORBIDDEN` | audit `role_changed` |
| `admin.people.setStatus` | mutation | `{profileId, status, reason, until?}` | `null` | admin | — | audit `status_changed`; NTF-14 |
| `admin.people.revealPhone` 📞 | mutation | `{profileId, reason}` | `{phone}` | admin | `ERR_VALIDATION` | `contactReveals` (admin_reveal) + audit + S-24 flag |
| `admin.people.revokeVerification` | mutation | `{profileId, reason}` | `null` | admin | `ERR_VALIDATION` | `phoneVerified = false`; donor `live` recomputed; person notified; audit `phone_verification_revoked` |
| `admin.audit.list` | query | `{actorId?, action?, from?, to?, paginationOpts}` | page | admin | — | — |
| `admin.ai.status` / `setFeature` / `log` | query / mutation / query | — / `{feature, enabled}` / `{paginationOpts}` | — | admin | — | audit `ai_feature_changed` |
| `admin.usage.get` | query | — | per-service usage rows | admin | — | — |
| `admin.demo.status` / `setEnabled` / `createAccount` / `newPin` / `removeAccount` / `reset` | — | `createAccount {name, role, donorGroup?}` → `{practiceId, pin}` (PIN shown once, stored only as a hash by Better Auth) | — | admin (`createAccount`, `newPin`, `removeAccount`: superadmin) | `ERR_DEMO_ISOLATION` | Creates the Better Auth user `<id>@practice.udvasito.invalid` + profile with `isDemo: true`; `setEnabled(false)` revokes practice sessions; audit |
| `admin.settings.list` / `update` | query / mutation | — / `{key, value, reason}` | — | admin (update: if-time) | `ERR_VALIDATION` (VAL-19) | audit `setting_changed` |
| `admin.directory.*`, `admin.faq.*`, `admin.data.importDonors`, `admin.data.export` | — | — | — | admin | — | (if-time) |

### 6.5 HTTP endpoints
| Method & path | Host | Auth | Request | Response | Notes |
|---|---|---|---|---|---|
| `POST /telegram/webhook` | Convex site | Header `X-Telegram-Bot-Api-Secret-Token` = env `TELEGRAM_WEBHOOK_SECRET` (else 401) | Telegram `Update` JSON | `200 {}` always (after processing) | `/start <token>` → store chat↔token, reply (bilingual) with a one-button keyboard `request_contact: true` "Share my phone number / আমার ফোন নম্বর শেয়ার করুন"; `message.contact` with `contact.user_id === message.from.id` → normalise → verified or mismatch → reply "✅ Verified — go back to UDVASITO / ✅ যাচাই হয়েছে — উদ্ভাসিতে ফিরে যান"; contact of someone else → reply "Please share your own number." / "অনুগ্রহ করে নিজের নম্বর শেয়ার করুন।" |
| `GET /whatsapp/webhook` | Convex site | `hub.verify_token` = env | Meta verification query | `hub.challenge` | Only when `verification.whatsapp` is on |
| `POST /whatsapp/webhook` | Convex site | `X-Hub-Signature-256` HMAC with env `WHATSAPP_APP_SECRET` | Meta messages JSON | `200` | Text `VERIFY <code>` from `wa_id` → verify; **never send replies** |
| `GET /slip/:requestId` | Convex site | `Authorization: Bearer <session token>`; owner, volunteer, admin | — | image bytes, `Cache-Control: no-store` | audit `slip_viewed` (if-time) |
| `GET /public/stats` | Convex site | none | — | `{donorsByGroup, donorsLive, requestsHelped, donationsConfirmed, updatedAt}` (practice area excluded) | `Cache-Control: public, max-age=300` |
| `GET /public/helpline` | Convex site | none; rate limit **30 per hour per network (IP)** | — | `{phone}`; over the limit `429 {retryAfterMin}` | `Cache-Control: no-store`; called only when someone taps a helpline button (D-R3) |
| `GET /health` | Convex site | none | — | `{ok: true, time}` | For uptime checks |
| `/api/auth/*` | Convex site | Better Auth | — | — | Managed by the Better Auth component. Email + password: **staging** — any test account (P-10); **production** — only `*@practice.udvasito.invalid` accounts whose profile has `isDemo: true`, only while `demoAreaEnabled`, sign-up disabled, 5 wrong PINs per ID → 15-minute lock (server hook, D-R4) |
| `GET /r/:slug` | Cloudflare Worker | none | — | HTML with Open Graph tags (title "{{group}} {{component}} needed · {{hospital}}", description, `og:image` = Cloudinary card) + `<meta http-equiv="refresh">` to the app route `/r/<slug>` | No personal data; 404 page if not found |
**Telegram bot replies** (`POST /telegram/webhook`; each reply is the English line, then the Bangla line). The reply to
`/start <token>` is `telegramBot.share` with the one-button keyboard. A link that is unknown or past its 10 minutes
gets `verify.expired`; a shared number that is not a Bangladeshi mobile gets `validation.VAL-03.invalid`; a number
already verified on another account gets `errors.ERR_PHONE_IN_USE` and nothing changes (Q-015, Q-017).
| Key | English | বাংলা |
|---|---|---|
| `telegramBot.share` | Share my phone number | আমার ফোন নম্বর শেয়ার করুন |
| `telegramBot.verified` | ✅ Verified — go back to UDVASITO | ✅ যাচাই হয়েছে — উদ্ভাসিতে ফিরে যান |
| `telegramBot.ownNumber` | Please share your own number. | অনুগ্রহ করে নিজের নম্বর শেয়ার করুন। |

### 6.6 Scheduled and internal jobs (ADR-009)
| Job | Trigger | Logic (all idempotent — re-check state first) |
|---|---|---|
| `internal.matching.startRequest` | `requests.create`, `reopen` | Count eligible candidates; `zeroEligibleAtPublish`; NTF-03 to on-duty volunteers covering the request's upazila/district; schedule `volunteerHotline` at +S-13; run `runWave(1)` (skip donor waves for `not_sure`) |
| `internal.matching.runWave` | start; previous wave + S-09; immediate on no-show/withdraw without standby | Stop if not `live`; rank (PRD §5.3) excluding already-notified; size = S-08[wave] − opened-but-unanswered; create `responses` (notified) + NTF-01; set `wave`, `nextWaveAt`; if last wave → schedule `escalate` at +S-09 |
| `internal.matching.volunteerHotline` | +S-13 after publish | If no donor `accepted` and request live: choose ≤ S-14 on-duty volunteers (least `lastShownAt`, then fewest `activeClaims`) → `volunteerShownIds`, `contactReveals` (volunteer_hotline), NTF-05 to volunteer, NTF-06 to requester; none on duty → `fallbackShown = true` |
| `internal.matching.escalate` | after final wave interval | If live, no confirmed donor, unclaimed → NTF-07 to all on-duty volunteers in the district + admins; `escalatedAt` |
| `internal.lifecycle.stillComingCheck` | confirm + S-15; neededBy − S-15c | If still confirmed and unanswered → NTF-08; schedule `stillComingTimeout` at +S-16 |
| `internal.lifecycle.stillComingTimeout` | +S-16 | If unanswered → promote first standby (NTF-16) — or run next wave now; original donor stays confirmed |
| `internal.lifecycle.autoClose` | neededBy + S-17 | If not closed → close `expired`; NTF-10 to requester |
| `internal.admin.ops.setStatus` / `setRole` / `setDemo` / `closeRequest` (`convex/admin/ops.ts`) | Run from the CLI by the super-admin **until the admin screens exist** (P3/P5) | Same rules and audit entries as the matching admin screens (`status_changed`, `role_changed`, `demo_account_created`, `request_closed` by admin, reason required). `setRole` is how the operations admin (member 4) gets the admin role for in-person verification at the first drives. The Convex dashboard's data editor is never used to change live rows by hand — it skips audit and validation |
| `internal.admin.bootstrap.bootstrapSuperAdmin` (`convex/admin/bootstrap.ts`) | Run **once per deployment from the CLI** by the developer: `npx convex run admin/bootstrap:bootstrapSuperAdmin '{"email":"<team Google email>"}'` (add `--prod` for production) | Refuses if any super-admin exists or the account has not finished onboarding; sets `role: "superadmin"`; audit `role_changed` with actor `system`. Internal only — never callable from the app |
| `internal.lifecycle.confirmationPrompt` | first contact shared + S-19; reminder + S-19b | NTF-10 to requester and confirmed donors without an outcome |
| `crons: every 5 min` | — | `stats.computeSnapshots` (public + admin) |
| `crons: hourly` | — | End suspensions; expire `phoneVerifications`; end pauses (→ available + NTF-13) |
| `crons: daily 03:00 Asia/Dhaka` | — | NTF-11 eligible-again; NTF-12 availability nudges (S-28); retention (slips S-26, personal fields S-35, AI logs S-36, events > 90 days → `dailyRollups`, expired exports, deletions due S-27); daily backup export (NFR-03); usage counters (Cloudinary Usage API) |
| `crons: Monday 09:00 Asia/Dhaka` | — | Weekly AI summary from aggregates (if-time) |

### 6.7 Error codes (`errors.<CODE>` in i18n)
| Code | English | বাংলা |
|---|---|---|
| `ERR_UNAUTHENTICATED` | Please sign in again. | অনুগ্রহ করে আবার সাইন ইন করুন। |
| `ERR_CONSENT_REQUIRED` | Please review and accept the updated terms to continue. | এগিয়ে যেতে হালনাগাদ শর্তাবলি দেখে সম্মতি দিন। |
| `ERR_UNDERAGE` | You need to be 18 or older to use UDVASITO. | উদ্ভাসিত ব্যবহার করতে বয়স ১৮ বা তার বেশি হতে হবে। |
| `ERR_FORBIDDEN` | You don't have access to this page. | এই পৃষ্ঠায় আপনার প্রবেশাধিকার নেই। |
| `ERR_FROZEN` | Your account is paused for review. You can't do this right now. | আপনার অ্যাকাউন্ট পর্যালোচনার জন্য স্থগিত। এখন এটি করা যাবে না। |
| `ERR_NOT_FOUND` | We couldn't find this. It may have been removed. | এটি খুঁজে পাওয়া যায়নি। হয়তো সরিয়ে ফেলা হয়েছে। |
| `ERR_VALIDATION` | Please check the highlighted fields. | চিহ্নিত ঘরগুলো যাচাই করুন। |
| `ERR_RATE_LIMITED` | Too many tries. Please wait {{minutes}} min and try again. | অনেকবার চেষ্টা হয়েছে। {{minutes}} মিনিট পর আবার চেষ্টা করুন। |
| `ERR_OPEN_REQUEST_LIMIT` | You already have {{count}} open request(s). Close one or verify your number to open another. | আপনার ইতিমধ্যে {{count}}টি খোলা অনুরোধ আছে। আরেকটি খুলতে একটি বন্ধ করুন বা আপনার নম্বর যাচাই করুন। |
| `ERR_MONTHLY_REQUEST_LIMIT` | You've reached this month's request limit. Please call the helpline: {{phone}} | এ মাসের অনুরোধের সীমা শেষ। অনুগ্রহ করে হেল্পলাইনে কল করুন: {{phone}} |
| `ERR_PHONE_NOT_VERIFIED` | Please verify your mobile number first. | অনুগ্রহ করে আগে মোবাইল নম্বর যাচাই করুন। |
| `ERR_PHONE_IN_USE` | This number is already verified on another account. Contact us if this is your number. | এই নম্বরটি অন্য একটি অ্যাকাউন্টে যাচাই করা আছে। নম্বরটি আপনার হলে আমাদের সঙ্গে যোগাযোগ করুন। |
| `ERR_VERIFICATION_EXPIRED` | The verification link expired. Please start again. | যাচাইয়ের লিংকের মেয়াদ শেষ। আবার শুরু করুন। |
| `ERR_METHOD_DISABLED` | This verification method isn't available right now. | এই যাচাই পদ্ধতিটি এখন পাওয়া যাচ্ছে না। |
| `ERR_REQUEST_CLOSED` | This request is closed — no help is needed now. Thank you! | এই অনুরোধটি বন্ধ — এখন আর সাহায্যের প্রয়োজন নেই। ধন্যবাদ! |
| `ERR_ALREADY_RESPONDED` | You've already answered this request. | আপনি ইতিমধ্যে এই অনুরোধের উত্তর দিয়েছেন। |
| `ERR_NOT_ELIGIBLE` | You can't donate for this request right now: {{reason}}. | এখন এই অনুরোধে রক্ত দিতে পারবেন না: {{reason}}। |
| ↳ reason `cooldown` | you can donate again from {{date}} | {{date}} থেকে আবার দিতে পারবেন |
| ↳ reason `group` | your blood group doesn't match | আপনার রক্তের গ্রুপ মেলে না |
| ↳ reason `platelets` | you haven't opted in to platelet donation | আপনি প্লাটিলেট দানে সম্মতি দেননি |
| ↳ reason `age` | the donor age limit is {{min}}–{{max}} | রক্তদাতার বয়সসীমা {{min}}–{{max}} বছর |
| ↳ reason `notLive` | your donor profile isn't active yet | আপনার রক্তদাতা প্রোফাইল এখনো সক্রিয় হয়নি |
| `ERR_BLOCKED` | You can't respond to this request. | আপনি এই অনুরোধে সাড়া দিতে পারবেন না। |
| `ERR_REVEALS_FROZEN` | Contact details are paused while we review a report. | একটি অভিযোগ পর্যালোচনার সময় যোগাযোগের তথ্য স্থগিত আছে। |
| `ERR_LAST_ADMIN` | There must always be at least one admin. | সবসময় অন্তত একজন অ্যাডমিন থাকতে হবে। |
| `ERR_DEMO_ISOLATION` | Practice and real data can't be mixed. | অনুশীলন ও আসল তথ্য মেশানো যাবে না। |
| `ERR_SELF_VERIFICATION` | You can't verify your own number. | নিজের নম্বর নিজে যাচাই করা যায় না। |
| `ERR_APP_VERSION` | Please update the app. | অনুগ্রহ করে অ্যাপটি আপডেট করুন। |
| `ERR_INTERNAL` | Something went wrong on our side. Please try again. | আমাদের দিক থেকে কোনো সমস্যা হয়েছে। আবার চেষ্টা করুন। |
AI problems are **never** thrown as errors; `intake.parse` and `assistant.ask` return fallback modes.

### 6.8 Notification templates (push; language = recipient's `profile.language`)
**Lock-screen privacy:** no phone numbers, no patient names, no requester names in any push. Android channel `blood-requests` (importance MAX, §1.2.1) for NTF-01/02/07/08/16; `updates` (default) for the rest. Payload `data: {url, notificationId}`.

| ID | To | Title EN / BN | Body EN / BN | Opens |
|---|---|---|---|---|
| NTF-01 | Donor (wave) | `{{urgent}}{{group}} {{component}} needed · {{hospital}}` / `{{urgent}}{{group}} {{component}} প্রয়োজন · {{hospital}}` (urgent = "URGENT · " / "জরুরি · " when urgency now) | `{{units}} bag(s) by {{time}} · {{km}} km. Tap to answer.` / `{{units}} ব্যাগ, {{time}}-এর মধ্যে · {{km}} কিমি। উত্তর দিতে ট্যাপ করুন।` | `/alerts/{id}` |
| NTF-02 | Donor (volunteer ask) | `A volunteer asked you: {{group}} {{component}} · {{hospital}}` / `একজন স্বেচ্ছাসেবক অনুরোধ করেছেন: {{group}} {{component}} · {{hospital}}` | same as NTF-01 | `/alerts/{id}` |
| NTF-03 | On-duty volunteers | `New request in {{area}}: {{group}} {{component}}` / `{{area}}-এ নতুন অনুরোধ: {{group}} {{component}}` | `{{hospital}} · needed by {{time}}` / `{{hospital}} · {{time}}-এর মধ্যে` | `/volunteer/request/{id}` |
| NTF-04 | Requester | `{{name}} can donate!` / `{{name}} রক্ত দিতে পারবেন!` | `Open UDVASITO to call them now.` / `এখনই কল করতে উদ্ভাসিত খুলুন।` — donor_calls: `{{name}} will call you soon.` / `{{name}} শিগগিরই আপনাকে কল করবেন।` | `/request/{id}` |
| NTF-05 | Volunteer | `Your number was shared with a family` / `আপনার নম্বর একটি পরিবারকে দেওয়া হয়েছে` | `{{group}} at {{hospital}} — they may call you.` / `{{hospital}}-এ {{group}} — তারা আপনাকে কল করতে পারেন।` | `/volunteer/request/{id}` |
| NTF-06 | Requester | `A volunteer can help you now` / `একজন স্বেচ্ছাসেবক এখন সাহায্য করতে পারেন` | `Open UDVASITO to call them.` / `কল করতে উদ্ভাসিত খুলুন।` | `/request/{id}` |
| NTF-07 | Volunteers + admins | `No donor yet: {{group}} at {{hospital}}` / `এখনো রক্তদাতা নেই: {{hospital}}-এ {{group}}` | `Waiting {{min}} min. Can you help?` / `{{min}} মিনিট ধরে অপেক্ষায়। সাহায্য করতে পারবেন?` | `/volunteer/request/{id}` |
| NTF-08 | Confirmed donor | `Still coming to {{hospital}}?` / `আপনি কি {{hospital}}-এ আসছেন?` | `Tap to answer — the family is waiting.` / `উত্তর দিতে ট্যাপ করুন — পরিবারটি অপেক্ষা করছে।` | `/alerts/{id}` |
| NTF-09 | Notified donors | `No longer needed — thank you` / `আর প্রয়োজন নেই — ধন্যবাদ` | `The {{group}} request at {{hospital}} has been arranged.` / `{{hospital}}-এর {{group}} অনুরোধটির ব্যবস্থা হয়ে গেছে।` | `/alerts/{id}` |
| NTF-10 | Requester + confirmed donors | `Did the donation happen?` / `রক্তদান কি হয়েছে?` | `One tap helps us count real donations.` / `এক ট্যাপে আমরা আসল রক্তদান গুনতে পারি।` | `/confirm/{id}` |
| NTF-11 | Donor | `You can donate again from today` / `আজ থেকে আবার রক্ত দিতে পারবেন` | `Thank you for staying ready.` / `প্রস্তুত থাকার জন্য ধন্যবাদ।` | `/donor` |
| NTF-12 | Donor | `Still available to donate?` / `এখনো রক্ত দিতে প্রস্তুত?` | `Tap to confirm in one second.` / `এক সেকেন্ডে নিশ্চিত করতে ট্যাপ করুন।` | `/donor` |
| NTF-13 | Donor | `Your pause has ended` / `আপনার বিরতি শেষ` | `You'll receive requests again.` / `আবার অনুরোধ পাবেন।` | `/donor` |
| NTF-14 | Subject of a decision | `Message from UDVASITO` / `উদ্ভাসিতের বার্তা` | `{{action}}: {{reason}}` | `/account-status` |
| NTF-15 | Applicant | `Volunteer application approved` / `স্বেচ্ছাসেবক আবেদন অনুমোদিত` (rejected: `Volunteer application update` / `স্বেচ্ছাসেবক আবেদনের হালনাগাদ`) | `Open UDVASITO to start.` / `শুরু করতে উদ্ভাসিত খুলুন।` | `/volunteer` |
| NTF-16 | Standby donor | `You're now confirmed: {{group}} at {{hospital}}` / `আপনি এখন নিশ্চিত: {{hospital}}-এ {{group}}` | `Please contact the family now.` / `অনুগ্রহ করে এখনই পরিবারের সঙ্গে যোগাযোগ করুন।` | `/alerts/{id}` |
| NTF-17 | Admins | `New item to review` / `পর্যালোচনার জন্য নতুন বিষয়` | `{{kind}}` | `/admin/moderation` |
| NTF-18 | Self (test) | `Test alert from UDVASITO` / `উদ্ভাসিতের পরীক্ষামূলক অ্যালার্ট` | `If you can see this, alerts work.` / `এটি দেখতে পেলে অ্যালার্ট কাজ করছে।` | `/donor/alert-guide` |

### 6.9 Audit actions (`auditLog.action`)
`consent_accepted`, `contact_revealed`, `volunteer_case_opened`, `volunteer_optin_revealed`, `admin_phone_revealed`, `volunteer_donor_search`, `slip_viewed`, `slip_reviewed`, `role_changed`, `status_changed`, `volunteer_reviewed`, `moderation_decided`, `setting_changed`, `ai_feature_changed`, `export_created`, `data_imported`, `demo_reset`, `demo_account_created`, `demo_pin_reset`, `phone_verified_in_person`, `phone_verification_failed_in_person`, `phone_verification_revoked`, `deletion_requested`, `deletion_completed`, `account_frozen_auto`, `reveals_frozen_auto`.

### 6.10 Rules engine contracts (`convex/rules/*`, pure TypeScript, 100 % unit-tested)
| Module | Signature | Notes |
|---|---|---|
| `eligibility.ts` | `computeEligibility(donor, settings) → {eligibleFrom, eligibleFromPlatelets}`; `canDonate(donor, component, now, settings, dob) → {ok} \| {ok: false, reason, date?}` | PRD §5.1 |
| `compatibility.ts` | `groupsFor(patientGroup, component, isFinalWave, settings) → {exact: Group[], compatible: Group[]}` | PRD §5.2 table; platelets exact only; `any` → all; `not_sure` → none |
| `ranking.ts` | `rankCandidates(candidates, request, places, settings, now) → Candidate[]` | Filter + tiers + tie-breakers (PRD §5.3); quiet hours, caps, blocks, verified-only, travel range |
| `waves.ts` | `nextWaveSize(waveIndex, openedUnanswered, settings)`; `nextWaveAt(request, settings)` | PRD §5.4 |
| `redaction.ts` | `redact(text) → {text, removed: {phones, names, diagnoses, emails, ids}}` | PRD §6.2; Bangla + English + Banglish; numbers in Bangla digits |
| `intakeParser.ts` | `parseIntake(text, lang, refData) → {fields, confidence, missing}` | Blood group spellings (`B+`, `b pos`, `বি পজিটিভ`, `B positive`, `o neg`, `ও নেগেটিভ`, `AB+ve`…), units (`2 bag`, `২ ব্যাগ`, `two bags`), time words (`ajke`, `আজ`, `kal`, `আগামীকাল`, `kal sokal`, `rat 10 tay`, `এখনই`, `urgent`, `জরুরি`), dengue words (`dengue`, `ডেঙ্গু`, `platelet`, `প্লাটিলেট`), hospital alias list (e.g. CMCH, চমেক, Chittagong Medical → Chittagong Medical College Hospital) — `refData.hospitals` = `[{_id, nameEn, nameBn, aliases}]` from the `hospitals` table, never a hard-coded list |
| `limits.ts` | `canCreateRequest(profile, counts, settings) → {ok} \| {code, params}` | PRD §5.8 |
| `validation.ts` | zod schemas for every form + `normalisePhone()` | §4 |

**AI prompt — intake (Flash-Lite, temperature 0, JSON schema output):**
> System: "You extract blood-request details from a short message written in English, Bangla, or Banglish (Bangla written in Latin letters). Return only JSON that matches the schema. Use null when a value is not clearly stated — never guess. Do not output names, phone numbers, or medical details. Today's date in Asia/Dhaka is {{today}}."
> Schema: `{bloodGroup: "A+"|…|"O-"|"any"|null, component: "whole_blood"|"platelets"|null, isDengue: boolean|null, units: integer 1–10|null, hospitalName: string|null, area: string|null, neededBy: {kind: "now"|"today"|"tomorrow"|"datetime"|null, isoDateTime: string|null}}`

**AI prompt — FAQ assistant (if-time):**
> System: "Answer only from the FAQ entries provided below. If the question is about the user's own health, illness, symptoms, medicines or test results, return {"mode":"doctor"}. If no entry answers it, return {"mode":"nomatch"}. Otherwise return {"mode":"faq","faqId":"…","answer":"…"} where answer restates that entry in {{lang}} in at most 80 words without adding any facts."

---

## 7. Non-functional specifications

### 7.1 Performance budgets (checked before each production release)
| Metric | Target | How measured |
|---|---|---|
| Web landing `/` on Lighthouse mobile ("Slow 4G", mid-tier device) | LCP ≤ 3.0 s · INP ≤ 200 ms · CLS ≤ 0.1 · Performance score ≥ 70 · Accessibility score ≥ 95 | Lighthouse CI on the Cloudflare preview URL |
| Web app shell JS (gzip) | ≤ 600 KB initial; map, assistant and admin code **lazy-loaded** | Bundle report in CI |
| Android cold start → Home interactive | ≤ 3 s on a 2 GB RAM, Android 8–10 class phone | Manual timing, QA checklist |
| APK size | ≤ 45 MB (universal APK) | Build output |
| `requests.create` server time | p95 ≤ 1.5 s | Convex logs |
| Publish → first donor push sent | p95 ≤ 60 s (target ≤ 10 s) | `wave_sent` − `request_published` events |
| Real-time update visible on another device | ≤ 2 s (≤ 15 s on fallback polling) | Manual two-device test |
| Images | Slip ≤ 500 KB; illustrations ≤ 15 KB; share card ≤ 150 KB | Upload pipeline |
| Fonts | Only Noto Sans + Noto Sans Bengali, weights 400/600/700, subset where possible | Bundle report |

### 7.2 Accessibility (WCAG 2.2 Level AA)
Must pass, with evidence in the QA checklist:
1.1.1 text alternatives · 1.3.1 info & relationships (semantic headings, lists, form labels) · 1.3.4 orientation (portrait and landscape) · 1.4.3 contrast (§1.3.1) · 1.4.4 resize text 200 % · 1.4.10 reflow at 320 px wide · 1.4.11 non-text contrast (input borders `#8A94A6`) · 1.4.12 text spacing · 2.1.1 keyboard (web) · 2.4.3 focus order · 2.4.7 focus visible · 2.4.11 focus not obscured · 2.5.8 target size (we use ≥ 48 dp) · 3.1.1/3.1.2 language of page and parts (`lang="bn"` / `"en"`) · 3.3.1 error identification · 3.3.2 labels or instructions · 3.3.7 redundant entry (never ask the same detail twice in one flow — e.g. contact number pre-filled) · 3.3.8 accessible authentication (Google sign-in, no puzzles) · 4.1.2 name, role, value · 4.1.3 status messages (toasts, countdowns, offline banner announced).
**Automated:** `@axe-core/playwright` on `/`, `/welcome`, `/request/new`, `/request/[id]`, `/alerts/[id]`, `/donor/setup`, `/volunteer`, `/admin` — zero serious or critical violations.
**Manual:** TalkBack walkthrough of the judging loop on every APK release; keyboard-only walkthrough of the same loop on web.

### 7.3 Browser and device support
| Platform | Supported | Notes |
|---|---|---|
| Android app | Android 7.0+ (API 24, Expo SDK 57) | Tested on: one 2 GB phone (Android 8–10 class) + one current phone |
| Chrome / Edge (Android and desktop) | Last 2 major versions | Full features incl. web push and voice |
| Samsung Internet | Last 2 major versions | Voice may be unavailable → hidden |
| Firefox | Last 2 major versions | Voice unavailable → hidden |
| Safari iOS (installed web app) | iOS 16.4+ for push; iOS 15+ for everything else | Voice limited (parity table) |
| Safari macOS | Last 2 major versions | — |
| Screen widths | 320 px – 1920 px | Breakpoints: 768 px (tablet), 1024 px (desktop sidebar) |

### 7.4 Security
- All traffic HTTPS. Secrets only in Convex/Cloudflare/EAS environment variables; `.env.example` lists names (`CONVEX_DEPLOYMENT`, `EXPO_PUBLIC_CONVEX_URL`, `EXPO_PUBLIC_CONVEX_SITE_URL`, `BETTER_AUTH_SECRET`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GEMINI_API_KEY`, `TELEGRAM_BOT_TOKEN`, `TELEGRAM_WEBHOOK_SECRET`, `WHATSAPP_*`, `CLOUDINARY_*`, `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `SENTRY_DSN`, `EXPO_PUBLIC_SENTRY_DSN`).
- **Server-side authorisation on every function** (§6.0); an automated **access-control matrix test** calls every 📞 function and every admin/volunteer function as visitor, member, donor, volunteer, admin, practice account — each must match PRD §3.2/§3.3.
- Web response headers (`public/_headers`, served by Cloudflare — ADR-024): `Content-Security-Policy` (default-src 'self'; connect-src Convex, Cloudinary, OpenFreeMap, Sentry, Google OAuth; img-src self data: Cloudinary OpenFreeMap; frame-ancestors 'none'), `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy: geolocation=(self), microphone=(self), camera=(self)`.
- Webhooks: Telegram secret-token header; WhatsApp HMAC signature; both reject replays older than 10 min (message date).
- Sentry `beforeSend` scrubs phone patterns, names from forms and request free text; Convex `console.log` never prints phone numbers (lint rule + review).
- CSV exports escape formula injection (§SCR-A13). Uploaded images re-encoded on device; server checks MIME and size.
- `npm audit --omit=dev --audit-level=high` in CI; Dependabot on.
- Sessions: Better Auth default secure cookies/tokens; sign-out revokes the session and unregisters push tokens.

### 7.5 Privacy and data protection
Implements PRD §3.3 (visibility), §5.9 (retention), consent versioning (NFR-10), data download/delete (SCR-M07), and the Responsible-AI commitments (PRD §6.4). **Personal data never appears in:** events, audit `meta`, AI calls (after redaction), push notifications (§6.8), logs, Sentry, public pages, share cards.

### 7.6 Reliability
- Degradation order (PRD §7): AI → images → non-essential pages; the post → match → notify → accept → contact path depends only on Convex + push.
- Every scheduled job is idempotent (re-reads state); push sends retried by the Convex push component; web push failures counted and a subscription removed after 5 consecutive failures.
- Daily backup export (NFR-03); staging and production separated (NFR-01).

### 7.7 Testing requirements (NFR-02 — each build phase ships its tests)
| Area | Minimum |
|---|---|
| `convex/rules/*` | ≥ 90 % line coverage; table-driven tests for every row of PRD §5.1, §5.2, §5.8 |
| Intake parser + redaction | ≥ 40 fixture messages (≥ 15 English, ≥ 15 Bangla, ≥ 10 Banglish) with expected fields and expected removals; **zero phone numbers or labelled names may survive redaction** |
| Access control | Matrix test (§7.4) for every role × every sensitive function |
| Idempotency | `requests.create` and `responses.accept` called twice with the same `clientId` → one record |
| Scheduler flows (convex-test with fake timers) | Wave 1 ≤ 60 s; 30 s volunteer hotline; wave escalation; still-coming timeout → standby promotion; auto-close; confirmation prompt |
| Practice-area isolation | Practice request never notifies a real donor; real request never notifies a practice donor; stats exclude practice data |
| Web E2E (Playwright, staging) | Judging loop: post (form) → donor accepts → requester sees contact; axe checks (§7.2). Sign-in in E2E uses a **staging-only** email+password test provider (P-10) |
| Android | Manual QA checklist (§7.9) per APK; Maestro script optional |

### 7.8 Platform parity (final; NFR-05)
| Capability | Android app | Android Chrome | iPhone (installed web app) | Desktop browser |
|---|---|---|---|---|
| Push alerts | ✅ Expo Push | ✅ Web Push | ✅ iOS 16.4+ after Add to Home Screen; ❌ otherwise (inbox only) | ✅ Web Push |
| Voice input (Bangla) | ✅ if Google speech services present | ✅ | ⚠ limited — button hidden if unsupported | ✅ Chrome/Edge; ❌ Firefox |
| "Use my current location" | ✅ | ✅ | ✅ | ✅ |
| Pin map (if-time, `features.pinMap`, D-R2) | ✅ MapLibre native | ✅ maplibre-gl | ✅ | ✅ |
| In-person verification (SCR-V06) | ✅ | ✅ | ✅ | ✅ |
| Google sign-in | ✅ | ✅ | ✅ | ✅ |
| Telegram verification | ✅ | ✅ | ✅ | ✅ (opens Telegram Desktop/Web) |
| Share sheet | ✅ native | ✅ Web Share | ✅ Web Share | ⚠ Copy link fallback |
| Slip photo | ✅ camera/gallery | ✅ file/camera | ✅ | ✅ file |
| Install | APK (`/download`) | PWA install | Add to Home Screen | PWA install |
| App update | EAS Update (JS) + `minimumAppVersion` gate | Automatic | Automatic | Automatic |

### 7.9 QA checklist per build (NFR-06 — run by member 3, results posted in the PR)
1. Fresh install on the 2 GB test phone → welcome in Bangla (phone set to Bangla) → consent → sign in → onboarding → post a request **by voice** in Bangla. Two timings: first-timer end-to-end ≤ 2 min (US-X01); the request form itself — from tapping **Need blood** to **Post**, already signed in — ≤ 60 s (G4).
2. Second phone (donor) receives the push ≤ 60 s with the screen locked; lock-screen text has no names or numbers.
3. Donor accepts → requester sees contact + safety card; Call and WhatsApp buttons work.
4. Wait 30 s on a new request with no donor answering → volunteer contact appears (volunteer phone on duty).
5. Airplane mode during posting → "Waiting for network" → reconnect → request appears once.
6. TalkBack: complete steps 1 and 3 by voice-over only.
7. Switch language mid-flow — no English left on Bangla screens (and vice versa).
8. Text size at 200 % — no clipped buttons on Home, New request, Alert detail.
9. Admin dashboard shows the test request under "Practice" exclusion rules.
10. No console errors; Sentry shows no new error types.

---

## 8. Proposals that need team confirmation

These are design details not settled by earlier documents. SpecPilot proposes; approving this file approves them — change any you disagree with.

| ID | Proposal | Why |
|---|---|---|
| P-1 | Tab bar: **Home · Requests · Donate · (Volunteer) · (Admin) · More** | Need-blood stays one tap away; role tabs appear only for those roles |
| P-2 | Primary buttons use **`#C1121F`**; v0's `#E63946` stays for the logo only | `#E63946` with white text fails WCAG AA (4.17:1) |
| P-3 | v1 accepts **Bangladeshi mobile numbers only** (`+8801…`) | Verification, WhatsApp links and abuse checks are designed for BD numbers |
| P-4 | Units per request **1–10 bags** | Covers real requests; larger needs go through hospitals/volunteers |
| P-5 | "Now" means **within 2 hours**; "Tomorrow" defaults to **12:00 noon** unless a time is picked | Clear timer anchors for waves and auto-close |
| P-6 | Donors get an optional **Institution** field | Campus-by-campus recruitment stats for the 300–400-donor drive |
| P-7 | Other members see only a person's **first name** | Minimum personal data |
| P-8 | Date of birth editable only within **24 h** of onboarding; later changes via an admin | Prevents bypassing the 18+ gate |
| P-9 | Admins search people by **name or ID, never by phone number** | Stops the admin panel being used as a phone directory |
| P-10 | Email + password sign-in: in **staging** for automated tests; in **production** only for practice accounts while the practice area is on (D-R4) | Google sign-in can't be automated reliably in tests; judges need to try the live platform on their own phones |
| P-11 | **Light theme only** in v1 | Saves build time; dark mode later |
| P-12 | Duplicate "Join" and shared links open the **anonymised** request view (`/r/<slug>`) | Never exposes another family's details |
| P-13 | Push notifications never show **phone numbers, patient names or requester names** (a donor's first name may appear to the requester) | Lock screens are seen by others |

---

## 9. Change log

| Version | Date | Change |
|---|---|---|
| 1.3 | 2026-11-27 | Web address `udvasito.com` everywhere (ADR-023, Q-002); Android notification channels fixed as `blood-requests` (MAX, urgent templates NTF-01/02/07/08/16) + `updates` (default) — §6.8 aligned with §1.2.1 (Q-003) |
| 1.2 | 2026-11-23 | Step 8 decisions: §1.9 real-platform rule and the user-facing rename **demo area → practice area** (code names unchanged); D-R1 in-person verification (SCR-V06, VAL-26, 3 functions, `ERR_SELF_VERIFICATION`, schema, setting `inPersonVerificationsPerDay`, admin undo); D-R2 pin map behind `features.pinMap`; D-R3 helpline fetched on tap (`GET /public/helpline`, `support.helpline`, `useHelpline()`, removed from 404); D-R4 practice sign-in (SCR-O02, SCR-A09 rewritten — real phones and real numbers only, VAL-27, auth rules); D-R5 pilot consent version; `public.appConfig` (how the app reads public settings — was missing) |
| 1.1 | 2026-11-23 | Step 7 issue-check fixes (roadmap §7): `features` setting (51 setting rows) so if-time features ship switched off; `internal.admin.ops.*` CLI functions for operations before the admin screens exist; §1.2.1 app identity and build profiles (package name, runtime-version policy, EAS profiles, notification channel, permission list — needed before the first native build); one content folder `src/content/` (legal + learn pages had two different paths) and `CMP-Markdown` (how Markdown is shown on Android and web); `hospitals.aliases` + `searchText` with one `search_all` index (the intake parser and search need short names like "CMCH"); `internal.admin.bootstrap.bootstrapSuperAdmin` (how the first super-admin is created) |
| 1.0 | 2026-11-23 | **APPROVED.** Consistency fixes found in Step 7: `onboarding.phoneHelp` now says truthfully who sees the number (PRD §3.3); gate G3 also accepts a server consent row for the current version (no repeat consent on a new device); QA step 1 states both timings (first-timer ≤ 2 min end-to-end; request form ≤ 60 s) |
| 0.1 | 2026-11-23 | First full specification: 50 routes + 1 sheet with layouts, exact EN/BN copy and all states; 25 validation rules; Convex schema (27 tables) and 50 setting rows; ~80 functions, 8 HTTP endpoints, 12 scheduled jobs, 23 error codes, 18 notification templates; NFRs, platform parity, QA checklist; 13 proposals for confirmation |
