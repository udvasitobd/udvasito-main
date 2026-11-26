# CLAUDE.md — UDVASITO (উদ্ভাসিত)

You are the coding agent for **UDVASITO**, a free, bilingual (English / Bangla) blood-donor platform for Bangladesh, starting in Chattogram. One Expo codebase serves the Android app and the web app (`udvasito.com`); the backend is Convex. One human developer works with you; four team members handle content, recruitment, operations and the presentation.

Real people will use this to find blood in emergencies. Correctness, privacy and speed on the emergency path matter more than anything else.

---

## 1. The documents (in `docs/`) — read them, never contradict them

| File | What it decides | When you read it |
|---|---|---|
| `docs/build-prompts.md` | The prompt for the current phase | First, every session |
| `docs/roadmap.md` | **When**: phase order, scope in/out, Definitions of Done, live-data rules | The current phase section + §2 every session |
| `docs/specs.md` | **What exactly**: routes, screens, copy (EN/BN), validation, schema, functions, errors, jobs, NFRs | §1 fully once per session, then only the sections the phase prompt lists |
| `docs/PRD.md` | Product rules: who sees what (§3.3), matching and limits (§5), AI guardrails (§6) | Sections the phase prompt lists |
| `docs/ADRs.md` | **Which technology** and why | When choosing or configuring a library or service |
| `docs/vision.md`, `docs/user-stories.md`, `docs/grilling-notes.md` | Why; acceptance criteria; history of decisions | When a story's acceptance criteria are referenced |

- If `roadmap.md` and `specs.md` disagree about **what** to build, `specs.md` wins; about **when**, `roadmap.md` wins.
- `specs.md` is large. Do not load all of it into context at once — read §1, then the sections by heading.
- **If something you need is missing, ambiguous or contradictory: stop and ask.** Write the question in `docs/questions.md` (date, phase, question, options, your recommendation) and ask the developer. Never invent a product rule, a copy string, a limit or a data field.

---

## 2. Non-negotiable rules

**Money and vendors**
1. **৳0.** Free tiers only. Never add a paid service, a service that needs a card, or a new vendor that stores personal data. Never replace an accepted library without a new ADR approved by the team.

**Privacy and safety** (PRD §3.3, specs §6.0)
2. Phone numbers are returned **only** by functions marked 📞 in specs §6, through `convex/_lib/visibility.ts`, and every reveal writes `contactReveals` + `auditLog`.
3. **No phone number** in logs, events, Sentry, push-notification text, analytics or AI input. The Sentry `beforeSend` scrubber stays on.
4. **Redaction before every AI call** (`convex/rules/redaction.ts`). AI output is always a suggestion a person confirms. AI being down never blocks a flow.
5. 18+ only. Health data is sensitive (Bangladesh PDPO 2025): collect only what specs lists.
6. **Practice-area isolation:** every row that can be practice data carries `isDemo`; real and practice data never meet (`ERR_DEMO_ISOLATION`). Code name `demo`, user-facing name **Practice area**.

**Real platform, never a mock-up** (specs §1.9, vision principle 10)
7. Production holds only real data. No sample records, placeholder donors, fake phone numbers or invented numbers — ever.
8. Every visible control works. No "coming soon", placeholder screens, lorem ipsum or dead links. An unfinished feature is **invisible** (its `settings.features` switch is off) — never half-working.

**Product logic**
9. Every rule number (waves, timers, limits, intervals, ages) comes from the `settings` table (specs §5.2). Never type them into logic.
10. Matching, eligibility, compatibility, ranking, waves, limits and redaction live in `convex/rules/*` as **pure TypeScript** with no Convex imports, 100 % unit-tested.
11. Every public Convex function starts with an auth wrapper from `convex/_lib/auth.ts` and has at least one access test.
12. Every query uses an index. No full-table `.filter()` scans (the free plan depends on it).

**Text and accessibility**
13. Every user-facing string comes from `src/i18n/en.json` / `bn.json` via `t('key')`, using the **exact** English and Bangla copy from specs. No string literals in components (lint rule `i18next/no-literal-string`).
14. WCAG 2.2 AA on web; touch targets ≥ 48 dp; never colour alone; labels on every control; text scales to 200 %.

