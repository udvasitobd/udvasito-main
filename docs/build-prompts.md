# build-prompts.md — UDVASITO (উদ্ভাসিত) Claude Code Build Prompts

> **Status:** ✅ APPROVED v1.0 (2026-11-23) — Step 8 of 8 (SpecPilot). All eight documents are approved; building starts with P0.
> **Last updated:** 2026-11-23 (Day 0)
> **Depends on:** `vision.md` v1.4, `user-stories.md` v1.3, `grilling-notes.md` v1.1, `PRD.md` v1.3, `ADRs.md` v1.2, `specs.md` v1.2, `roadmap.md` v1.1 (all APPROVED), and `CLAUDE.md` in the repository root.
> **What this is:** one self-contained prompt per build phase (P0–P7). Each prompt tells Claude Code what to read, what to build, what not to build, which tests to write, which human steps to ask for, and how to prove the phase is done. The prompts point to sections of the other documents instead of copying them, so a fix in one document reaches every later prompt.

## Contents
0. How to use these prompts (for the developer)
1. P0 — Setup and foundations (Day 0–2)
2. P1 — Walking skeleton → pilot live (Day 3–5)
3. P2 — Matching engine and request lifecycle (Day 6–7)
4. P3 — Volunteers, a human within 30 seconds, data rights (Day 8–9)
5. P4 — AI intake, voice, web push, offline (Day 10–11)
6. P5 — Admin panel and practice area (Day 12–13)
7. P6 — Public pages, hardening, core complete (Day 14–15)
8. P7 — Should features, all working (Day 16–20)
9. Utility prompts (resume, bug fix, hotfix, review)
10. Change log

---

## 0. How to use these prompts (for the developer)

### 0.1 Folder set-up (once, Day 0)
```
udvasito/                 ← empty folder; this becomes the GitHub repository
  CLAUDE.md               ← from this step
  docs/
    vision.md  user-stories.md  grilling-notes.md  PRD.md  ADRs.md  specs.md  roadmap.md  build-prompts.md
```
Open the folder in a terminal, run `claude`, and paste the **kickoff line** of the phase.

### 0.2 Kickoff lines (paste one per session)
| Phase | Paste into Claude Code |
|---|---|
| P0 | `Read CLAUDE.md, then carry out phase P0 from docs/build-prompts.md. Start with the plan.` |
| P1 | `Read CLAUDE.md, then carry out phase P1 from docs/build-prompts.md. Start with the plan.` |
| P2 … P7 | Same line with the phase number |
| Resume | `Read CLAUDE.md, then resume phase P<n> from docs/build-prompts.md: check git log and the roadmap status, tell me what is left, then continue.` |

### 0.3 Rhythm
- **One phase can take several sessions.** Start a fresh session when the context gets long or a usage limit resets; use the Resume line.
- **Approve the plan** before code is written. Correct it if it adds anything the phase lists as out of scope.
- When Claude Code lists **human steps**, do them in order and paste back any output it asks for (never paste secrets into chat if it asks you to put them in an env var instead — put them in the env var).
- At the end of each phase, member 3 runs the QA items and you merge `staging` → `main` only when the Definition of Done is all ✅.

### 0.4 What the agent must never do without asking (repeat of `CLAUDE.md` §3)
Add a dependency not named in ADRs/specs · change a table with production data · change a rule number, copy string or visibility rule · skip a test · weaken practice-area isolation · deploy to production · start a native build.

---

## 1. P0 — Setup and foundations

**Kickoff:** `Read CLAUDE.md, then carry out phase P0 from docs/build-prompts.md. Start with the plan.`

