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

**Recommendation:** member 3 (Bangla content) writes 1, 3, 5 and the no-count variant of 6 in both languages; 2 and 4 stay as
they are; 7 stays as it is unless the team wants keys. Then `npm run copy:extract` picks them up from specs.
**Answer (2026-11-27, developer): "do the recommendations"** → 2, 4 and 7 stay as they are; member 3 writes 1, 3, 5 and the no-count variant of 6 (team job in for_me.md).
Status: ⏳ waiting for member 3's copy (1, 3, 5, 6)

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
**Update (2026-11-28, developer):** *"write the legal texts by yourselfs, a law teacher will review that before final
publish"* → this replaces "Claude may not write legal text" for DEP-02. Claude wrote the **draft** privacy notice and
terms in English and Bangla (`src/content/legal/{privacy,terms}.{en,bn}.md`, version `2026-11-28-pilot`). It is based
only on what the app really collects and does (specs §5, PRD §3.3, §5.9, §6). Member 4 arranges the law teacher's first
read (DEP-02a). That read and its fixes are required **before anything goes to production** (roadmap P1 go-live step 0).
The full review (DEP-02b) then becomes the final version, a new `consentVersion`, and everyone re-consents once.
Status: ✅ draft in (staging) · ⏳ law teacher's read (DEP-02a) before production

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
- **B.** No new library: three typed boxes (day / month / year). Needs 3 new copy strings (EN + BN) reviewed by member 3.

**Recommendation: A.**
**Answer (2026-11-27, developer):** A — the phone's own calendar (`@react-native-community/datetimepicker`, ADR-025).
Status: ✅ answered

### Q-012 · 2026-11-27 · P1 · The "version + effective date" line on the privacy and terms pages
SCR-P06/P07 say the pages show the version and effective date at the top, but specs has no copy for that line.
- **A.** Add `legal.version` = "Version {{version}} · in effect from {{date}}" / "সংস্করণ {{version}} · কার্যকর {{date}} থেকে"
  (member 3 reviews the Bangla).
- **B.** Member 4 writes the version and date as the first line of each legal text; the app adds nothing.