**Data in production** (roadmap §2.6)
15. From 2026-11-28, schema changes are **additive only** (optional field → backfill in batches → required). Never rename or delete a field holding live data in one deploy.
16. Never edit live rows by hand in the Convex dashboard; use `internal.admin.ops.*` (audit-logged).
17. Only `seed-places`, `seed-settings` and `import-hospitals` may run against production.

**Secrets**
18. Secrets live only in Convex, Vercel and EAS environment variables. Never commit `.env.local`, keys, tokens, `google-services.json` or PINs. `.env.example` lists names only. The repository is **public**.

---

## 3. How to work in every session

1. Read this file, then the phase section of `docs/build-prompts.md`, then `docs/roadmap.md` §2 and the phase in §3.
2. **Write a short plan first** — files, functions, tests, human steps, open questions — and wait for the developer's OK.
3. Build in **vertical slices**: Convex function + tests → screen → EN/BN strings → wire-up. Write the test before or with the code.
4. After each slice: `npm run check` must pass, then commit with `P<n>: <what>` (e.g. `P1: requests.create with idempotency + tests`).
5. Push to `staging` when a group of slices is done. Production deploys only from `main`, after the phase's Definition of Done.
6. Tell the developer **exactly** when a human step is needed (create an account, paste an env value, run `eas build`, test on a phone) — one numbered list, copy-pasteable commands.
7. At the end of the session, report in this format:
   - **Done** (slices, with commit hashes)
   - **Definition of Done** checklist for the phase, each item ✅ / ❌ with evidence (test name, screenshot request, command output)
   - **Human steps waiting**
   - **Open questions** (also in `docs/questions.md`)
   - **Next session starts with** …
8. Update the phase status in `docs/roadmap.md` §3 (⬜ → 🟦 → ✅ with date) and add a line to `CHANGELOG.md`.

**Stop and ask** before you: add a dependency not named in ADRs/specs; change the schema of a table that has production data; change any rule number, copy string or visibility rule; skip a test; touch the practice-area isolation; deploy to production; spend a native build (EAS quota: 15 a month, budget in roadmap §2.4).

---

## 4. Commands (contract — created in phase P0)

| Command | Does |
|---|---|
| `npm run dev` | Expo dev server (web + dev client) |
| `npm run convex` | `npx convex dev` against the developer's dev deployment of the `udvasito-staging` project |
| `npm run check` | Type check + ESLint (incl. i18n lint) + Vitest (rules + convex-test) |
| `npm test` | Vitest only |
| `npm run test:e2e` | Playwright web smoke test (practice area) |
| `npm run copy:extract` | Regenerate `en.json` / `bn.json` keys from the copy tables in `docs/specs.md` (never overwrites reviewed Bangla) |
| `npm run content:build` | `src/content/*.md` → `src/content/generated/*.json` |
| `npm run seed:places` · `npm run seed:settings` · `npm run import:hospitals` | Idempotent reference-data loaders (`-- --prod` for production) |
| `npm run seed:staging` | Fake data for **staging only** — refuses to run against production |
| `npm run build:web` | Static web export for Vercel |

Scripts must work on **Windows, macOS and Linux** (use `tsx` and Node APIs; no bash-only syntax).

---

## 5. Stack at a glance (details: `docs/ADRs.md`)
Expo SDK 57 · Expo Router · TypeScript strict · React Native Web · NativeWind v4 + React Native Reusables · Noto Sans + Noto Sans Bengali · Convex (EU) with scheduler, crons, `@convex-dev/expo-push-notifications`, `@convex-dev/rate-limiter`, Better Auth component (Google; practice sign-in in production; password sign-in in staging) · Telegram bot + in-person phone verification · Expo Push (Android) + Web Push (VAPID) · Gemini Flash-Lite free tier from Convex actions · `expo-speech-recognition` · `expo-location` · Cloudinary (share cards) · Convex storage (slip photos) · Sentry · Vitest + convex-test + Playwright · GitHub Actions · Vercel Hobby · EAS Build / Update · Android package `org.udvasito.app`.

## 6. Branches and environments
`main` → production (`udvasito-prod`, `udvasito.com`, EAS channel `production`). `staging` → staging (`udvasito-staging`, Vercel staging, channel `preview`). Feature branches → Vercel previews against staging.