```text
PHASE P0 — SETUP AND FOUNDATIONS · Day 0–2 (Mon 23 – Wed 25 Nov 2026)

You are starting the UDVASITO repository from an almost empty folder (only CLAUDE.md and docs/).
Goal: a real but empty app — Google sign-in works on the Android development build and on the
web, an empty Home shows in English and Bangla, and staging + production deploy automatically.
Everything that is expensive to change later is settled in this phase.

READ FIRST
- CLAUDE.md (all)
- docs/roadmap.md §1, §2 (all), §3 "P0", §5.1–§5.2, §5.7, §6 (runbooks)
- docs/specs.md §1 (all, including §1.2.1 app identity and §1.9 real-platform rule),
  §5.1 schema, §5.2 settings, §6.0 conventions, §6.6 rows for bootstrap and ops,
  §6.7 error codes, §7.4 security, §7.7 testing
- docs/ADRs.md §0 stack, ADR-001, 002, 003, 005, 007, 008, 016, 018, 019, 020, 022, §5 accounts
- For library set-up, read the CURRENT official guides (Expo SDK 57, Convex + Better Auth Expo
  guide, NativeWind v4, React Native Reusables) and pin the exact versions they name.

PRE-FLIGHT (ask the developer to confirm before you write code)
1. Runbooks RB-1 to RB-9 (roadmap §6) are done or in progress; list which env values you will
   need and where each goes (Convex / Cloudflare / EAS). Never ask for secrets in chat.
2. Node LTS, git and the Expo CLI are installed; `npx eas login` and `npx convex login` done.
3. The developer's operating system (scripts must be cross-platform anyway).

BUILD, IN THIS ORDER (each item = one or more commits "P0: …")
1. Scaffold Expo SDK 57 + Expo Router + TypeScript strict + React Native Web in a temporary
   folder, then move it into the repo root keeping CLAUDE.md and docs/. Apply the folder
   contract (specs §1.2) exactly, with empty modules where later phases will add code.
2. app.config.ts per specs §1.2.1: package org.udvasito.app, name UDVASITO, scheme udvasito,
   runtimeVersion fingerprint policy, EAS profiles development / preview / production with
   their channels and EXPO_PUBLIC_* env per profile, permission list exactly as specified,
   notification channel "blood-requests". Icons from assets/ (placeholders allowed until DEP-11).
3. Install and configure EVERY native module now (roadmap P0 list): expo-notifications (FCM),
   expo-speech-recognition, expo-location, expo-image-picker, expo-image-manipulator,
   expo-secure-store, expo-updates, @sentry/react-native. NOT MapLibre (D-R2).
4. Design system (specs §1.3): theme/tokens.ts with every token, NativeWind config, fonts
   Noto Sans + Noto Sans Bengali, components CMP-Button, CMP-Skeleton, CMP-ErrorState,
   CMP-OfflineBanner, CMP-LanguageToggle, CMP-Sheet/CMP-Dialog, CMP-Toast, CMP-Markdown,
   CMP-PracticeBadge — accessible (specs §1.7, §7.2).
5. i18n (specs §1.6): scripts/extract-copy.ts parses EVERY copy table and inline copy in
   docs/specs.md (keys with English and Bangla) into src/i18n/en.json and bn.json; it reports
   duplicates and keys missing one language, and never overwrites a Bangla value already
   marked reviewed. i18next set-up with the language rules of F-104; lint rule
   i18next/no-literal-string on.
6. Convex: projects udvasito-staging and udvasito-prod (EU). convex/schema.ts with ALL 27
   tables, fields, indexes and isDemo fields from specs §5.1 — complete now. convex.config.ts
   with betterAuth, pushNotifications, rateLimiter components. convex/_lib: auth.ts wrappers
   (memberQuery, donorMutation, volunteerMutation, adminMutation, superadminMutation …),
   errors.ts (every ERR_ code from specs §6.7, typed), settings.ts (typed reader with the
   51 rows of specs §5.2 and their ranges), audit.ts, events.ts, visibility.ts (PRD §3.3).
   scripts: seed-settings.ts (idempotent). convex/rules/*: typed stubs + Vitest set-up.
7. Sign-in: Better Auth + Convex component + Google for web and the Android dev build,
   following the official guide exactly. Staging-only email + password provider (P-10) for
   automated tests. profiles.me. internal.admin.bootstrap.bootstrapSuperAdmin (specs §6.6).
   internal.admin.ops.setStatus / setRole / setDemo / closeRequest (audit-logged).
8. public.appConfig query (specs §6.1). Root app/_layout.tsx with providers and gates G1–G7
   as a skeleton (specs §1.5): G1 from appConfig, G3 local record + server consent row.
9. Reference data: scripts/seed-places.ts — choose ONE dataset from ADR-013's candidates,
   check its licence, record it in docs/data-licences.md, load divisions → districts →
   upazilas + all Chattogram metropolitan thanas with EN/BN names and centres, compute
   neighbourIds (centres within settings.neighbourKm), and write src/data/places.min.json.
   scripts/import-hospitals.ts reading data/hospitals.csv (roadmap §5.1): validation report,
   writes aliases + searchText, idempotent. scripts/seed-staging.ts (fake data, refuses to
   run against production). scripts/build-content.ts (Markdown → JSON for CMP-Markdown).
10. Home placeholder rule: the empty Home shows ONLY working things (language toggle, sign
    out). No buttons for features that do not exist yet (specs §1.9).
11. CI: GitHub Actions on every push — install, tsc, eslint, i18n lint, vitest + convex-test.
    A manual workflow "Android local build" that runs `eas build --local` on Ubuntu and
    uploads the APK as an artifact (roadmap §2.4 fallback).
12. Web: Cloudflare Workers build per roadmap RB-3 (ADR-024), SPA rewrites, security headers from specs §7.4,
    staging branch → staging Convex, main → production.
13. Sentry for web and native with a beforeSend scrubber removing phone-number patterns
    (Bangla and Latin digits, +880 / 01 forms) — unit-tested.
14. npm scripts exactly as CLAUDE.md §4. README.md: what the project is, how to run it,
    MIT licence, link to docs/.

SPIKES (1 hour each, write results to docs/spikes.md — roadmap P0 table S1–S4)
S1 Bangla speech recognition on 3 phones + Chrome. S2 locked-screen push on a Xiaomi/Redmi.
S3 Better Auth callback through udvasito.com (Cloudflare Worker pass-through). S4 Gemini free-tier
call from a Convex action (EU) returning JSON with the current Flash-Lite model ID → put the
working ID in settings.ai.models.

TESTS TO WRITE IN THIS PHASE
- settings reader: every key present, defaults valid, out-of-range values rejected
- seed-places: counts (64 districts, all upazilas, Chattogram metropolitan thanas present),
  every row has EN + BN names and coordinates inside Bangladesh, neighbours symmetric
- import-hospitals: bad rows reported (unknown upazila, coordinates outside Bangladesh,
  personal-looking phone number in bloodBankPhone), re-import creates no duplicates
- Sentry scrubber removes phone numbers in both digit systems
- auth wrappers: unauthenticated → ERR_UNAUTHENTICATED; wrong role → ERR_FORBIDDEN
- extract-copy: every key in specs has EN and BN

OUT OF SCOPE IN P0
Any feature screen beyond sign-in and the empty Home. No sample data in production.

HUMAN STEPS TO ASK FOR (tell the developer when)
- Env values into Convex/Cloudflare/EAS (names from specs §7.4 and .env.example)
- `npx eas build --profile development --platform android` (build #1) once native config is
  final; install the dev build on the test phones
- Run bootstrapSuperAdmin on staging and production after signing in once
- Check and write the EAS quota reset date in roadmap §2.4

DEFINITION OF DONE (report each item ✅/❌ with evidence)
[ ] Google sign-in works on the Android dev build and in Chrome, on staging AND production;
    a profiles row is created
[ ] Language switch changes every visible string; Bangla renders correctly on the 2 GB phone
[ ] seed-places + seed-settings loaded on staging and production; hospitals importer ready
[ ] A test push from the Convex dashboard reaches the dev build with the screen locked
[ ] Lighthouse (throttled mobile): first screen ≤ 3 s on staging and production
[ ] CI green on main and staging; manual Android local-build workflow runs once
[ ] Spikes S1–S4 answered in docs/spikes.md
[ ] Nothing on screen that does not work (specs §1.9)

STOP AND ASK IF
The Better Auth Expo guide conflicts with ADR-003 · a native module fails to build with
SDK 57 · no places dataset meets the licence and Chattogram-thana requirements · any
account would need a card.

FINAL REPORT: use the format in CLAUDE.md §3.7. Mark P0 in roadmap §3.
```

