# questions.md — open questions for the developer and the team

Format: ID · date · phase · question · options · recommendation · status.
Reply in the chat with the ID and your choice (e.g. "Q-001: A"). Claude records the answer here.

---

### Q-001 · 2026-11-27 · P0 · Schedule: the build starts 4 days late
The roadmap planned P0 for Mon 23 – Wed 25 Nov and the pilot go-live (end of P1) for **Sat 28 Nov**. Today is Fri 27 Nov
and P0 has just started.
- **A.** Shift every phase by 4 days (P0 → Fri 27 – Sun 29 Nov, pilot go-live → **Wed 2 Dec**, release APK v1.0.0 →
  Sat 12 Dec, P7 ends Thu 17 Dec). Nothing is cut yet.
- **B.** Keep the judging date fixed and take cuts from roadmap §9 from the top as phases slip.
- **C.** Compress P0 + P1 into 4 days and keep all later dates.

**Recommendation: A** for the pilot (safety first: never rush the emergency path), and apply **B** only if the judging
date cannot move. Needs: the real judging date from the team.
**Answer (2026-11-27, developer):** "just keep working, no need to worry about the dates." → dates are guidance; no schedule cuts. Recorded in roadmap change log 1.2.
Status: ✅ answered

### Q-002 · 2026-11-27 · P0 · Use the new domain udvasito.com?
The developer bought **udvasito.com** (Namecheap, the only paid item). All documents, copy strings and the promo film use
`udvasito.vercel.app`.
- **A.** Pilot stays on `udvasito.vercel.app` (as documented). Add udvasito.com later with an ADR.
- **B.** Connect udvasito.com to Vercel now (free on Hobby) as the main address; keep `udvasito.vercel.app` working as a
  redirect. Write ADR-023, update copy strings that show the address, and use `udvasito.com` for the Google sign-in screen
  (this also answers spike S3 better: Google shows our own name).
- **C.** Use udvasito.com only for the landing page / APK download; the app stays on vercel.app.

**Recommendation: B** — a real domain builds trust with families and judges, costs nothing extra on Vercel, and makes
the Google sign-in screen show our own address. Needs team approval because it changes copy and an accepted decision.
**Answer (2026-11-27, developer): B — use the new domain everywhere.** Written as ADR-023; all docs switched to `udvasito.com`; staging web = `staging.udvasito.com`. *(2026-11-27 later: hosting moved from Vercel to Cloudflare — ADR-024; `udvasito.vercel.app` was never created.)*
Status: ✅ answered

### Q-003 · 2026-11-27 · P0 · Android notification channel names disagree
`specs.md` §1.2.1 says one channel **`blood-requests`** (importance MAX, lock-screen PUBLIC). §6.8 says
**`urgent-requests`** (high) for NTF-01/02/07/08/16 and **`updates`** (default) for the rest.
- **A.** `blood-requests` (MAX) for the urgent templates + `updates` (default) for the rest — §1.2.1 is the newer text
  (v1.1 issue-check fix) and renamed `urgent-requests`.
- **B.** Use §6.8 names exactly.

