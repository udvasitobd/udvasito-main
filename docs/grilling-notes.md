# grilling-notes.md — UDVASITO (উদ্ভাসিত)

> **Status:** ✅ **APPROVED v1.1** (2026-11-23) — Step 3 of 8 (SpecPilot). 27 gaps resolved; confirmations C1–C5 accepted by the team; `user-stories.md` v1.1 and `vision.md` v1.2 approved with them.
> **Naming note (v1.1, 2026-11-23):** this file is the historical record of the grilling, so its wording is kept. Since Step 7, the "demo area" it mentions is called the **practice area** — part of the live platform, with real phones and real numbers (vision principle 10, D12) — and "demo day" means **judging day**.
> **Last updated:** 2026-11-23
> **Depends on:** `vision.md` v1.1, `user-stories.md` v1.0 (both APPROVED).
> **What happens next:** the team answers every question (own answer, or "Default"). SpecPilot then lists every gap found (§4), updates `user-stories.md` (§5) and any other affected document, and asks for APPROVED.

---

## 1. Who is asking

For this step SpecPilot plays three hostile reviewers. They are rude to the **plan**, not to the team.

| Voice | Cares about |
|---|---|
| 🔧 **Skeptical staff engineer** | Scaling, free-tier ceilings, failure states, slow devices, race conditions, a single developer |
| 🛡 **Security & privacy expert** | Abuse, scraping, scams, insider threats, Bangladeshi data-protection law, AI-provider terms, payments |
| 😤 **Difficult customer** | Panic, low literacy, wrong assumptions, edge cases, broken promises, demo-day honesty |

## 2. How to answer

For each question reply with **"Default"** (accept the SpecPilot proposal under it), **your own answer**, or **"Not sure — decide later"** (it becomes an Open Question in the PRD). Shortcut: *"Default for all except G-03, G-17: …"*.

---

## 3. The 20 questions

### G-01 · 🔧 The ৳0 phone-verification fantasy
**Question:** You want the phone verified once at first login, with a ৳0 budget. Nobody sends SMS codes for free. The free routes (user sends a message from their own WhatsApp/Telegram) make a panicking first-timer leave your app mid-emergency; Google sign-in verifies an email, not a phone. At 11 pm Rahima opens a shared link for the first time — **how many seconds until her request is live?** And when the verification route breaks on demo day, what then?
**Failure scenario:** a first-time requester abandons at the verification screen; or a verification outage blocks *every* new request.
**Stories:** X01, R01, D01 · **Conflicts with:** principle 0 (speed first) vs D5/D10 (verify once at first login).
**Default:** **Post first, verify in parallel.** A first-timer signs in with one tap (Google) or an email code, posts immediately, and donors are notified at once. Phone verification (free method chosen in Step 5) is prompted *while donors are being notified*. Until verified, the account has stricter limits: 1 open request, and donors are shown "phone not yet verified". Donor profiles require a verified phone. If the verification route is down, posting still works.

### G-02 · 🔧 Push notifications are your whole product — and they're unreliable
**Question:** Your 60-second promise rests on push. Many phones popular in Bangladesh aggressively kill background apps and delay notifications; browsers need explicit permission; on iPhone, web push works only for an installed home-screen app. **When a push doesn't arrive, what is the backup — at ৳0?**
**Failure scenario:** 10 donors "notified", 0 actually saw it; the requester is told help is coming while nothing happens.
**Stories:** R04, R05, D02, X07.
**Default:** (1) High-priority Android notification channel; (2) a one-time onboarding step showing donors how to allow notifications and turn off battery optimisation for UDVASITO on their phone brand; (3) "Requests for me" is always shown on app open; (4) a free secondary channel (email) for donors who opt in; (5) we measure *delivered/opened*, not just *sent*, and waves widen based on real opens; (6) volunteer escalation stays the human backup.