---

## 2. P1 — Walking skeleton → pilot live

**Kickoff:** `Read CLAUDE.md, then carry out phase P1 from docs/build-prompts.md. Start with the plan.`

```text
PHASE P1 — WALKING SKELETON · Day 3–5 (Thu 26 – Sat 28 Nov 2026) · GO-LIVE Sat 28 Nov by 14:00

Goal: the whole loop, thin but real, safe and logged. A real person consents, signs in,
becomes a donor and verifies by Telegram or in person; a requester posts a form request;
matching donors get a push within 60 s, accept, and both sides see each other's numbers
with the safety card; the requester closes the request. If no donor accepts within 30 s,
the requester sees the helpline. Real donors start signing up at the first campus drive.

READ FIRST
- CLAUDE.md; docs/roadmap.md §1.1, §2, §3 "P1" (scope table, day plan, DoD, go-live steps)
- docs/specs.md §1 (again, briefly), §2 (rows of the screens below),
  §3.0 common copy; §3.1 SCR-O01–O06; §3.2 SCR-M01, SCR-M02 (form path only), SCR-M03,
  SCR-M04 (list only); §3.3 SCR-D01, SCR-D02, SCR-D03, SCR-D04; §3.5 SCR-V06;
  §3.6 SCR-M06/M10 shells as listed; §3.7 SCR-P06, SCR-P07, SCR-P08, SCR-P09;
  §4 VAL rules used by these screens; §6.1; §6.2 (create, getForOwner, listMine, close);
  §6.3 (donors.*, responses.inbox/getForDonor/markOpened/accept/decline);
  §6.4 (push.*, notifications.markOpened, support.helpline); §6.5 (/telegram/webhook,
  /public/helpline); §6.6 (startRequest, runWave, volunteerHotline as helpline fallback);
  §6.8 templates NTF used here; §6.10 eligibility, compatibility, ranking (simple), limits
- docs/PRD.md §3.3, §5.1, §5.2, §5.5, §5.8, §6.2 (not used yet, but redaction must exist
  before any AI in P4)

BUILD, IN THIS ORDER (vertical slices; commit each)
Day 3
1. Consent screen SCR-O01 + privacy/terms pages SCR-P06/P07 from src/content/legal (draft,
   version 2026-11-28-pilot) rendered by CMP-Markdown; consents.accept; gate G3.
2. Sign-in SCR-O02 with Google, the helpline button through useHelpline() (D-R3; number never
   in HTML/bundle), practice sign-in link hidden (practice area comes in P5).
3. Onboarding SCR-O03 with the 18+ gate and campaign code capture from ?c=.
4. Phone verification SCR-O04: Telegram (POST /telegram/webhook, mismatch and expiry paths)
   AND "In person" (startInPerson / lookupInPerson / confirmInPerson) + SCR-V06 for admins.
5. Shells: SCR-M01 Home (role-aware, only working entry points), SCR-M10 More, SCR-M06
   Settings (language, sign out), SCR-O05, SCR-O06, SCR-P08 download page, SCR-P09 404.
Day 4
6. convex/rules/eligibility.ts + compatibility.ts (exact group) + limits.ts — full unit tests.
7. Donor setup SCR-D02 (4 steps, platelet opt-in, call mode, health-data consent) and donor
   tab SCR-D01; donors.upsert / getMine; live only with a verified phone.
8. Request form SCR-M02 FORM PATH ONLY: blood group, component + dengue quick option, units,
   CMP-PlacePicker (search with aliases + "use my location" nearest + "not in the list"; NO
   map pin), needed-by, contact; requests.create with clientId idempotency and limits.
9. Matching v1: internal.matching.startRequest + runWave(1): eligible donors, exact group,
   same district, simple distance ranking, isDemo isolation; Expo push NTF-01 (no names or
   numbers in the text, P-13); responses rows; events.
10. Inbox SCR-D03 + notifications.markOpened.
Day 5 (morning)
11. Alert detail SCR-D04: accept (self-check, call mode) / decline (reason; "donated
    recently" updates last donation); server confirms the first units+1, rest standby.
12. Contact exchange: mutual reveal through visibility.ts, contactReveals + audit, safety
    card, Call / WhatsApp buttons, "I'll call them" mode, directions link.
13. Request status SCR-M03 (counts, contacts, status, 15 s fallback refresh) + close
    (fulfilled / no longer needed → NTF to un-answered donors) + my requests list SCR-M04.
14. 30-second path: volunteerHotline at S-13 shows the helpline (no volunteers exist yet);
    immediate "no donors yet" message when zero eligible.
15. Rate limits: sign-ups (S-25), posting, open-request limits (S-22).

TESTS TO WRITE FIRST
- eligibility: ages 17/18/65/66, intervals 90/120/14 days, platelet rules, never-donated
- compatibility (exact only in P1), limits (unverified 1 / verified 2 open, monthly cap)
- requests.create twice with the same clientId → one request
- 5 donors accept a 1-bag request concurrently → exactly 2 confirmed, 3 standby
- visibility: donor phone hidden from everyone not entitled (PRD §3.3); hidden from the
  requester in call mode; every reveal writes contactReveals + audit
- practice/real isolation: a practice request never notifies a real donor and vice versa
- under-18 date of birth → underage_blocked; consent row stored server-side
- in-person: own code → ERR_SELF_VERIFICATION; lookup never returns the full number;
  daily limit enforced; audit written
- helpline number absent from the web build output (grep test)

OUT OF SCOPE IN P1
Waves 2–3, compatible groups, still-coming checks, "donor not responding", auto-close,
confirmation prompts, cooldown from confirmation, availability pause, report & block,
volunteers, AI, voice, web push, offline outbox, admin screens, landing page, practice
sign-in. Hide every entry point to these.

HUMAN STEPS TO ASK FOR
- DEP-01 data/hospitals.csv (Day 3) → run import on staging, then production
- DEP-02 legal drafts in src/content/legal (Day 4); DEP-11 final icon (Day 4)
- Production Telegram bot webhook (RB-5)
- Build #3: `npx eas build --profile production --platform android` → GitHub Release v0.1.0
  (RB-11) → apkUrl, apkSha256, latestAppVersion, minimumAppVersion in settings
- Go-live steps 1–7 in roadmap P1 (merge to main, settings, seeds, smoke test with two
  accounts flagged as practice accounts via internal.admin.ops.setDemo, first drive)
- `internal.admin.ops.setRole` to make member 4 an admin for in-person verification

DEFINITION OF DONE (each ✅/❌ with evidence)
[ ] 3-phone run on staging: post → push ≤ 60 s on a locked phone → accept → both see numbers
    + safety card → close → other donors told it's no longer needed
[ ] All tests above pass in CI
[ ] Telegram success / mismatch / expired, and in-person verification, work on real phones
[ ] Every reveal has contactReveals + audit rows
[ ] No entry point to an unbuilt feature anywhere (specs §1.9)
[ ] Production live, APK v0.1.0 downloadable from /download, first drive can sign people up

STOP AND ASK IF
A visibility rule seems to block the loop · the hospitals CSV has unknown places · push does
not arrive on a locked phone · anything would put a fake record into production.

FINAL REPORT: CLAUDE.md §3.7 format. Mark P1 in roadmap §3. Remind the team: requests are
not promoted until M2.
```