**Recommendation: A.** Channels are created in JavaScript at first launch (no native rebuild needed to change them later,
but a renamed channel loses the user's per-channel settings, so we fix it now).
**Answer (2026-11-27, developer): "you decide" → A.** specs §6.8 updated to match §1.2.1 (specs change log 1.3).
Status: ✅ answered

### Q-004 · 2026-11-27 · P0 · When is the `profiles` row created?
The P0 Definition of Done says Google sign-in creates "a `profiles` row". The schema makes `name`, `dateOfBirth` and
`phone` required, and those are asked only in onboarding (SCR-O03, P1).
- **A.** P0 sign-in creates only the Better Auth user; `profiles.me` answers "needs onboarding"; the row is created by
  `profiles.completeOnboarding` in P1 (no placeholder values).
- **B.** Create a row at sign-in with empty name/DOB/phone (needs the schema to make them optional — a later required →
  optional change on live data).

**Recommendation: A** — no half-filled rows, schema stays strict. The DoD item is then checked as "a Better Auth user is
created and `profiles.me` returns needs-onboarding" in P0 and "a `profiles` row" in P1.
Also decided with it: `minimumAppVersion` / `latestAppVersion` are seeded as **0.1.0** (the default 1.0.0 would block
the pilot APK v0.1.0); `fallbackContactPhone` is seeded empty until the super-admin sets it through `internal.admin.ops`.
**Answer (2026-11-27, developer): "do the recommendations"** → A confirmed.
Status: ✅ answered

### Q-005 · 2026-11-27 · P0 · Copy missing from specs (not invented — waiting for text)
These strings are needed but specs has no exact English + Bangla text. Until they arrive the code uses only existing keys:
1. **Bangla tab labels** (specs §1.4.1 gives English only). Tabs come in P1; P0 uses a plain stack.
2. **Not-found page button** — now uses `common.back` ("Back"); a "Go to Home" label would need new copy.
3. **Web skip link** ("Skip to main content") — WCAG 2.4.1; not shown yet.
4. **Language switch accessible name** — reuses `welcome.chooseLanguage`. OK?
5. **Account-status actions** (SCR-O06) are in English only: "View my request · Call helpline", "Contact us (email)",
   "Cancel deletion" — need Bangla (P1).
6. **`common.offline`** says "({{count}} waiting)" even when nothing is waiting — needs a variant without the count, e.g.
   EN "You're offline. We'll send your changes when you're back online." + BN text.
7. **Language names in the toggle** — specs §1.3.5 shows the toggle as "বাংলা / EN" but gives no key, and the welcome
   screen's large buttons need the full name "English". They are written once in `LanguageToggle.tsx` (each name in
   its own script, identical in both languages), not in en.json / bn.json. OK, or should specs give them keys
   (e.g. `language.bn`, `language.en`, `language.enShort`)?

**Recommendation:** member 1 (content) writes 1, 3, 5 and the no-count variant of 6 in both languages; 2 and 4 stay as
they are; 7 stays as it is unless the team wants keys. Then `npm run copy:extract` picks them up from specs.
**Answer (2026-11-27, developer): "do the recommendations"** → 2, 4 and 7 stay as they are; member 1 writes 1, 3, 5 and the no-count variant of 6 (team job in for_me.md).
Status: ⏳ waiting for member 1's copy (1, 3, 5, 6)

### Q-006 · 2026-11-27 · P0 · Small additions made to the specs contracts (please confirm)
1. `public.appConfig` (specs §6.1) also returns **`helplineAvailable: boolean`** (true when `fallbackContactPhone` is
   set). Helpline buttons are hidden while no number exists, instead of showing a button that cannot work (§1.9). The
   number itself is still fetched only on tap (D-R3).
2. **Practice sign-in** is not shown on the sign-in screen until the practice area is built (P5, D-R4) — an unfinished
   feature is invisible (§1.9).
3. **Security fix without an SDK change:** `npm audit` flagged `decode-uri-component` ≤ 0.5.0 (high, DoS) inside
   expo-router's `query-string`. `package.json` overrides it to 0.5.1, and a 2-line shim (`src/vendor/`) lets Metro load
   the new ESM-only build. URL parsing was tested (`%2F`, Bangla, malformed escapes). Remove both when Expo ships the fix.
4. **`seedSettings` picks staging or production values from the deployment's `SITE_URL`**, not from `--prod`
   (staging is the prod deployment of `udvasito-staging`, so the flag cannot tell them apart). Unknown → it stops.

**Recommendation:** keep all four.
**Answer (2026-11-27, developer): "do the recommendations"** → all four kept.
Status: ✅ answered

### Q-007 · 2026-11-27 · P0 · Places dataset: which files, and permission to download them
ADR-013 candidates checked (licence first):
- `bangladesh-geo-data` repos on GitHub: **no licence** → cannot be used.
- `nuhil/bangladesh-geocode` (MIT; data from BBS / UN OCHA COD-AB, CC BY-IGO): 8 divisions, 64 districts, 495 upazilas with
  English + Bangla names, centres and BBS codes. Its published upazila list has **no Chattogram metropolitan thanas**; its
  `pipeline/sources/bbs_admin3_points.csv` has them in English with BBS codes and centres, but no Bangla names.
- `mdtanjilhasan/bd-geocode-with-lat-long` (MIT, 2020): has the Chattogram thanas with English **and** Bangla names and centres
  (some rows elsewhere have no coordinates). Its spellings differ from BBS (e.g. "Potenga" / "Patenga").