**Recommendation: A** (the line always matches the file header, so it can never be out of date).
**Answer (2026-11-27, developer):** A — `legal.version` added to specs SCR-P06/P07 (member 3 reviews the Bangla).
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
Bangla and no copy key. Draft (keys follow the specs' style; member 3 reviews the Bangla like all other copy):

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
- **A.** Use this draft now; member 3 reviews the Bangla before the first campus drive.
- **B.** Wait for member 3 to write the copy first (the shells wait too).

**Recommendation: A.**
**Answer (2026-11-27, developer):** "use the default Bangla translation of English everywhere" → A, and a standing rule:
where specs gives English only, the Bangla is the plain standard translation of that English (no question needed).
Member 3 may still polish it in review.
Status: ✅ answered

### Q-015 · 2026-11-27 · P1 · Phone verification: one verified account per number, and what the daily limit counts
Specs gives `ERR_PHONE_IN_USE` ("already verified on another account") only on `acceptMismatch`, and says
`inPersonVerificationsPerDay` limits `confirmInPerson` without saying which outcomes count.
- **A.** Every way a number becomes verified (in person, Telegram, WhatsApp) refuses a number that is already verified
  on another account **in the same area** (real or practice — practice accounts use real numbers, D-R4). The daily limit
  counts **successful** in-person verifications only; "It doesn't match" verifies nothing and is always allowed (still
  audit-logged). The SCR-V06 footer "{{n}} of {{max}}" shows the same count.
- **B.** Check only on `acceptMismatch`, as written; count every confirmation.

**Recommendation: A** — otherwise one number could verify any number of accounts, which is what the error exists to
stop; and a limit on "no match" answers would only block honest volunteers.
**Applied:** A (standing instruction "do the recommendations"); tell me if you want B.
Status: 🟦 applied, waiting for review

### Q-016 · 2026-11-27 · P1 · What the member sees when an in-person check says "It doesn't match"
SCR-O04 has copy for a Telegram mismatch, but none for the member's screen after a volunteer taps "It doesn't match"
(the volunteer sees `verifyInPerson.failed`).
- **A.** Add `verify.inPersonFailed` — "The volunteer couldn't match your number. Check the number you entered, then
  get a new code." / "স্বেচ্ছাসেবক আপনার নম্বর মেলাতে পারেননি। আপনার দেওয়া নম্বরটি দেখে নিন, তারপর নতুন কোড নিন।"
- **B.** No message: the code card closes and the "Verify in person" button comes back (the volunteer tells the person
  face to face).

**Recommendation: A.** Until answered the screen does **B** (no new copy is invented).
Status: ⬜ open

### Q-017 · 2026-11-27 · P1 · Telegram bot: what it says, and the edge cases specs leaves open
Specs (§6.5) gives the webhook ("upsert verification") and the app-side copy, but not the bot's own messages or what
happens when the shared contact is odd. The Telegram flow is built as follows (specs §6.5 has a new copy table):
- **Bot replies** (English line, then Bangla): `telegramBot.share` "Share my phone number" (the button label — the same
  words `verify.telegramSteps` already quotes), `telegramBot.verified` "✅ Verified — go back to UDVASITO",
  `telegramBot.ownNumber` "Please share your own number.". Late or unknown links reuse `verify.expired`.
- **Someone else's contact** (a forwarded card) → `telegramBot.ownNumber`; nothing changes.
- **Not a Bangladeshi mobile** (e.g. a foreign Telegram number) → `validation.VAL-03.invalid`; the link stays open so
  the person can verify in person instead.
- **Number already verified on another account** (Q-015) → `errors.ERR_PHONE_IN_USE`; nothing changes.
- **A link opened from a second Telegram account** → `verify.expired`; a link belongs to the first account that opens it.
- **Different number than the one typed** → the bot still says "Verified — go back"; the app then asks
  `verify.mismatch` with `verify.useVerified` / Cancel (specs SCR-O04).

**Recommendation:** keep as built — every case is safe (nothing is verified unless it is the person's own Bangladeshi
number, not used elsewhere), and the new English lines are short enough for member 3 to review with the Bangla.
**Applied:** as above (standing instruction "do the recommendations"); member 3 to review the three new bot lines.
Status: 🟦 applied, waiting for review

### Q-018 · 2026-11-27 · P1 · Words for donor setup and the Donate tab that specs names in English only
SCR-D02 names the gender options, the place pickers, "I don't know my group" and the last-donation fields in English
only, with no keys; SCR-D01 needs a label for the availability control and a way back into setup (to add the blood
group later, as `donor.setup.unknownGroup` promises). Following the standing rule (Q-014: "use the default Bangla
translation"), specs SCR-D02 now has a copy table with 18 keys (`donor.setup.dontKnowGroup` … `common.noMatches`).
Also decided while building (no copy involved):
- The health-data consent version is the current legal version (`settings.consentVersion`); a new version makes the
  donor not live until they accept it again (`donor.notLive.consent`), like the main consent (X08).
- "Paused until" is hidden in P1 (roadmap: availability pause is out of scope); Available / Not available work.

**Recommendation:** keep as built; member 3 reviews the 18 Bangla lines.
**Applied:** as above (standing instruction "do the recommendations").
Status: 🟦 applied, waiting for review

### Q-019 · 2026-11-27 · P1 · Request form (SCR-M02 form path): words and rules specs leaves open
SCR-M02 names the units stepper buttons in English only and has no words for the place-name field, distances, the
"Pick date & time" fields, an empty "needed by", or the monthly-limit banner (whose `{{phone}}` is fetched only on
tap, D-R3). Following the standing rule (Q-014), specs SCR-M02 now has a copy table with 13 keys
(`request.unitsIncrease` … `validation.VAL-08.empty`). Also decided while building:
- **Numbers kept as constants, not settings:** "Now" = within 2 h, "Tomorrow" = 12:00, 1–10 bags, 5 minutes of grace
  and 30 days ahead (VAL-08), and the text lengths. They are definitions written in specs §4 / SCR-M02 and are not
  in the settings list (§5.2). Each sits in one place (`convex/rules/request.ts`).
- **Contact "verified":** `contactPhoneVerified` is true only when the contact number is the requester's own verified
  number. Any other number is posted but shows "phone not yet verified".
- **Place lists come from the server** (`places.list`, `hospitals.search`), not the bundled file: posting needs a
  network anyway, and the offline outbox is out of P1 scope. "My place isn't in the list" asks district → thana
  (the division follows from the district) → place name.
- **Location:** the reading stays on the phone (it sorts nearby hospitals or picks the thana). The server stores the
  hospital's point or the thana's centre, rounded to 3 decimals, never the reading.
- **The form starts with no "needed by" choice**, so urgency is never assumed.
- **Monthly limit:** banner `request.monthlyLimit` plus the "Get help" helpline button, which fetches the number.
- **After posting:** SCR-M03 (`/request/[id]`) comes in slice 13. Until then, the app goes to Home with the "Sent" toast.
- **Not in this slice:** the money-word flag (the automatic-flags step; specs has no word list, and none is invented)
  and a per-minute rate limit on posting (slice 15).

**Recommendation:** keep as built; member 3 reviews the 12 Bangla lines.
**Applied:** as above (standing instruction "do the recommendations").
Status: 🟦 applied, waiting for review

### Q-020 · 2026-11-27 · P1 · Push alerts (matching v1): words and rules specs leaves open
- **Android channel names:** specs §1.2.1 fixes the channel ids (`blood-requests`, `updates`) but not the names people
  see in Android Settings. Following the standing rule (Q-014), specs §6.8 now has
  `notifications.channel.bloodRequests` "Blood requests" / "রক্তের অনুরোধ" and `notifications.channel.updates`
  "Updates" / "হালনাগাদ".
- **"Fix" on the alerts banner** (SCR-D01 point 3) has no key: added `donor.alertsFix` "Fix" / "ঠিক করুন". The
  alert guide it should open (SCR-D07) is P4, so in P1 "Fix" shows the Android permission dialog, or opens the app's
  Android settings when the dialog may no longer be shown. When SCR-D07 is built, "Fix" opens it instead.
- **Travel range is respected from wave 1:** a donor who chose "my thana only" is alerted only for requests in their
  thana (PRD §5.3 filter). Neighbouring thanas count from P2, with the thana tiers.
- **Distance in the alert** ("· 3.2 km"): from the centre of the donor's thana to the hospital (or the request's
  thana centre), one decimal under 10 km. The app never sends the donor's own location to the server.
- **"By {{time}}":** the time alone when it is today in Dhaka ("10:30 PM"), else date and time ("28 Nov, 9:00 AM").
- **No Android device registered** (web-only donors, P1 has no web push): the donor still gets the `responses` row,
  so the alert waits in the app (notification channel `inapp`) and counts toward the wave size.
- **Quiet hours (S-21) and the daily cap (S-20)** are enforced from P2, as the P2 prompt lists them. Until then a wave
  can reach a donor at night. With S-08 wave 1 = 10 donors per request this is bounded; flagging it so the team
  knows.

**Recommendation:** keep as built; member 3 reviews the 3 Bangla lines.
**Applied:** as above (standing instruction "do the recommendations").
Status: 🟦 applied, waiting for review

### Q-021 · 2026-11-28 · P1 · Answering a request (SCR-D03, SCR-D04): words and rules specs leaves open
- **New copy** (specs gives English only, or no words; standard Bangla per Q-014) — member 3 to check:
  - SCR-D03 state chips: `alerts.state.new` "New" / "নতুন", `alerts.state.confirmed` "Confirmed" / "নিশ্চিত",
    `alerts.state.standby` "On standby" / "অপেক্ষমাণ".
  - SCR-D04 sheet: `alert.callMode.label` "How will you talk to the family?" / "পরিবারের সঙ্গে কীভাবে যোগাযোগ
    করবেন?", `alert.callMode.mutual` "Share numbers" / "নম্বর শেয়ার করুন", `alert.callMode.donorCalls` "I'll call
    them" / "আমি নিজেই কল করব", `alert.confirm` "Confirm" / "নিশ্চিত করুন", `alert.send` "Send" / "পাঠান".
  - CMP-ContactCard role chip: `contact.role.requester` "Requester" / "অনুরোধকারী", `contact.role.donor` "Donor" /
    "রক্তদাতা".
  - Time left after the deadline comes from date-fns ("in 2 hours" / "২ ঘন্টা এর মধ্যে"); member 3: is the date-fns
    Bangla wording acceptable, or should we write our own?
- **`ERR_NOT_ELIGIBLE` reasons:** the "↳ reason" rows of specs §6.7 are now read by `copy:extract` as
  `errors.ERR_NOT_ELIGIBLE.reason.<reason>` (they produced broken keys before). The cooldown date and the age limits
  are shown in the reader's language.
- **Who is confirmed:** the first `unitsNeeded + S-12` donors to tap Confirm (one transaction, so never more). The
  request becomes `covered` when `unitsConfirmed` reaches `unitsNeeded`; it stays open until the family closes it.
- **When the number stops showing:** a confirmed slot's reveal expires S-18 days after the latest possible close
  (needed-by + S-17 auto-close). Slice 13 moves it to closedAt + S-18 when the family closes the request.
- **Contact details paused** (`revealsFrozen`): accept still confirms the donor but grants no reveal and the screen
  says `request.revealsFrozen`.
- **"Donated recently" when declining:** the date is optional; when given it becomes the last donation (the later of
  the known and the new date), counted as whole blood (the longer interval, as in donor setup), and the next eligible
  date moves.
- **Requester's track record:** "donations confirmed" counts confirmed donors on the requester's earlier requests
  that either side marked as donated (the confirmation flow is P3, so it is 0 until then).
- **Directions:** a listed hospital opens Google Maps at its own point; a typed place opens a search for its name and
  thana (its point is only the thana centre).
- **Closed request:** banner `alerts.closedItem` with `publicRequest.closed` as the thanks line.
- **Not visible in P1** (build prompt scope): "Still coming?", "I can't make it anymore", Report and block, the
  offline outbox. NTF-04 opens `/request/{id}` (SCR-M03, slice 13).

**Recommendation:** keep as built; member 3 reviews the 10 Bangla lines and the date-fns wording.
**Applied:** as above (standing instruction "do the recommendations").
Status: 🟦 applied, waiting for review

### Q-022 · 2026-11-28 · P1 · Copy-number button on Android needs a clipboard library
CMP-ContactCard has a copy-number button. React Native no longer ships a clipboard, and no clipboard library is
named in the ADRs, so CLAUDE.md says to ask before adding one.
- **Option A (recommended):** add `expo-clipboard` (Expo's own module, MIT, free, stores nothing, part of the Expo
  SDK we already use) with a one-line ADR-012 note. Needs a new native build (EAS, counts toward the 15/month).
- **Option B:** keep what is built now — the button on web (browser clipboard); on Android the number is selectable
  text (long-press → Copy), Call and WhatsApp work as specified.

**Built for now:** option B (nothing half-working: the button is hidden where it cannot work).
**Decision 2026-11-28 (developer): A.** `expo-clipboard ~57.0.2` added; the button shows on Android and web. Arrives on
phones with the next EAS build. Status: ✅ decided

### Q-023 · 2026-11-28 · P1 · Closing a request: who is told, and with which words
`requests.close` (specs §6.2) sends NTF-09 to donors who are notified, opened or on standby. Two gaps:
1. **Confirmed donors are not told.** If the family taps "No longer needed", a confirmed donor may already be on the
   way. In "I'll call them" mode (D16) the family does not even have the donor's number to call them off. Their
   SCR-D04 screen does turn to "closed" live, but nothing reaches their lock screen.
2. **NTF-09's body says "has been arranged"**, which is wrong when the reason is "No longer needed" (e.g. the patient
   was discharged or bags came from a blood bank).