### G-03 · 🔧 Free tiers have ceilings — which one breaks first?
**Question:** Every service you use has free-tier limits (function calls, bandwidth, storage, build minutes, AI requests per day; some free projects pause when idle, some free plans restrict usage type). **A Facebook post goes viral and 5,000 people sign up in an hour. Which limit breaks first, and what does the user see?**
**Failure scenario:** the backend hits its quota at 9 pm on a dengue-peak night and the request path dies.
**Stories:** X03, A04, all.
**Default:** Step 5 produces a **free-tier budget table** (each service's limits, our expected use, the breaking point, what degrades). Degradation order is fixed: AI features first → images → non-essential pages → **never the request → match → notify → accept path**. Admin dashboard shows usage vs limits. Sign-up throttling (X06) protects the core. Anything that pauses when idle gets a scheduled keep-alive.

### G-04 · 🔧 "Nearby" — measured how?
**Question:** Donors type "Muradpur", "CU campus", "Hathazari road"; requesters type hospital names three different ways; Chattogram traffic turns 5 km into an hour. **Do you collect GPS (a privacy risk) or areas? How do you rank a donor in Hathazari against one in Panchlaish for a request at Chittagong Medical College Hospital?**
**Failure scenario:** "nearby" donors are actually 2 hours away; or you store live locations of thousands of students.
**Stories:** R04, D01, A08.
**Default:** **No GPS stored.** Donors pick their area from a list (division → district → upazila/thana, plus an optional "area" from a curated list); "use my location once" only fills in the area. Hospitals come from a curated list with coordinates. Ranking: same thana → neighbouring thanas (by centre-point distance) → same district → wider. Donors can set "I can travel to: my thana / my district". No live tracking.

### G-05 · 🔧 2G in a hospital basement
**Question:** Rahima is on a weak signal. She taps Post twice — **two requests?** She closes the app mid-send — **was it sent?** A donor taps "I can help" on a dropping connection — **did it register, or did he drive there for nothing?**
**Failure scenario:** duplicate requests, lost requests, phantom acceptances.
**Stories:** X03, R01, D03.
**Default:** Every create/accept action carries a device-generated ID so the server ignores repeats (idempotent). Unsent actions wait in an on-device outbox and are retried automatically, with clear states: *Saving… / Sent ✓ / Waiting for network*. Live updates fall back to refreshing every 15 s when real-time drops.

### G-06 · 🔧 Seven donors, two bags
**Question:** A request needs 2 units. Seven donors tap "I can help" within 10 seconds. **Who wins? Do all seven get the requester's number (mutual reveal!)? Do five drive to the hospital for nothing?**
**Failure scenario:** contact over-sharing and wasted donor trips — donors stop trusting the app.
**Stories:** D03, R07, R06.
**Default:** Acceptance is decided on the server, first come first served. The first **units + 1** donors are *confirmed* (the +1 is a backup) and only they exchange numbers. Everyone else sees "Thank you — already covered. You're on standby"; they're promoted automatically if a confirmed donor withdraws or doesn't respond (G-18).

### G-07 · 🔧 One codebase, two platforms, 15 days, one vibe coder
**Question:** Expo for Android *and* web: speech-to-text, notifications, installability and background behaviour all differ between native and browser. Android builds go through a build queue. **Which features are allowed to differ by platform? What is the minimum Android version? Who tests on a real 2 GB phone and with a screen reader (TalkBack) — every day?**
**Failure scenario:** the web demo works, the APK crashes on a judge's old phone; voice input silently missing on iPhone.
**Stories:** R02, X03, X04, X07.
**Default:** A **platform parity table** in `specs.md` lists every feature per platform (e.g. voice: Android app + Chrome; iPhone PWA may fall back to typing). Minimum Android version set in Step 5 from Expo's current support. Team member 3 tests every build on a real low-end Android phone and with TalkBack, using a written checklist.

### G-08 · 🔧 A single developer is a single point of failure
**Question:** You're the only developer and you can't read most of the generated code. **On day 10, an AI-generated migration wipes production data. Where are the backups? How do you roll back? Is there a staging environment? What stops a broken build from reaching users?**
**Failure scenario:** real donors' data lost or corrupted days before the demo.
**Stories:** all.
**Default:** Two environments (**staging** and **production**), both free. Every change goes to staging first; production deploys only from the main branch after automated tests pass. Each build phase ships its own tests (matching rules, access rules, AI redaction, idempotency). Daily automated data export kept off the platform. Demo/seed scripts can run **only** on staging.

### G-09 · 🛡 Request-farming: your donors will build the directory you refused to publish
**Question:** I'm a scammer. I post 50 fake requests across all blood groups. Every donor who accepts hands me their number via mutual reveal. **In a week I've rebuilt the phone directory you promised not to publish. How do you stop it?**
**Failure scenario:** donor numbers harvested and sold; donors harassed; trust destroyed.
**Stories:** R07, D07, D08, X06, A02.
**Default:** (1) Limits: 1 open request for unverified accounts, 2 for verified, at most 5 per month *(proposed)*. (2) Automatic flags for patterns (many groups / many hospitals / many reveals / requests never closed). (3) Donors see the requester's track record before accepting ("member since, requests posted, donations confirmed, verified slip yes/no"). (4) Contact reveal only for confirmed donors (G-06) and only during the request's lifetime. (5) One report of "fake request" from a confirmed donor freezes further reveals on that request pending review.

### G-10 · 🛡 Money scams and the safety of women donors
**Question:** The most common blood-request scam is "please send bKash for transport / blood-bank fees". And mutual reveal hands a woman donor's number to a stranger at night. **What is your safety design — especially for women donors?**
**Failure scenario:** a donor is defrauded or harassed through UDVASITO; the story goes viral for the wrong reasons.
**Stories:** D07, D08, R07, A02.
**Default:** (1) A safety card at every reveal: "UDVASITO never asks for money. Never send money to anyone for blood." (2) "Asked for money" report → immediate freeze of the account pending review. (3) **New donor privacy option: "Don't share my number — I'll call them."** The donor sees the requester's number; the requester sees only "the donor will call you". (Mutual reveal stays the default; this is an opt-out.) (4) Donors can limit requests to "verified requests only" (slip-checked).

### G-11 · 🛡 Health data under Bangladesh's new data-protection law
**Question:** Blood group and donation history are health data. Bangladesh's Personal Data Protection Ordinance 2025 (gazetted Nov 2025, amended Feb 2026) treats health data as **sensitive** with heightened safeguards. **Who is the legally responsible party — a student? Where is the privacy notice, the lawful basis, the process for access/correction/deletion requests, the breach plan? Can you store this on servers outside Bangladesh?**
**Failure scenario:** a complaint or a breach, and nobody can say who is responsible or what was promised.
**Stories:** D07, X01, A03.
**Default:** (1) Name a **data-protection lead** (team member 4). (2) Bilingual privacy notice + explicit consent at sign-up and donor opt-in. (3) Data minimisation: no national ID, no exact address, no live location, DOB only for age/eligibility. (4) In-app access/download/delete (D07) with deletion within 30 days *(proposed)*. (5) A one-page breach-response plan. (6) Before public launch, ask a University of Chittagong law-faculty teacher to review the privacy notice. Current reporting says the Feb 2026 amendment limits mandatory in-country storage to critical information infrastructure and "restricted" data, and the government describes a cloud-first approach — so hosting abroad is *likely* acceptable for a pilot, **to be confirmed by that review** (this is not legal advice).

### G-12 · 🛡 Your AI-redaction promise is already broken
**Question:** You promised "0 personal data to the free-tier AI". A pasted Facebook post reads: *"রোগী: আমেনা বেগম, ৬৫, কিডনি ডায়ালাইসিস, যোগাযোগ: রফিক ০১৭১১-xxxxxx"*. Your code strips the phone number — **the patient's name, age and diagnosis still go to the free tier, where human reviewers may read them.** G5 is false on day one. What now?
**Failure scenario:** the "Responsible AI" judge asks exactly this and you have no answer.
**Stories:** R02, R03, V04, X05, G5.
**Default:** **Rules first, AI second.** A deterministic Bangla/Banglish/English parser runs first on the device: blood groups ("B+", "বি পজিটিভ", "b pos"), units ("২ ব্যাগ"), dates ("আজ", "কাল রাতে"), hospital names (fuzzy match against the hospital list), phone numbers. It removes phone numbers, anything after labels like "রোগী/নাম/Patient/Name", and known diagnosis words. **Only if fields are still missing** does the redacted text go to AI, after a visible notice ("parts of your text will be processed by an AI service — don't include names"). G5 is reworded honestly: "phone numbers and labelled names/diagnoses removed before any AI call; users warned; AI inputs logged in redacted form for review". The rules parser also works offline and saves quota.

### G-13 · 🛡 The AI provider's own terms
**Question:** The Gemini terms we reviewed bar apps likely used by under-18s and bar medical advice. Your "Can I donate?" assistant will get *"I have diabetes and take insulin, can I donate?"* — **that is a request for medical advice.** And a 16-year-old college student opening your Facebook link meets an age gate that is just a checkbox. **Are you in breach on day one?**
**Failure scenario:** API key suspended mid-competition; reputational hit in the "Responsible AI" criterion.
**Stories:** D10, X01, X05.
**Default:** (1) The assistant becomes **FAQ retrieval**: AI only picks and rephrases team-approved FAQ entries; any personal-health question gets a fixed "please ask a doctor or the blood bank" reply. If that still feels risky, D10 runs **without AI** (FAQ search only). (2) Date of birth is required at sign-up (not a checkbox); under-18s cannot create accounts and are shown a friendly explanation. (3) Current terms re-checked in Step 5.

### G-14 · 🛡 The insider with an admin login
**Question:** A volunteer is promoted to admin. One night she copies 2,000 donor numbers for a coaching centre's SMS campaign. **How would you even know?**
**Failure scenario:** the largest privacy breach comes from inside, through the admin panel.
**Stories:** A01–A07, A03.
**Default:** Least privilege. Volunteers **never** see donor numbers. Admins see a donor's number only by pressing "Reveal" with a typed reason — logged in the audit log. Bulk exports of personal data are limited to the super-admin (the developer), logged and rate-limited; normal exports are anonymised. A weekly audit-log review is part of the ops checklist. Unusual reveal volumes trigger a flag.

### G-15 · 🛡 Payments: fake transaction IDs and a student's personal bKash
**Question:** The manual bKash/Nagad flow: **I paste a fake or someone else's transaction ID; your admin "confirms" by eyeballing. And whose number receives the money — a student's personal account?** That's how charity money disappears and how public-voting goodwill dies.
**Failure scenario:** a funding scandal during or after the competition.
**Stories:** S01–S03 (later phase F3).
**Default:** **F3 stays out of the 15–20-day build and out of the demo.** When built later: an account owned by the organisation (not a personal number), every transaction ID checked against the account statement by two people, a public ledger, and a monthly published statement. The roadmap mentions it only as a future step.

### G-16 · 😤 "I don't know the exact group" and "any group will do"
**Question:** Families often don't know the exact group, write "B pos", "বি+", "O neg", or are told by the hospital blood bank to **bring any-group replacement donors** in exchange for matched blood. **Your form demands one exact blood group. What do they choose?**
**Failure scenario:** the request is posted with a wrong group, or not posted at all.
**Stories:** R01, R03, R04.
**Default:** The blood-group field offers the 8 groups **plus "Not sure"** and **"Any group (replacement donor for the blood bank)"**. "Any group" matches any eligible donor nearby and is clearly labelled to donors. "Not sure" posts the request but prompts "ask the ward/blood bank and update" and notifies volunteers rather than donors. The rules parser understands common spellings.

### G-17 · 😤 English by default — for Rahima?
**Question:** Your primary persona reads Bangla, types slowly and is panicking. You chose English as the default. **She taps a shared link, sees English, and closes it.** Why is English the default for a Bangladeshi emergency app?
**Failure scenario:** the people who need it most bounce on the first screen.
**Stories:** X02, P02.
**Default (compromise, keeps your decision):** English stays the default for new devices, **but** (1) if the phone or browser language is Bangla, the app opens in Bangla; (2) a shared request link opens in the language it was shared in; (3) the first screen shows a large "বাংলা / English" choice. You decide: keep pure English default, or accept this compromise.

### G-18 · 😤 The donor who accepts and disappears
**Question:** A donor accepts at 11:05 pm, then switches off his phone. Other donors were told "already covered". **The family waits until morning. What is your no-show handling?**
**Failure scenario:** the app makes things *worse* than calling around.
**Stories:** D04, R06, R05.
**Default:** (1) 30 minutes after accepting (or 1 hour before needed-by, whichever is first) the confirmed donor gets "Still coming?" — Yes / Can't make it. (2) No answer in 15 minutes, or the requester taps "Donor not responding" → that slot is released, the standby donor is promoted, and matching restarts immediately. (3) Repeated no-shows quietly lower a donor's ranking (rules, visible to admins); no public shaming.

### G-19 · 😤 Your impact numbers will be empty or fake
**Question:** G2 depends on people answering "Did the donation happen?" 24 hours later. **They won't.** And if a requester's "Yes" sets the donor's cooldown, a malicious requester can mark donors as "donated" and knock them out of the pool. **In front of the judges your impact numbers will be either fake or empty.**
**Failure scenario:** the "honest impact" differentiator collapses.
**Stories:** R09, D06, A01.
**Default:** (1) **Only the donor's own confirmation** sets their cooldown. (2) Funnel shows three levels honestly: *contact shared* → *reported by requester* → *confirmed by donor*. (3) Prompts by push **and** as a card on next app open, plus one reminder. (4) The dashboard shows the response rate next to the numbers, so judges see the honesty.

### G-20 · 😤 Demo day with 50 donors — honest *and* reliable?
**Question:** On demo day you'll have maybe 50–100 donors, most on one campus. A judge posts **O− at Chattogram General Hospital at 3 pm: zero matches.** Or you fill the database with fake donors — and the judge notices fake numbers, and your Ethics score tanks. **How do you demo honestly *and* reliably?**
**Failure scenario:** a dead demo, or a dishonest one.
**Stories:** demo-day acceptance test (`vision.md` §4), A01, P01.
**Default:** (1) A clearly labelled **Demo area** with test accounts (team members acting as donors on real phones) — fully separated from real data and **never counted** in public numbers. (2) Real pilot numbers shown separately and labelled "live pilot". (3) Pre-installed demo phones with notifications already allowed; venue network checked beforehand; recorded fallback video. (4) Say it out loud to the judges: "This is the demo area; these are the real pilot numbers."

---

## 4. Gaps found

Every gap below comes from a question (G-xx) or from the team's answer to it. "NEW" marks gaps that the team's answers themselves created — these were not in the original questions.

| # | Source | Gap | Resolution | Changed |
|---|---|---|---|---|
| GAP-01 | G-01 | A ৳0 phone check before posting would stall a panicking first-timer; SMS codes are not free | **Post first, verify in parallel.** One-tap sign-in, post immediately; phone verification prompted while donors are notified. Unverified: 1 open request, "phone not yet verified" shown to donors. Donors and volunteers must verify before going live | X01, R01, D01, V01; vision D5, D10 |
| GAP-02 | G-02 | Push can fail silently on many Android phones and browsers | High-priority channel; one-time "make sure alerts reach you" guide per phone brand; "Requests for me" on every app open; optional email copy; waves widen on real **opens**, not sends | D02, R05 |
| GAP-03 | G-02 answer | No human in the loop until the final wave | **On-duty volunteers notified at second 0; an on-duty volunteer's number shown to the requester if no donor accepts within 30 s** | V09 (new); V01, V02, V03 → Must; vision differentiator #5 |
| GAP-04 | G-02 answer — **NEW, conflict** | "Volunteer checks the database and finds donors" contradicts G-14 ("volunteers never see donor numbers") and the no-directory vision | Volunteers **search the donor pool from inside a request without seeing numbers** and tap "Ask this donor" (direct alert); donors may opt in to "volunteers may call me directly" | V10 (new) — **confirmed C1** |
| GAP-05 | G-02 answer — NEW | Volunteer numbers exposed to strangers; who covers 2 am? | On-duty / off-duty toggle; at most 2 numbers shown, least-busy rotation, only while the request is open; volunteers can report/block; if nobody is on duty → team fallback contact + blood-bank list; coverage-by-hour on the dashboard | V09, R10, A01 |
| GAP-06 | G-03 | Nobody would know a free limit is about to break | **Free-tier usage monitor** with 70 % / 90 % warnings; fixed degradation order (AI → images → non-essential pages; never the request path); free-tier budget table in Step 5 | A13 (new); vision budget row |
| GAP-07 | G-04 | "Nearby" undefined; GPS is a privacy risk | Area-based ranking (thana → neighbouring thanas → district); donors' "I can travel to" setting; GPS only to pick a place | R01, R04, D01 |
| GAP-08 | G-04 answer — NEW | "GPS not stored" vs. a request's place must be stored for matching | Store **the chosen place** (hospital, or area with an approximate point) — never a person's live position or history | R01, D01 |
| GAP-09 | G-04 / G-11 answer — NEW | "All permissions at first open": phones and browsers generally show permission pop-ups when a feature is used, and a wall of pop-ups slows an emergency | **One consent screen** listing terms, privacy, AI processing and every permission with its reason + one tick "I'm 18+ and I agree"; each OS pop-up appears when its feature is first used | X08 (new) — **confirmed C3** |
| GAP-10 | G-05 | Double taps and weak signal create duplicate or lost requests/acceptances | Device-generated IDs (repeats ignored), on-device outbox, visible send states, 15 s refresh fallback | R01, D03, X03 |
| GAP-11 | G-06 | Seven acceptances for two bags; over-sharing numbers | Server decides: first **units + 1** confirmed (one backup); others on standby, auto-promoted | R07, D03 |
| GAP-12 | G-07 | Platform differences and no real-device testing | Platform parity table (specs); min Android version (ADR); QA on a real low-end phone + TalkBack every build | X04; NFR-05, NFR-06, NFR-12 |
| GAP-13 | G-08 | One developer, no staging, no backups, no tests | Staging + production; deploy from main after tests; tests per phase; daily export; seed scripts staging-only | NFR-01–NFR-04 |
| GAP-14 | G-09 | Scammers can harvest donor numbers through fake requests | Request limits; pattern flags; requester track record shown to donors; reveal only to confirmed donors during the request; a confirmed donor's "fake" report freezes reveals | X06, D02, D08, A02 |
| GAP-15 | G-10 | "Send bKash" scams; women donors' safety | Safety card at every reveal; "asked for money" freezes the account; **"Don't share my number — I'll call them"**; "verified requests only" filter | D16 (new); R07, D04, D08, D09 |
| GAP-16 | G-11 | Health data under the PDPO 2025: no responsible person, notice, rights process or breach plan | Data-protection lead (team member 4); bilingual notice; consent at first open + separate donor consent; minimisation; deletion within 30 days; breach plan; law-faculty review before public launch | X08, D01, D07; NFR-08, NFR-10 |
| GAP-17 | G-12 answer — **NEW, conflict** | Listing AI processing in the consent screen does not override Google's free-tier terms, which say not to submit personal information | AI still extracts the fields (team decision), but **code redaction runs before every AI call** (phone numbers, labelled names, diagnosis words) + disclosure on the consent screen and under the text box; G5 reworded honestly | R03, X08; vision G5, §6, principle 3 — **confirmed C2** |
| GAP-18 | G-13 | The assistant could give medical advice; age gate was a checkbox | FAQ retrieval only (or no AI); date of birth required; under-18s blocked | D10, X01 |
| GAP-19 | G-14 | An insider could copy thousands of numbers | Numbers hidden even from admins; "Reveal" with a reason, logged; personal-data exports super-admin only; reveal-volume flags | A14 (new); A02, A03, A07 |
| GAP-20 | G-15 | Fake transaction IDs; money in a personal account | F3 excluded from the build and demo; future rules recorded | S01; vision F3 |
| GAP-21 | G-16 | Families don't know the group or need any-group replacement donors | "Not sure" (→ volunteers) and "Any group" options; parser understands common spellings | R01, R03, R04, V02 |
| GAP-22 | G-17 | English default may lose Bangla-reading users on the first screen | English default, but Bangla on Bangla-language devices, shared links keep their language, big chooser on first screen | X02; vision principle 6 |
| GAP-23 | G-18 answer | Donor no-show; team asked for shorter times | "Still coming?" 10 min after confirmation ("Now") / 20 min (other) and 30 min before needed-by; no answer in 5 min → standby confirmed too (original not removed); "Donor not responding" button | D04, R06 — **confirmed C4** |
| GAP-24 | G-19 | Confirmations go unanswered; a requester could knock donors out of the pool | Only the donor's confirmation sets cooldown; honest funnel levels; response rate shown; push + in-app card + one reminder | R09, A01 |
| GAP-25 | G-20 answer — **NEW** | 300–400 real donors does not make a live demo safe: a judge's test request would alert real people | **Demo area** fully separated from real donors and real numbers | A15 (new); vision G3, demo test — **confirmed C5** |
| GAP-26 | G-20 answer — NEW | Collecting 300–400 donors in 15–20 days needs registration live within the first days | **Roadmap dependency:** the first phase must ship consent, sign-in, phone verification and the donor profile so recruitment can start early; campus QR (V07) recommended | Step 7 input |
| GAP-27 | All answers — NEW | Must stories grew from 29 to 40 for one developer | Step 7 orders them ruthlessly: a walking skeleton (post → match → notify → accept → contact) goes live first; everything else layers on | Step 7 input |

### 4.1 Requirements that are not user stories (go into `PRD.md` / `specs.md`)

| ID | Requirement | From |
|---|---|---|
| NFR-01 | Separate **staging** and **production** environments; production deploys only from the main branch after automated tests pass | G-08 |
| NFR-02 | Every build phase ships automated tests for its rules: matching, access control, AI redaction, idempotency | G-08 |
| NFR-03 | Daily automated data export, stored outside the platform | G-08 |
| NFR-04 | Seed and demo scripts can run only on staging; no debug code paths in production | G-08, vision |
| NFR-05 | Platform parity table (Android app / Android browser / iPhone PWA / desktop) for every feature | G-07 |
| NFR-06 | QA checklist run on every build on a real low-end Android phone and with TalkBack | G-07 |
| NFR-07 | Free-tier budget table per service with breaking points and the degradation order | G-03 → Step 5 |
| NFR-08 | Named data-protection lead; one-page breach-response plan; privacy notice reviewed by a law-faculty teacher before public launch | G-11 |
| NFR-09 | Idempotent writes and an on-device outbox for create/accept actions | G-05 |
| NFR-10 | Consent records are versioned (which terms version, when) | G-11, X08 |
| NFR-11 | Re-check the AI provider's current terms before building AI features | G-13 → Step 5 |
| NFR-12 | Minimum Android version set from Expo's current support | G-07 → Step 5 |

---

## 5. Updates to user stories (`user-stories.md` v1.1) and the vision (`vision.md` v1.2)

### 5.1 User stories
- **New Must stories (7):** D16 "Don't share my number — I'll call them", V09 on-duty volunteer within 30 s, V10 find donors without seeing numbers, A13 free-tier usage monitor, A14 donor numbers only with a reason, A15 demo area, X08 consent & permissions screen.
- **Promoted Should → Must (4):** V01 apply to volunteer, V02 request board, V03 escalation alerts, A05 approve volunteers & manage roles.
- **Rewritten (30 stories):** R01, R03–R07, R09, R10, D01–D04, D07–D10, V01–V03, A01–A03, A05, A07, S01, X01–X04, X06.
- **Also updated:** roles table, core journey, coverage check, assumptions.
- **Totals now:** 76 stories — **40 Must**, 23 Should, 13 Nice.

### 5.2 Vision (v1.2)
Post first / verify in parallel (D5, D10); "A human within 30 seconds" added as a differentiator; budget row mentions the usage monitor; pre-demo target raised to **300 real donors (stretch 400)**; demo test runs in the demo area; G5, §6 and principle 3 reworded for honest AI redaction; date of birth at sign-up; language auto-detect; F3 excluded from the build.

### 5.3 Confirmations (all ✅ accepted 2026-11-23)

Where an answer conflicted with another answer, with a provider's rules, or left a number open, SpecPilot proposed a resolution. The team accepted all five:

| ID | Accepted resolution |
|---|---|
| **C1** | Volunteers find donors **without seeing phone numbers** ("Ask this donor" sends a direct alert). Only donors who opt in to "volunteers may call me directly" can have their number revealed to a volunteer, with a reason, logged |
| **C2** | AI does the extraction, as you decided, **but code always strips phone numbers, labelled names and diagnosis words before the AI call** — the consent screen alone can't satisfy Google's free-tier terms |
| **C3** | One consent screen at first open lists **all** permissions with reasons + one tick; the phone's own permission pop-ups appear when each feature is first used |
| **C4** | Shorter no-show times: "Still coming?" 10 min (urgent) / 20 min (other) after confirmation; 5 min to answer; then the standby donor is confirmed too, without removing the first donor |
| **C5** | Keep a separated **demo area** for judges, in addition to your 300–400 real donors, so test requests never reach real people |

---

## 6. Your answers (2026-11-23)

| ID | Topic | Answer |
|---|---|---|
| G-01 | Verification vs speed | Default |
| G-02 | Push reliability | Default **+** volunteers notified of every request immediately; if no response within 30 s, a volunteer's number is shown to the requester (they chose to volunteer); the volunteer then checks the database to find donors |
| G-03 | Free-tier ceilings | Default **+** the admin panel shows everything, so the team knows when to buy a subscription |
| G-04 | Location matching | GPS not stored, but GPS must be integrated in the app and web app so the requester can share where blood is needed, and can also pick an area. All permissions shown at first open so users read and agree to terms and permissions |
| G-05 | Weak network / duplicates | Default |
| G-06 | Too many acceptances | Default |
| G-07 | Platform parity & testing | Default ("time isn't an issue") |
| G-08 | Backups, staging, tests | Default |
| G-09 | Request-farming | Default |
| G-10 | Scams & women donors' safety | Default |
| G-11 | Data-protection law | Default **+** all users read and accept terms, conditions and permissions with a consent tick before using the app |
| G-12 | AI redaction | AI will check; AI processing will be in the permissions list |
| G-13 | AI provider terms | Default |
| G-14 | Insider threat | Default |
| G-15 | Payments | Default |
| G-16 | Unknown / any blood group | Default |
| G-17 | Default language | Default |
| G-18 | Donor no-show | Default, but with shorter times |
| G-19 | Honest confirmations | Default |
| G-20 | Demo-day honesty | The team will collect at least 300–400 donors before the demo |

---

## 7. Sources (for G-11, G-13)

- Personal Data Protection Ordinance 2025 — sensitive data includes health: https://www.jagonews24.com/en/national/news/86241
- Gazetted November 2025: https://www.thedailystar.net/news/data-frontiers-where-does-bangladesh-fit-the-global-privacy-debate-4085556
- Feb 2026 amendment narrows localisation to CII and restricted data: https://online-d11.thedailystar.net/news/govt-eases-data-localisation-rules-4076666 and https://digitalpolicyalert.org/event/38601-president-implemented-personal-data-protection-amendment-ordinance-2026-ordinance-no-23-of-2026
- Government's cloud-first clarification: https://thefinancialexpress.com.bd/national/no-mandatory-data-localisation-in-final-pdpo
- Gemini API Additional Terms (unpaid data use, medical advice, under-18): https://ai.google.dev/gemini-api/terms-archive/terms_10_07_25

---

## 8. Change log

| Version | Date | Change |
|---|---|---|
| 0.1 | 2026-11-23 | 20 grilling questions with SpecPilot defaults; waiting for team answers |
| 0.2 | 2026-11-23 | Team answers recorded; 27 gaps listed and resolved (8 created by the answers themselves); 12 non-story requirements; `user-stories.md` v1.1 and `vision.md` v1.2 updated; 5 confirmations requested |
| 1.0 | 2026-11-23 | **Approved.** C1–C5 accepted |
| 1.1 | 2026-11-23 | Naming note only: demo area → practice area, demo day → judging day (no decision changed) |