**Recommendation:** divisions, districts and upazilas from nuhil (BBS codes as `code`); metropolitan thanas = BBS admin-3
codes, English names and centres, plus Bangla names from bd-geocode-with-lat-long with the "থানা" suffix removed; member 2
checks the thana list and spellings against the CMP official list (roadmap §5.2). Attribution in `docs/data-licences.md`
and on the About page.
Files to download (≈ 229 KB in total, committed under `data/sources/places/` with their licences):
nuhil/bangladesh-geocode@master — `divisions/divisions.json` (1.4 KB), `districts/districts.json` (11 KB),
`upazilas/upazilas.json` (90 KB), `pipeline/sources/bbs_admin3_points.csv` (37 KB), `pipeline/sources/manifest.json` (1.3 KB),
`LICENSE` (1 KB); mdtanjilhasan/bd-geocode-with-lat-long@master — `all-in-one/db_geocode.json` (86 KB), `LICENSE` (1 KB).

**Decision made with it (please confirm):** `src/data/places.min.json` is keyed by place `code`, not Convex `_id` (ids
differ between staging and production, but one app bundle serves both). In P1 the app maps code → `_id` from the places
it fetched; that needs `code` added to the `places.list` result (additive change to specs §6). The offline file holds no
phone numbers or addresses (`hospitals.bloodBanksNear` is member-only).
**Answer (2026-11-27, developer): "yes"** → files downloaded at pinned commits into `data/sources/places/`, built with
`scripts/build-places.ts`; licences in `docs/data-licences.md`. Akbar Shah thana has no centre in any source and is left out
until member 2 adds one. The code-keyed offline file still needs the team's confirmation.
Status: ✅ answered (offline-file design confirmed 2026-11-27: "do the recommendations")

### Q-008 · 2026-11-27 · P1 · P0 is not finished and the P1 go-live date (Sat 28 Nov 14:00) has passed
Still open in P0: Android development build #1, Google sign-in on Android and on production, a push to a locked phone,
Lighthouse ≤ 3 s, spikes S1–S4. They wait on human steps (Cloudflare ↔ GitHub, Telegram bot, Gemini key, phones,
an EAS build).
- **A.** Build P1 now on staging; finish the P0 items alongside as the human steps arrive; go live on production only
  when the P1 Definition of Done passes and DEP-01/DEP-02 exist. Claude asks before every production deploy.
- **B.** Stop P1 until P0 is fully done.

**Recommendation: A** (follows Q-001 "just keep working").
**Answer (2026-11-27, developer): "do the recommendations"** → A.
Status: ✅ answered

### Q-009 · 2026-11-27 · P1 · The privacy notice and terms (DEP-02) do not exist yet
The consent screen (SCR-O01, gate G3) links to `/privacy` and `/terms`, rendered from `src/content/legal/*.md` (roadmap
§5.4). Claude may not write legal text, and a placeholder page or a dead link is not allowed (specs §1.9).
- **A.** Build the consent screen, `consents.accept`, G3 and the legal-page renderer now. `npm run content:build` refuses
  to build without all four legal files, so nothing ships without the real draft. Until member 4 delivers it, the flow
  is tested with automated tests only; real people (and the team on staging) see the consent screen once the draft is in.
- **B.** Ship the consent screen without links until the draft arrives (consent without the notice — not valid).

**Recommendation: A**; member 4's draft (EN + BN) is the most urgent team job.
**Answer (2026-11-27, developer): "do the recommendations"** → A.
**How it is built:** with **no** legal files the build works but `/welcome`, `/onboarding`, `/privacy` and `/terms`
do not exist (gates never send anyone there, the addresses show "not found"); with **some but not all four**, or a
wrong `version`/`effective` header, `npm run content:build` stops and leaves the legal pages out.
Status: ✅ answered (waiting for DEP-02)

### Q-010 · 2026-11-27 · P1 · Test phones: one named so far
Named: **iQOO Z10 Turbo Pro** (Vivo family; Android version not given). P0 needs a cheap 2 GB phone (Bangla rendering)
and a Xiaomi/Redmi (spike S2); the P1 Definition of Done needs **three phones** (requester + two donors).
**Recommendation:** the team lends two more Android phones — ideally one cheap 2 GB phone and one Xiaomi/Redmi. The iQOO
covers the Vivo battery-settings guide (SCR-M08 "Vivo").
**Answer (2026-11-27, developer): "do the recommendations"** → borrow two phones (team job in for_me.md).
Status: ⏳ waiting for two more phones