- **Option A (recommended):** also send NTF-09 to confirmed donors when the reason is `not_needed`; add an NTF-09
  body variant for `not_needed`: "The {{group}} request at {{hospital}} is no longer needed. Thank you for being
  ready." / "{{hospital}}-এর {{group}} অনুরোধটির আর প্রয়োজন নেই। প্রস্তুত থাকার জন্য ধন্যবাদ।"
- **Option B:** keep the spec as written (confirmed donors hear nothing until the donation-confirmation prompt, P2).

**Built for now:** option B, exactly as specified (copy and rules are the team's call — CLAUDE.md §3).
**Decision 2026-11-28 (developer): A.** specs §6.2 `requests.close` and the NTF-09 row updated; new key
`notifications.NTF-09.body.notNeeded` (Bangla for member 3 to check). Status: ✅ decided

### Q-024 · 2026-11-28 · P1 · 30-second helpline and "no donors yet": three small readings of the specs (please confirm)
1. **`requests.getForOwner` returns `fallbackShown: boolean`, not `fallbackPhone`.** specs §6.2 lists an optional
   `fallbackPhone`; roadmap P1 (F-504) and D-R3 say the helpline goes through `useHelpline()` and is fetched only on
   tap. Built the D-R3 way: SCR-M03 shows the "Call the UDVASITO helpline" button, and the number arrives when it is
   tapped. Like every helpline button, it stays hidden until `fallbackContactPhone` is set (Q-006).
2. **"Volunteer contact in 0:21" countdown is not shown in P1.** Its copy (`request.volunteerIn`) promises *a
   volunteer's number*, but no volunteers exist until P3, so the helpline simply appears at S-13. The countdown
   arrives with volunteers.
3. **"No donors yet" step 2 ("Share your request on Facebook and WhatsApp") is hidden** until the share card exists
   (if-time, SCR-M05): advice to share with no share button would be a dead end (specs §1.9). Steps are numbered in
   the order shown, and each appears only when it can be done (helpline once a number is set; blood banks when the
   district has any with a public number).

Also: a practice request lists practice blood banks only, so nobody practising calls a real blood bank.
**Recommendation:** keep as built. **Decision 2026-11-28 (developer): keep.** Status: ✅ decided

### Q-025 · 2026-11-28 · P1 · Sign-up limit S-25: how "network" is measured, and a risk at blood drives
Built (slice 15): `profiles.completeOnboarding` allows `signupsPerDevicePerHour` (S-25, default 5) new profiles per
network per hour, then `ERR_RATE_LIMITED {minutes}`, with the helpline button under the message (D-R3).
1. **How the network is known.** A Convex mutation cannot see the caller's address, so the key is the address
   Better Auth stored on the person's session at sign-in (same Cloudflare header as `GET /public/helpline`), hashed.
   A session without an address is not limited — one shared bucket would lock out everyone at once.
2. **Risk.** Mobile operators often put many customers behind one shared public address, and a blood drive puts a
   whole hall on one Wi-Fi. At 5 an hour, real people at a drive could be told to wait.
   - **Option A (recommended):** keep 5 as specified; operations raise S-25 (allowed up to 50) with
     `internal.admin.ops.setSetting` before a drive, and lower it again after.
   - **Option B:** raise the default now (e.g. to 20).
3. **"Posting rate limit" (roadmap F-802).** No number is written for it anywhere, so nothing new was invented:
   posting is bounded by S-22 (1 / 2 open requests, 5 a month), already enforced in `requests.create`.

**Recommendation:** A. **Decision 2026-11-28 (developer): A.** Status: ✅ decided

### Q-026 · 2026-11-28 · P1 · Code review of PR #3: practice accounts and the hospital list (please confirm)
The review found that a practice account (made with `internal.admin.ops.setDemo`, as in the go-live smoke test)
could never post at a listed hospital: the list showed real hospitals, and a practice request may only name a
practice one (`ERR_DEMO_ISOLATION`). Fixed: `hospitals.search` now shows a signed-in practice account the practice
hospitals only (specs SCR-A09: "UDVASITO Practice Hospital", a `hospitals` row with `isDemo: true`), and
everyone else the real ones — the same rule as the "no donors yet" blood-bank list. Isolation is stricter, not
looser: real and practice rows still never meet. Until a practice hospital exists, a practice account uses "My place
isn't in the list".

**Recommendation:** keep. **Decision 2026-11-28 (developer): keep.** Status: ✅ decided