---

## 3. P2 — Matching engine and request lifecycle

**Kickoff:** `Read CLAUDE.md, then carry out phase P2 from docs/build-prompts.md. Start with the plan.`

```text
PHASE P2 — MATCHING ENGINE AND REQUEST LIFECYCLE · Day 6–7 (Sun 29 – Mon 30 Nov 2026)

Production has real users now: additive schema changes only (roadmap §2.6).
Goal: the rules are complete — the right donors, in the right order, in waves — and every
"what if nobody comes" path is automatic. Report & block exist before requests are promoted.

READ FIRST
- CLAUDE.md; docs/roadmap.md §2.6, §3 "P2"
- docs/PRD.md §5.1–§5.9 (all business rules), §3.3
- docs/specs.md §3.2 SCR-M03 (full), SCR-M09; §3.3 SCR-D01 (availability, eligible-again),
  SCR-D04 (still coming, withdraw); §3.4 SCR-C01; §1.5 G6; §6.2 (update, close, reopen,
  markDonorNotResponding); §6.3 (setAvailability, answerStillComing, withdraw, recordOutcome);
  §6.4 (reports.create, blocks.create); §6.6 (runWave, escalate, stillComingCheck,
  stillComingTimeout, autoClose, confirmationPrompt, hourly cron); §6.8 NTF templates;
  §6.10 ranking.ts, waves.ts, compatibility.ts (final-wave groups); §5.2 settings S-08–S-24,
  S-32, S-34, S-37

BUILD, IN THIS ORDER
1. rules/ranking.ts full (PRD §5.3): thana tiers, neighbours, travel range, availability
   freshness, "verified requests only", alert cap S-20 and quiet hours S-21 enforced by
   default — unit tests first.
2. rules/waves.ts + runWave 2–3: sizes S-08 minus opened-but-unanswered, intervals by
   urgency S-09, compatible groups ONLY in the final wave with the label (OQ-03), "Any group"
   and "Not sure" routing; platelet requests only to platelet-opt-in donors, exact group,
   14-day rule (F-204).
3. internal.matching.escalate → admins now (volunteers join in P3 automatically).
4. Still coming? (S-15/S-16) + timeout → promote first standby; withdraw → promote at once
   or run the next wave; "Donor not responding" on SCR-M03.
5. Lifecycle: requests.update / need more units / reopen (S-34); autoClose (S-17);
   "no longer needed" notifications.
6. Donation confirmation: confirmationPrompt (S-19) + reminder, SCR-M09, recordOutcome;
   cooldown set ONLY by the donor's own confirmation; "eligible again on" on the donor tab.
7. Availability: pause 1 week / 1 month / until date / not available; hourly cron resumes.
8. Report & block SCR-C01, reports.create, blocks.create, automatic freezes (PRD §5.8),
   gate G6 + SCR-O06 states; remaining limits S-23, S-24, S-37.

TESTS TO WRITE FIRST (convex-test with fake timers)
- wave 1 → 2 → 3 at the right minute for now / today / later
- next wave shrinks by opened-but-unanswered
- final wave adds compatible groups, labelled; never for platelets
- alert cap and quiet hours respected (urgent override only if opted in)
- still-coming timeout promotes standby; original donor stays confirmed
- withdraw promotes standby immediately; no standby → next wave now
- auto-close at needed-by + S-17; reopen within S-34
- cooldown starts only from the donor's confirmation (requester report alone doesn't)
- "asked for money" report freezes the account at once; frozen user can view but not post
- no-show penalty after S-37 count

OUT OF SCOPE IN P2
Volunteer features (the 30-second path still shows the helpline), AI, admin screens.

HUMAN STEPS
3-phone staging run of the full lifecycle; member 5 announces request posting after M2.

DEFINITION OF DONE
[ ] All tests above pass; manual 3-phone lifecycle run on staging passes
[ ] Production deployed with additive schema changes only
[ ] Report & block works on a real phone; freeze visible on SCR-O06
[ ] No entry point to an unbuilt feature

STOP AND ASK IF
A rule in PRD §5 seems to conflict with another · a schema change would not be additive.

FINAL REPORT: CLAUDE.md §3.7. Mark P2 (M2 "Rules complete").
```