### Q-011 · 2026-11-27 · P1 · A date picker for date of birth, last donation and "pick date & time"
SCR-O03 (date of birth), SCR-D02 (last donation) and CMP-NeededByPicker ("Pick date & time") need a date picker, but
no picker library is named in ADRs/specs, and specs has no copy for "Day / Month / Year" boxes.
- **A.** Add `@react-native-community/datetimepicker` (MIT, free, Expo's recommended picker). Android shows the phone's
  own calendar (already in the phone's language); the web uses the browser's own date box. No new copy needed. Needs a
  native build, but build #1 has not been made yet, so it costs no extra build.
- **B.** No new library: three typed boxes (day / month / year). Needs 3 new copy strings (EN + BN) reviewed by member 1.

**Recommendation: A.**
**Answer (2026-11-27, developer):** A — the phone's own calendar (`@react-native-community/datetimepicker`, ADR-025).
Status: ✅ answered

### Q-012 · 2026-11-27 · P1 · The "version + effective date" line on the privacy and terms pages
SCR-P06/P07 say the pages show the version and effective date at the top, but specs has no copy for that line.
- **A.** Add `legal.version` = "Version {{version}} · in effect from {{date}}" / "সংস্করণ {{version}} · কার্যকর {{date}} থেকে"
  (member 1 reviews the Bangla).
- **B.** Member 4 writes the version and date as the first line of each legal text; the app adds nothing.

**Recommendation: A** (the line always matches the file header, so it can never be out of date).
**Answer (2026-11-27, developer):** A — `legal.version` added to specs SCR-P06/P07 (member 1 reviews the Bangla).
Status: ✅ answered

### Q-013 · 2026-11-27 · P1 · What is kept for someone under 18
SCR-O03 marks an under-18 account `underage_blocked`. Specs does not say which details are kept. A child cannot give
consent (PDPO 2025), so keeping their name and mobile number has no purpose.
- **A.** Keep only the date of birth (the reason for the block) and the status; no name, no number, no consent row.
- **B.** Keep the name and number like any other account.

**Recommendation: A** — built this way (`profiles.completeOnboarding`); easy to change before go-live if the team prefers B.
**Answer (2026-11-27, developer):** A — keep only the date of birth.
Status: ✅ answered

### Q-014 · 2026-11-27 · P1 · Missing words for the tab bar, More, Settings, account-status buttons and /download
specs §1.4.1, SCR-M10, SCR-M06, SCR-O06 and SCR-P08 name these labels in English only (or not at all); there is no
Bangla and no copy key. Draft (keys follow the specs' style; member 1 reviews the Bangla like all other copy):

| Key | English | বাংলা |
|---|---|---|
| `tabs.home` | Home | হোম |
| `tabs.requests` | Requests | অনুরোধ |
| `tabs.donate` | Donate | রক্ত দিন |
| `tabs.volunteer` | Volunteer | স্বেচ্ছাসেবক |
| `tabs.admin` | Admin | অ্যাডমিন |
| `tabs.more` | More | আরও |
| `more.learn` | Learn about donating | রক্তদান সম্পর্কে জানুন |
| `more.dengue` | Dengue & platelets | ডেঙ্গু ও প্লাটিলেট |
| `more.applyVolunteer` | Apply to volunteer | স্বেচ্ছাসেবক হতে আবেদন করুন |
| `more.about` | About UDVASITO | উদ্ভাসিত সম্পর্কে |
| `more.download` | Download / install app | অ্যাপ ডাউনলোড / ইনস্টল করুন |
| `settings.language` | Language | ভাষা |
| `settings.privacy` | Privacy notice | গোপনীয়তা নীতি |
| `accountStatus.viewRequest` | View my request | আমার অনুরোধ দেখুন |
| `accountStatus.contactUs` | Contact us by email | আমাদের ইমেইল করুন |
| `accountStatus.cancelDeletion` | Cancel deletion | মুছে ফেলা বাতিল করুন |
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

Existing keys are reused where they already say the same thing: Settings → `settings.title`, Sign out →
`settings.signOut`, Terms → `welcome.terms`, Call helpline → `request.fallbackTitle`, "Or use the web app" →
`update.useWeb`, the iPhone alerts note → `alertGuide.ios`. The iPhone guide uses icons instead of the illustrations
specs mentions (none exist yet). Rows and tabs for features not built yet stay hidden (specs §1.9).
- **A.** Use this draft now; member 1 reviews the Bangla before the first campus drive.
- **B.** Wait for member 1 to write the copy first (the shells wait too).

**Recommendation: A.**
**Answer (2026-11-27, developer):** "use the default Bangla translation of English everywhere" → A, and a standing rule:
where specs gives English only, the Bangla is the plain standard translation of that English (no question needed).
Member 1 may still polish it in review.
Status: ✅ answered