---

## 4. P3 — Volunteers, a human within 30 seconds, data rights

**Kickoff:** `Read CLAUDE.md, then carry out phase P3 from docs/build-prompts.md. Start with the plan.`

```text
PHASE P3 — VOLUNTEERS, A HUMAN WITHIN 30 SECONDS, DATA RIGHTS · Day 8–9 (Tue 1 – Wed 2 Dec 2026)

Goal: when no donor answers within 30 s, a real on-duty volunteer's number appears;
volunteers work one shared board and ask donors without seeing donor numbers; admins approve
volunteers and manage roles; every person can see and control their own data.

READ FIRST
- CLAUDE.md; docs/roadmap.md §3 "P3"
- docs/PRD.md §3.2, §3.3 (volunteer columns), §5.4, §5.9
- docs/specs.md §3.5 SCR-V01, V02, V03 (+ V06 now open to volunteers); §3.6 SCR-A04, SCR-A05;
  §3.2 SCR-M07 (my data); §6.4 volunteers.*, admin.people.* (incl. revealPhone,
  revokeVerification); §6.1 profiles.whoHasMyNumber, exportMyData, requestDeletion,
  cancelDeletion; §6.6 volunteerHotline (full), escalate (volunteers), daily retention cron
  (deletions); §6.8 NTF-03, NTF-05, NTF-06, NTF-07; §6.9 audit actions

BUILD, IN THIS ORDER
1. Volunteer application SCR-V01 (verified phone required, consent to number display).
2. Admin people SCR-A04 (search by name/ID — never by phone, P-9; applications queue) and
   person detail SCR-A05 (set role, set status, reveal number with typed reason + S-24 flag,
   undo phone verification). Cannot remove the last admin.
3. Duty card on SCR-V02 + areas; NTF-03 to on-duty volunteers of the area at publish.
4. volunteerHotline at S-13: ≤ S-14 on-duty volunteers, least-recently-shown first, then
   fewest active claims; requester sees name + Call; contactReveals (volunteer_hotline);
   none on duty → helpline (already built).
5. Request board SCR-V02 + claim/unclaim; volunteer request view SCR-V03 with openCase
   (requester number, logged once per request).
6. Escalation now reaches on-duty volunteers of the district + admins.
7. Donor search + "Ask this donor" (no numbers in results) + opt-in reveal with reason.
8. My data SCR-M07: who has my number, download my data (own data only, 24 h link), delete
   account (type DELETE / মুছুন, 30-day pending, cancel) + retention cron deletion part.
9. Automatic flags → moderationItems (request-farming, money words, reveal volume); the
   queue screen comes in P5.

TESTS TO WRITE FIRST
- volunteer gets the requester number only via openCase or hotline; logged once
- volunteer never receives a donor number except opt-in donors with a reason
- hotline rotation order; escalation fires once
- admin search by phone is impossible; last-admin protection
- deletion anonymises exactly as PRD §5.9; export contains only the caller's data
- SCR-V06 available to approved volunteers, not to members

OUT OF SCOPE IN P3
Moderation queue screen, dashboard, AI, practice-area screens.

HUMAN STEPS
Roster from DEP-04 applies in the app; member 4 approves; duty rota set. QA step 4
(30-second volunteer) on real phones.

DEFINITION OF DONE
[ ] Tests pass; QA step 4 passes on phones (volunteer number at 30 s, Call rings)
[ ] ≥ 10 volunteers approved in production with duty hours
[ ] My-data screen: export downloads, deletion pending + cancel work
[ ] No entry point to an unbuilt feature

STOP AND ASK IF
A visibility case is not covered by PRD §3.3.

FINAL REPORT: CLAUDE.md §3.7. Mark P3 (M3 "A human within 30 seconds").
```

---

## 5. P4 — AI intake, voice, web push, offline

**Kickoff:** `Read CLAUDE.md, then carry out phase P4 from docs/build-prompts.md. Start with the plan.`

```text
PHASE P4 — AI INTAKE, VOICE, WEB PUSH, OFFLINE · Day 10–11 (Thu 3 – Fri 4 Dec 2026)

Goal: people can speak, type freely or paste a Facebook/WhatsApp post and get a filled form
to confirm; alerts reach web users; the app survives bad networks; Bangla is polished.
AI never blocks a flow and never sees a phone number, a name or an email.

READ FIRST
- CLAUDE.md; docs/roadmap.md §3 "P4", §5.6 (intake test set format)
- docs/PRD.md §6 (all — AI table, redaction rules, quota plan, commitments)
- docs/ADRs.md ADR-008, ADR-010, ADR-011, ADR-016
- docs/specs.md §3.2 SCR-M02 Part A + AI states; §3.3 SCR-D07; §6.2 intake.parse;
  §6.4 push.registerWebSubscription, push.sendTest; §6.10 redaction.ts, intakeParser.ts and the AI prompt texts at the end of §6.10; §5.2 ai.* and S-29 settings; §7.1 performance budgets

BUILD, IN THIS ORDER
1. rules/redaction.ts: Bangla + Latin digits, +880 / 01 forms, emails, ID numbers, names
   after cue words (patient, রোগী, নাম …), diagnosis words — tests first (100 % coverage).
2. rules/intakeParser.ts (rules first): blood-group spellings, units, time words, dengue words,
   hospital names + aliases from the hospitals table (refData) — golden tests from DEP-09.
3. ai/gemini.ts (Node action) + ai/quota.ts + ai/prompts.ts: JSON output, model ID from
   settings.ai.models, aiQuota guard, ≤ S-29 calls per request, aiCalls log (redacted input +
   output, retention S-36), automatic fallback on quota/error/off. Contact number by regex,
   never by AI.
4. SCR-M02 Part A: Write/paste box + "Fill the form for me" → AI-suggested chips (editable,
   labelled) → person confirms → Post. States: aiFilled, aiMissing, aiUnavailable.
5. Voice: expo-speech-recognition (bn-BD, en) + browser Speech API; editable transcript
   into the same box; voiceUnavailable state. UDVASITO never receives audio.
6. Web push: VAPID, public/service-worker.js, registerWebSubscription, Node sender; iPhone
   Home Screen note (iOS 16.4+).
7. Alert guide SCR-D07 with DEP-08 brand steps + push.sendTest (3/hour); Home banner
   donor.alertsOff when checks fail.
8. Offline outbox (src/lib/outbox.ts): persisted queue, "Waiting for network", dedupe by
   clientId; cached last data with "Last updated"; 15 s polling fallback.
9. Bangla polish with member 3: walk every screen in Bangla; Bangla digits and dates.

TESTS TO WRITE FIRST
- redaction: 500 generated messages with planted numbers/names/emails → zero reach the AI
  payload (test captures the exact payload)
- intake eval on tests/fixtures/intake.jsonl: ≥ 85 % fields correct with AI, ≥ 60 % rules
  only — write results to docs/intake-eval.md
- ai.features.intake = false → form still posts; quota reached → fallback message
- outbox: offline post → reconnect → exactly one request

OUT OF SCOPE IN P4
FAQ assistant, appeal text, duplicate hint (all P7). AI never makes a matching decision.

HUMAN STEPS
DEP-08 brand steps and DEP-09 intake set in place (Day 9). Airplane-mode test on a phone.
Web push test in Chrome Android and desktop. Native build #4 only if the native layer changed.

DEFINITION OF DONE
[ ] Redaction and intake targets met (numbers in docs/intake-eval.md)
[ ] AI off / quota reached: every flow still works
[ ] Web push arrives in Chrome (Android + desktop); alert guide works on 2 brands
[ ] Airplane-mode posting → exactly one request after reconnect
[ ] Bangla walk-through done, fixes merged

STOP AND ASK IF
The current Gemini free-tier terms or limits differ from PRD §6.3 · a model ID stops working.

FINAL REPORT: CLAUDE.md §3.7. Mark P4 (M4 "Speak it, paste it").
```

---

## 6. P5 — Admin panel and practice area

**Kickoff:** `Read CLAUDE.md, then carry out phase P5 from docs/build-prompts.md. Start with the plan.`

```text
PHASE P5 — ADMIN PANEL AND PRACTICE AREA · Day 12–13 (Sat 5 – Sun 6 Dec 2026)

Goal: a non-technical admin runs the platform from the browser, and judges can try the
live platform hands-on in the practice area without alerting real donors (PRD §2.3).

READ FIRST
- CLAUDE.md; docs/roadmap.md §1.1, §3 "P5"
- docs/PRD.md §2.2 metrics, §2.3 judging acceptance test, F-901–F-912
- docs/specs.md §1.9; §3.6 SCR-A01–A10 (core parts); §3.1 SCR-O02 practice sign-in;
  §6.4 admin.* (dashboard, moderation, audit, ai, usage, demo, settings); §6.5 /api/auth
  production rule, /public/stats; §6.6 every-5-min stats cron; VAL-27

BUILD, IN THIS ORDER
1. stats.computeSnapshots (cron every 5 min) + admin.dashboard → SCR-A01: blood pool by
   group, available now, registrations (30 days), open requests, funnel, confirmation rate,
   G1 times, volunteer coverage by hour, campaign sign-ups. Charts drawn with plain Views +
   a table toggle for screen readers. Practice data never included; practice funnel shown
   separately, labelled "Practice".
2. Moderation queue SCR-A02 + detail SCR-A03 (decisions with reason, user notified, audit).
3. Audit viewer SCR-A06 (filters, read-only).
4. AI controls SCR-A07 (per-feature on/off, usage vs limits, redacted log).
5. Usage monitor SCR-A08 (measured usage or links to provider dashboards; warnings S-30).
6. Practice area SCR-A09 exactly as specs: switch, practice accounts (Practice ID + PIN shown
   once, real phones, real verified numbers), practice hospital as a real hospitals row with
   isDemo, reset practice data, walkthrough checklist, practice funnel.
7. Practice sign-in: link on SCR-O02 when appConfig.practiceAreaEnabled; Better Auth email +
   password restricted by a server hook to *@practice.udvasito.invalid accounts with
   isDemo profiles while the practice area is on; sign-up disabled; 5 wrong PINs → 15-min
   lock; switching off revokes practice sessions.
8. Read-only settings SCR-A10 (core part). GET /public/stats.

TESTS TO WRITE FIRST
- dashboard numbers equal a hand count on a fixture
- practice requests never appear in real numbers (mixed fixture); reset deletes only practice
  rows
- practice sign-in rejected for any non-practice account, when the area is off, after 5 wrong
  PINs; sign-up through it impossible in production
- every moderation decision writes audit and notifies the person

OUT OF SCOPE IN P5
Settings editing, directory UI, FAQ UI, import/export (P7).

HUMAN STEPS
Super-admin creates practice accounts for the presentation phones; each phone signs in with
its ID + PIN, onboards with its real number and verifies it. Run PRD §2.3 on staging.

DEFINITION OF DONE
[ ] PRD §2.3 parts 1 and 2 pass on staging on a phone and in a browser in under 3 minutes
[ ] Tests above pass
[ ] No fake account or number exists anywhere (query check in the report)

STOP AND ASK IF
A dashboard metric needs data that no event records.

FINAL REPORT: CLAUDE.md §3.7. Mark P5 (M5 "Practice area works").
```

---

## 7. P6 — Public pages, hardening, core complete

**Kickoff:** `Read CLAUDE.md, then carry out phase P6 from docs/build-prompts.md. Start with the plan.`

```text
PHASE P6 — PUBLIC PAGES, HARDENING, CORE COMPLETE · Day 14–15 (Mon 7 – Tue 8 Dec 2026)

Goal: the public face is finished, every core feature is checked for accessibility, speed
and security, the release APK is out, and the judging walkthrough is rehearsed on the live
platform. Tue 8 Dec = T0: public launch, core complete.

READ FIRST
- CLAUDE.md; docs/roadmap.md §1.1, §3 "P6"
- docs/specs.md §3.7 SCR-P01, P05, P06, P07, P08; §7 (all); §7.9 QA checklist
- docs/PRD.md §2.3, §6.4 (Responsible-AI commitments shown on About)

BUILD / DO, IN THIS ORDER
1. Landing SCR-P01 (static shell; live numbers are a P7 feature — no numbers shown until then),
   About SCR-P05 (team without personal numbers, the 7 commitments verbatim, data credits,
   medical reviewer), download page final with checksum.
2. Final privacy/terms from DEP-02b → new consentVersion → everyone re-consents once (G3).
3. Accessibility: axe in Playwright on 10 key pages, TalkBack run of QA steps 1 and 3,
   200 % text — fix everything found.
4. Performance: Lighthouse throttled mobile ≤ 3 s first screen; web shell ≤ 600 KB gzip;
   admin and assistant code lazy-loaded.
5. Security: access-test matrix for every public function (visitor, member, donor,
   volunteer, admin, practice account); headers; secrets audit of git history; Sentry
   scrubber check; rate limits verified.
6. Playwright smoke (post → match → accept in the practice area) in CI before every
   production deploy.
7. Usability test support: a timer-free build; record results in docs/usability-test.md
   (roadmap P6 protocol).
8. Release APK v1.0.0 (build #5), GitHub Release, settings updated.

DEFINITION OF DONE
[ ] PRD §2.3 parts 1 and 2 pass on PRODUCTION, Android + browser, on mobile data, twice
[ ] QA checklist 10/10; no open sev1/sev2 bugs
[ ] axe: no serious/critical issues; Lighthouse budget met
[ ] Every public function covered by the access matrix
[ ] Nothing visible that does not work (specs §1.9)

STOP AND ASK IF
A fix would change a rule, copy or visibility behaviour.

FINAL REPORT: CLAUDE.md §3.7. Mark P6 (M6 "Core complete = T0").
```

---

## 8. P7 — Should features, all working

**Kickoff:** `Read CLAUDE.md, then carry out phase P7 from docs/build-prompts.md. Start with the plan.`
For each later session in P7: `Read CLAUDE.md, then continue phase P7 from docs/build-prompts.md with the next feature in the list.`

```text
PHASE P7 — SHOULD FEATURES, ALL WORKING · Day 16–20 (Wed 9 – Sun 13 Dec 2026)

Goal: every Should story works on the live platform by Sun 13 Dec (roadmap §1.1).
Each feature ships with its settings.features switch OFF, is switched on only after QA,
and is never merged after 18:00 on the day before judging.

READ FIRST
- CLAUDE.md; docs/roadmap.md §1.1, §3 "P7" (priority table)
- For each feature: its PRD row (F-…), its user story (AC), its specs screen and functions

ORDER (one feature = plan → tests → build → QA → switch on → next)
1  duplicateWarning — F-208 duplicate warning (rules first; AI "probably the same?" hint only
   on redacted fields) + F-707 merge (keeps acceptances, stops duplicate alerts, informs)
2  sharedLinks — F-1002 /r/<slug> (Cloudflare Worker route with Open Graph, anonymised view,
   "I can help" flow) + F-1005 appeal card (Cloudinary image, template fallback without AI)
3  campaignStats — F-708 campus QR codes + per-campaign sign-ups on the dashboard
4  impactNumbers — F-1001 live numbers on the landing page from /public/stats (real data only)
5  learnPages — F-1003 learn pages + F-1004 dengue page from src/content (DEP-03, reviewed)
6  assistant — F-604 "Can I donate?" over approved FAQ only (data/faq.csv import first);
   personal-health questions → fixed "ask a doctor / the blood bank" reply; S-29 cap
7  volunteerPost — F-211 volunteer posts from a public post (SCR-V05)
8  slips — F-209 slip photo + F-706 slip checks (SCR-V04; private storage; auto-delete S-26)
9  repeatRequest (F-210), donorHistory (F-506), reminders (F-505), editProfile (F-105),
   alertLimits (F-308)
10 settingsEdit (F-904), directoryUi (F-906), faqUi (F-907), dataImportExport (F-905),
   weeklySummary (F-908), emailAlerts (F-307, only if ADR-015 email is set up),
   installPrompts (F-1006)
11 pinMap (D-R2) — only if 1–10 are done: MapLibre + OpenFreeMap, native build #6

RULES
- Fix production bugs before starting the next feature.
- A feature not finished by the end of Day 20 stays switched off — never shown half-done.
- Every feature: tests, EN/BN copy from specs, access tests, isDemo isolation, no phone
  numbers in logs, member 3 QA, then switch on in production.

DEFINITION OF DONE (per feature, and for the phase)
[ ] Feature's acceptance criteria (user-stories.md) all pass on a phone and in a browser
[ ] Switch on in production after QA; walkthrough still passes PRD §2.3
[ ] By Sun 13 Dec: all 23 Should stories switched on, or the list of the ones still off with
    the reason (report to the team)

FINAL REPORT: CLAUDE.md §3.7, plus the feature-switch table (on/off, date). Mark P7 (M7).
```

---

## 9. Utility prompts

| Situation | Paste into Claude Code |
|---|---|
| **Resume a phase** | `Read CLAUDE.md, then resume phase P<n> from docs/build-prompts.md: check git log and the roadmap status, tell me what is left, then continue.` |
| **Bug from QA** | `Read CLAUDE.md. Bug #<issue> (P<n>, sev<1-3>): <what happened, phone/browser, steps>. Find the cause, write a failing test first, fix it, run npm run check, commit "fix: …". Do not change any rule, copy or visibility behaviour without asking.` |
| **Production hotfix** | `Read CLAUDE.md. Production problem: <description>. Make the smallest safe fix on a branch from main, with a test. Tell me whether it can ship by EAS Update or needs a native build. Do not deploy until I say so.` |
| **Review before merge to main** | `Read CLAUDE.md. Review the diff between main and staging against CLAUDE.md §2 and the Definition of Done of phase P<n> in docs/roadmap.md. List problems by severity with file and line; do not change code.` |
| **Spec question** | `Read CLAUDE.md. I think docs/specs.md says <X> but the code does <Y>. Check both, tell me which is right per the documents, and propose the fix. Do not edit the docs.` |
| **Free-tier check** | `Read CLAUDE.md. Check current usage against the free-tier budget in docs/ADRs.md §3 using the admin usage monitor and provider dashboards, and tell me what is closest to its limit.` |

---

## 10. Change log

| Version | Date | Change |
|---|---|---|
| 0.1 | 2026-11-23 | First build prompts: how-to-use, kickoff lines, prompts P0–P7 with reading lists, build order, tests first, out-of-scope lists, human steps, Definitions of Done and stop-and-ask lists; utility prompts. Companion `CLAUDE.md` for the repository root |
| 1.0 | 2026-11-23 | **Approved** — no content change |
