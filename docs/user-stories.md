# user-stories.md — UDVASITO (উদ্ভাসিত)

> **Status:** ✅ **APPROVED v1.3** (2026-11-23) — Steps 2–3 of 8 (SpecPilot); v1.2 = wording synced with `ADRs.md`; v1.3 = Step 7 decisions (in-person verification, practice area). v1.1 includes all grilling decisions (G-01–G-20, C1–C5). Every change is logged in §10 and explained in `grilling-notes.md`.
> **Last updated:** 2026-11-23
> **Depends on:** `vision.md` v1.0 (APPROVED). Every story must stay consistent with it — especially principle 0 (speed first), privacy by default, rules decide / AI assists, no personal data to free-tier AI, 18+ only, ৳0 budget.
> **For the AI coding agent:** stories describe *what* and *why*. Exact screens, copy, data fields and APIs come later in `specs.md`. Numbers marked *(proposed)* are defaults to be confirmed in `PRD.md`; never hard-code them — they become admin-editable settings.

---

## 1. How to read this file

- **Format:** `As a [persona], I want to [action], so that [benefit].`
- **ID:** `US-<persona letter><number>` — R requester, D donor, V volunteer, A admin, P public visitor, S supporter, B partner organisation, X everyone (cross-cutting).
- **Priority (MoSCoW):**
  - **Must** — required for the judging-day loop, safety or the judging criteria. Release: **v1 core**.
  - **Should** — important; built in v1 if time allows after all Musts work. Release: **v1 if time**.
  - **Nice** — valuable later. Release: **Later**.
- **Goal:** which success goal from `vision.md` §4 the story serves (G1 speed, G2 real impact, G3 participation, G4 accessibility, G5 trust & safety).
- **AC:** short acceptance criteria — how we know the story is done.

---

## 2. Roles and accounts (confirmed — Q2)

| Role | Who | Can do |
|---|---|---|
| **Member** | Every signed-in person (18+, date of birth given, consent recorded) | Post and manage their own requests (immediately — phone verification runs in parallel, G-01). Optionally switch on a **donor profile** (needs a verified phone) — the same account can request and donate |
| **Volunteer** | Members who applied, consented to their number being shown while on duty, and were approved by an admin | Everything a member can, plus: on-duty hotline (their number shown to requesters in their area — V09), the request board, searching donors for a request **without seeing numbers** and asking them directly (V10), escalations, posting on behalf of families, slip checks, duplicate merging, first-line moderation |
| **Admin** | Team operations member(s) and the developer (super-admin) | Everything, plus dashboard, moderation decisions, roles and volunteer approval, settings, AI controls, usage monitor, practice area, imports/exports, audit log. Donor numbers are hidden even from admins unless revealed with a reason (A14); personal-data exports are super-admin only |
| **Visitor** | Anyone, not signed in | Public impact page, education pages, anonymised shared request links |

---

## 3. Personas

### P1 — Requester: **Rahima Akter**, 38, Chattogram
- **Situation:** Her father was admitted to Chittagong Medical College Hospital after a road accident. At 11 pm the doctor says he needs **2 bags of B+ by tomorrow morning**.
- **Device & context:** 3-year-old budget Android (2–3 GB RAM), prepaid mobile data that often runs low, standing in a crowded ward corridor.
- **Language:** Bangla first; reads Banglish; types slowly; comfortable sending voice messages.
- **Goals:** reach a willing, eligible donor *now*; stop calling dead numbers.
- **Frustrations:** Facebook posts ignored or copied wrongly; people who say yes then disappear; strangers asking for money "for blood".
- **Quote:** *"আমার হাতে সময় নেই — শুধু বলুন কে আসবে।"* ("I have no time — just tell me who will come.")
- **Variants:**
  - **First-time user in a panic** (has never heard of UDVASITO; arrives via a shared link).
  - **Attendant** posting for a neighbour or colleague's family.
  - **Recurring requester** — mother of a child with thalassaemia who needs a transfusion every few weeks.

### P2 — Donor: **Tanvir Hasan**, 21, University of Chittagong student (O+)
- **Situation:** Wants to help, has donated once. Lives near campus; exams and part-time tuition make him busy.
- **Device:** Mid-range Android; uses WhatsApp and Messenger daily.
- **Goals:** help when he truly can; get credit for it; not be spammed.
- **Frustrations:** In v0-style directories his number was public — he got calls at 2 am and calls from people who were not genuine.
- **Quote:** *"I'll come if I can — just don't give my number to everyone."*
- **Variants:**
  - **Rare-group donor — Farzana, 24, O−:** gets far more requests than others; risks burnout; needs limits.
  - **Experienced public donor — Abdul Karim, 45, businessman in Agrabad:** has donated 20+ times, not tech-savvy, prefers Bangla and large text.

### P3 — Volunteer: **Nusrat Jahan**, 22, campus blood-club coordinator
- **Situation:** Today she runs a Facebook group and a WhatsApp group, copies requests by hand and calls donors from a spreadsheet.
- **Goals:** one shared board; know which requests are stuck; stop duplicate work with other clubs.
- **Frustrations:** the same request posted five times with different numbers; no idea which ones are already solved.

### P4 — Admin: **Operations team member** (and the developer as super-admin)
- **Goals:** keep the network safe and trustworthy with little time; see real numbers for the judges and partners; never touch data they don't need.
- **Frustrations (from v0):** manual approval of every availability change; drifting counters; risky Apps Script sync.

### P5 — Visitor / judge: **Dr. Imran**, competition judge (also any member of the public)
- **Goals:** understand the product in two minutes, see that it works and is safe, see real impact numbers.

### P6 — Supporter: **Sadia**, 29, CU alumna working in Dhaka *(later phase F3)*
- **Goals:** give a small amount via bKash/Nagad; see where the money goes.

### P7 — Partner coordinator: **blood-bank / blood-club / hospital staff** *(later phases F1, F2)*
- **Goals:** bring their donors in with consent; post verified requests directly.

---

## 4. Core journey (the judging-day loop)

```
First open → consent & permissions screen (one tick) → one-tap sign-in (date of birth)
   → request: form / Bangla voice / pasted post; place by GPS, hospital list or map pin
   → code removes numbers, names, diagnoses → AI suggests fields → requester confirms
   → request LIVE (phone verification for first-timers runs in parallel)
   → on-duty volunteers of the area notified at once
   → rules pick compatible, eligible, nearby donors → wave 1 notified (≤ 60 s)
   → no donor accepted in 30 s? → requester sees an on-duty volunteer's number
   → volunteer can search the donor pool (no numbers) and "Ask this donor"
   → still nobody? → wave 2, wave 3 (wider) → escalation to all area volunteers
   → first units + 1 donors confirmed → numbers exchanged (or "donor will call you")
   → "Still coming?" checks; standby confirmed if a donor goes silent
   → donation at the hospital → 24 h later "Did it happen?" → donor confirms → cooldown
```

---

## 5. User stories

### 5.1 Requester (R)

**US-R01 · Must · G1 · v1 core — Post a request with a short form**
As a requester, I want to post a blood request by filling in only the essentials, so that donors are notified within a minute.
- AC: Required fields only: blood group, what is needed (whole blood / platelets — R14), units, where, needed-by (Now / Today / Tomorrow / pick date-time), contact number (defaults to my own number).
- AC: Blood group options: the 8 groups, **"Not sure"** and **"Any group (replacement donor for the blood bank)"** (G-16).
- AC: Where: **"Use my current location"** (GPS — G-04) suggests the nearest hospitals from the list and fills the area; or pick a hospital/area from the list; or drop a pin on a map. Only the chosen place is saved (hospital, or area with an approximate point) — **never my live position or location history**.
- AC: Optional fields are collapsed: patient name, ward/bed, note, slip photo.
- AC: A returning user can post in ≤ 60 s; the request goes live immediately on "Post" — nothing waits on AI, phone verification, a slip check or an admin.
- AC: Tapping Post twice or losing the connection never creates two requests or loses one: device-generated request ID, on-device outbox, clear states *Saving… / Sent ✓ / Waiting for network* (G-05).
- AC: The form works fully with AI switched off.

**US-R02 · Must · G1, G4 · v1 core — Speak the request in Bangla**
As a requester, I want to say what I need in Bangla (or English), so that I don't have to type while panicking.
- AC: A microphone button on the request screen uses the phone's or browser's built-in speech recognition (on many Android phones and in Chrome this is Google's speech service, sometimes on-device) for Bangla and English.
- AC: The transcript is shown and editable; AI turns it into form fields, each marked "AI suggested".
- AC: I must review and tap "Post" — nothing is posted automatically.
- AC: UDVASITO never receives or stores audio, and audio never goes to the AI provider — only the text I see and can edit. If speech recognition is not available on the device, the button explains why and the form still works.

**US-R03 · Must · G1 · v1 core — Type or paste a request in my own words**
As a requester, I want to type in Bangla, Banglish or English — or paste a Facebook/WhatsApp post — and have the form filled for me, so that I don't have to understand a form under stress.
- AC: A text box "Describe it in your own words, or paste a post".
- AC: **Before any AI call, code removes** phone numbers, the text after labels such as "রোগী / নাম / Patient / Name", and known diagnosis words (G-12). The AI then extracts the fields (team decision: "AI will check").
- AC: The consent screen (X08) and a one-line notice under the box say my text may be processed by an AI service and ask me not to include names.
- AC: Common spellings are understood: "B+", "বি পজিটিভ", "b pos", "O neg", "২ ব্যাগ", "কাল রাতে" (G-16).
- AC: Fields the AI cannot find stay empty and are highlighted.
- AC: If AI fails or the daily quota is used up, a calm message appears, my text is kept, and I continue with the manual form.

**US-R04 · Must · G1 · v1 core — Right donors notified automatically**
As a requester, I want the right donors to be notified automatically, so that I don't have to call anyone from a list.
- AC: Matching uses deterministic rules only: compatible blood group (exact match first; compatible groups per an editable table), eligible (available, not paused, cooldown passed, 18+), nearby, and each donor's notification limits and settings.
- AC: "Any group" matches any eligible donor nearby and is labelled so to donors; "Not sure" notifies **volunteers, not donors**, and asks me to check with the ward/blood bank and update (G-16).
- AC: Ranking by place: same thana → neighbouring thanas → same district → wider; each donor's "I can travel to" setting is respected (G-04).
- AC: Donors who chose "verified requests only" are skipped unless the request has the verified badge (G-10).
- AC: The first wave is sent ≤ 60 s after posting; **on-duty volunteers of the area are notified at the same moment** (V09).
- AC: I see "N donors notified" — never their names or numbers at this stage.

**US-R05 · Must · G1 · v1 core — Search widens by itself**
As a requester, I want the app to widen the search on its own if nobody answers, so that I don't have to babysit my request.
- AC: If confirmed units < units needed after the wave interval (*proposed:* 5 min for "Now", 15 min otherwise), the next wave goes out to more donors / a wider area. Wave size accounts for how many notified donors actually **opened** the alert, not just how many were sent (G-02).
- AC: After the final wave *(proposed: 3 waves)* the request is escalated to all volunteers of the area (US-V03) and I'm offered the share card (US-R11).
- AC: I'm told in plain words each time the search widens.

**US-R06 · Must · G1 · v1 core — Live status of my request**
As a requester, I want to see live what is happening with my request, so that I know whether help is coming.
- AC: A status screen shows: posted → N notified → N opened → N accepted → units covered; updates in real time, falling back to a refresh every 15 s on weak networks (G-05).
- AC: Shows the on-duty volunteer's name and number as soon as it becomes available (V09).
- AC: A **"Donor not responding"** button next to each confirmed donor: the standby donor is confirmed and matching restarts immediately (G-18).
- AC: Reachable from the home screen and from every notification about the request.

**US-R07 · Must · G1, G5 · v1 core — Contact a confirmed donor in one tap**
As a requester, I want to see a confirmed donor's contact and call or WhatsApp them in one tap, so that we can arrange the donation immediately.
- AC: Only the first **units + 1** donors who accept are *confirmed* (the extra one is a backup); only confirmed donors exchange numbers. Later acceptors are thanked and put on standby (G-06).
- AC: Shown for each confirmed donor: first name, blood group, area/distance, phone, Call and WhatsApp buttons.
- AC: **Mutual reveal (Q1):** at the same moment the donor sees my number. Exception: if the donor chose "Don't share my number — I'll call them" (D16), I see "Your donor will call you" instead.
- AC: A **safety card** appears with every reveal: "UDVASITO never asks for money. Never send money to anyone for blood." (G-10)
- AC: Numbers are visible only to the two people, only for this request, and only until it closes plus a short window *(proposed: 7 days)*.
- AC: Every reveal is recorded (who, when, which request).

**US-R08 · Must · G2 · v1 core — Close or update my request**
As a requester, I want to mark my request as fulfilled, no longer needed, or needing more units, so that donors stop being disturbed.
- AC: One tap for each; donors who were notified but haven't answered get a "no longer needed — thank you" update.
- AC: Requests close automatically after the needed-by time plus a buffer *(proposed: 6 h)*, and I'm asked to confirm the outcome.

**US-R09 · Must · G2 · v1 core — Confirm the donation happened**
As a requester, I want to confirm whether the donation actually happened, so that UDVASITO counts real donations, not just matches.
- AC: 24 h after a contact is shared, both requester and donor are asked "Did the donation happen?" (Yes / No / Not yet) — by push **and** as a card the next time they open the app, plus one reminder (G-19).
- AC: The funnel shows honest levels: posted → notified → accepted → contact shared → **reported by requester** → **confirmed by donor**.
- AC: **Only the donor's own confirmation** sets their last-donation date and starts their cooldown. A requester's "Yes" never changes a donor's status (G-19).

**US-R10 · Must · G4 · v1 core — Honest "no donors yet" guidance**
As a requester, I want to be told honestly when no matching donor is available, so that I can try other options straight away instead of waiting.
- AC: If zero eligible donors exist in range, I'm told immediately — no silent waiting.
- AC: Next steps are shown: the on-duty volunteer's contact (V09) — or, if no volunteer is on duty, the team's fallback contact — plus widen the area, share the appeal card, and nearby blood banks (curated list with phone numbers, Chattogram first).

**US-R11 · Should · G1, G3 · v1 if time — Shareable appeal card and link**
As a requester, I want a ready-made bilingual appeal card and link to share on Facebook and WhatsApp, so that more people see my request.
- AC: Card shows blood group, units, hospital, area, needed-by and a link to the request; **no phone numbers** unless I explicitly add mine.
- AC: AI can polish the text; a fixed template is used when AI is off.
- AC: Shared through the phone's share sheet (or Web Share on the browser).

**US-R12 · Should · G1 · v1 if time — Duplicate warning**
As a requester, I want to be warned if the same request already exists, so that we don't split donors across copies.
- AC: Before posting, rules check open requests with the same blood group + hospital within a time window; if found: "This may already be posted — same patient?" with Join / Post anyway.
- AC: An AI "looks similar" hint may be added; the decision is always mine.

**US-R13 · Should · G5 · v1 if time — Attach the hospital slip for a "verified" badge**
As a requester, I want to attach a photo of the hospital requisition slip, so that donors trust my request.
- AC: Optional; the photo is private (never a public link) and only volunteers/admins can see it.
- AC: A volunteer checks it manually and grants the badge; posting is never blocked.
- AC: The photo is deleted automatically when the request closes *(proposed: at close + 7 days at most)*.

**US-R14 · Must · G1 · v1 core — Request platelets (dengue)**
As a requester whose patient has dengue, I want to ask specifically for platelet donors, so that only people willing and suitable for platelet donation are asked. *(Q3: confirmed and featured — dengue is a major, growing emergency in Bangladesh.)*
- AC: "What is needed": Whole blood (default) / Platelets. A "Dengue patient" quick option pre-selects Platelets.
- AC: Platelet requests notify only donors who opted in to platelet donation (US-D01) and are shown with a clear platelet label.
- AC: The request screen links to the dengue & platelets information page (US-P05).

**US-R15 · Should · G1 · v1 if time — Repeat a previous request**
As a recurring requester, I want to repeat a previous request in one tap, so that a regular transfusion (e.g. thalassaemia) takes seconds to arrange.
- AC: "Request again" on a closed request copies its details; I only adjust date and units.

**US-R16 · Nice · G4 · Later — See how many donors could help before posting**
As a requester, I want to see how many compatible donors are near the hospital (count only), so that I know what to expect.

**US-R17 · Nice · G3 · Later — Thank my donor**
As a requester, I want to send a private thank-you message to my donor, so that they feel appreciated and donate again.

### 5.2 Donor (D)

**US-D01 · Must · G3 · v1 core — Become a donor in under 2 minutes**
As a donor, I want to switch on my donor profile with only the essentials, so that I can be matched quickly.
- AC: Fields: name, blood group (with "I don't know my group" guidance — not matchable until known), date of birth (already given at sign-in; 18+; upper age limit per PRD), gender (only if eligibility rules need it — PRD), home area (division → district → upazila/thana + area; **"Use my location once"** fills it — coordinates are not stored), "I can travel to" (my thana / my district), last donation date or "never", a short self-declared eligibility checklist with a "this is not medical advice" note.
- AC: Optional: "I'm willing to donate platelets" (explained in plain words; can be changed anytime).
- AC: A **verified phone is required** before the profile goes live (verify here if not done yet — X01).
- AC: A **separate consent tick** for health data and the contact-sharing rule ("your number is shared only with people whose request you accept — and you will see theirs; you can choose to call them yourself instead").
- AC: Works fully in English and Bangla.

**US-D02 · Must · G1 · v1 core — Get notified about requests I can help with**
As a donor, I want a notification with enough details to decide, so that I can respond in time — without anyone getting my number.
- AC: High-priority Android notification; web push on supported browsers; a one-time **"make sure alerts reach you"** guide for my phone brand (notifications allowed, battery optimisation off for UDVASITO); optional email copy if I opt in (G-02).
- AC: The alert and detail screen show blood group, whole blood or platelets, units, hospital, area, distance, needed-by, the verified badge, and the **requester's track record** (member since, requests posted, donations confirmed) — plus "phone not yet verified" when that applies (G-01, G-09).
- AC: The requester's number and patient details stay hidden until I'm confirmed.
- AC: "Requests for me" is shown every time I open the app, so a missed notification is never a missed request.
- AC: Delivery and opening are recorded so the search widens on real opens (G-02).

**US-D03 · Must · G1 · v1 core — Accept or decline in one tap**
As a donor, I want to answer "I can help" or "Can't this time" in one tap, so that the family knows quickly.
- AC: "I can help" asks one quick self-check ("I feel well and haven't donated recently").
- AC: The server decides, first come first served: the first **units + 1** acceptors are confirmed and the requester is notified instantly; anyone later sees "Thank you — already covered. You're on standby" and is confirmed automatically if a slot re-opens (G-06, G-18).
- AC: Tapping twice or a dropped connection never double-accepts or loses my answer (G-05).
- AC: "Can't this time" has an optional reason (busy, far, donated recently, unwell); "donated recently" updates my cooldown.

**US-D04 · Must · G1 · v1 core — Act after I'm confirmed**
As a confirmed donor, I want the requester's contact and the hospital location in front of me, so that I can get there without extra searching.
- AC: Requester's number with Call / WhatsApp buttons, hospital name with a map link and directions, ward/patient details if provided, needed-by time, and the safety card (G-10).
- AC: **"Still coming?" check (G-18, times shortened by the team):** 10 min after I'm confirmed for a "Now" request (20 min otherwise) and again 30 min before needed-by. If I don't answer within 5 min, the standby donor is confirmed too — I'm not removed unless I tap "Can't make it". All times are admin settings (A06).
- AC: "I can't make it anymore" withdraws me, notifies the requester and confirms the standby donor.

**US-D05 · Must · G3 · v1 core — Control my availability instantly**
As a donor, I want to set myself available, paused or unavailable myself, so that I only get requests when I can really help.
- AC: Options: Available / Pause for 1 week / 1 month / custom date / Not available. Takes effect immediately — no admin approval.
- AC: Pauses end automatically; my current status is always visible on the home screen.

**US-D06 · Must · G5 · v1 core — Automatic cooldown after donating**
As a donor, I want the app to rest me automatically after a donation, so that I'm never asked before it is safe.
- AC: After a confirmed donation (or entering my last donation date), I'm excluded from matching until the eligible date (interval set by the rules in PRD).
- AC: Home shows "Eligible again on <date>".

**US-D07 · Must · G5 · v1 core — Keep my number private and my data mine**
As a donor, I want my number never to be public and to control my data, so that I'm safe from spam and misuse.
- AC: My number never appears on public pages, search results (including volunteer search — V10), shared links, AI calls or non-admin exports.
- AC: I can see the list of requesters who received my number, and choose "Don't share my number — I'll call them" (D16).
- AC: I can hide my donor profile, download my data, and delete my account — personal data removed within 30 days *(proposed)*; anonymous statistics kept (G-11).

**US-D08 · Must · G5 · v1 core — Report a bad request or person**
As a donor, I want to report a fake request, a money demand or harassment, so that the platform protects other donors.
- AC: "Report" on every request and after contact is shared, with reasons: fake request, asked for money, harassment, other.
- AC: **"Asked for money" freezes the reported account immediately** pending review (G-10).
- AC: A "fake request" report from a confirmed donor **freezes further contact reveals** on that request pending review (G-09).
- AC: Every report goes to the moderation queue (US-A02); I can block that requester from ever notifying or contacting me.

**US-D09 · Should · G1, G3 · v1 if time — Set notification limits**
As a donor, I want to set quiet hours, a maximum number of alerts, how far I can travel and which requests I accept, so that I'm not overwhelmed and feel safe.
- AC: Defaults *(proposed)*: max 3 alerts per day; quiet hours 00:00–07:00 with an opt-in "urgent requests may still reach me"; travel: my thana / my district.
- AC: **"Verified requests only"** option (slip-checked requests) (G-10).
- AC: Rare-group donors see a tip explaining why limits help them stay active longer.

**US-D10 · Should · G4, G5 · v1 if time — Ask "Can I donate?" in English or Bangla**
As a donor, I want to ask eligibility questions in my language, so that I understand whether I can donate without searching the internet.
- AC: **FAQ retrieval only (G-13):** AI may only pick and rephrase team-approved FAQ entries; the matching entry is shown as the source.
- AC: Any personal-health question ("I have diabetes, can I…") gets a fixed reply: "Please ask a doctor or the blood bank." The eligibility verdict in the app always comes from the rules.
- AC: If the team judges AI too risky here, this story runs **without AI** (searchable FAQ only).
- AC: A banner says "don't type personal details"; a daily per-user limit protects the free AI quota.

**US-D11 · Should · G3 · v1 if time — Helpful reminders**
As a donor, I want a reminder when I'm eligible again and an occasional "still available?" check, so that my status stays accurate without effort.
- AC: Push on my eligible date; every 90 days *(proposed)* a one-tap "Still available?" prompt.

**US-D12 · Should · G3 · v1 if time — Donation history and recognition**
As a donor, I want to see my confirmed donations and milestones, so that I feel proud and keep donating.
- AC: List of confirmed donations, total count, next eligible date, milestone badges (1st, 5th, 10th…).

**US-D13 · Should · G3 · v1 if time — Edit my profile safely**
As a donor, I want to update my area or details, so that matching stays accurate when I move.
- AC: Changing the phone number requires verifying the new number.

**US-D14 · Nice · G3 · Later — Share that I donated**
As a donor, I want a shareable "I donated through UDVASITO" card (no phone, no patient details), so that I inspire friends.

**US-D15 · Nice · G3 · Later — Invite friends**
As a donor, I want an invite link, so that my friends join and the donor pool grows.

**US-D16 · Must · G5 · v1 core — "Don't share my number — I'll call them"**
As a donor — especially a woman donor — I want to keep my number private even after accepting and call the requester myself, so that strangers never get my number. *(G-10)*
- AC: A setting in my donor profile, and a per-request choice when I accept.
- AC: When on, the requester sees "Your donor <first name> will call you"; I see the requester's number with Call / WhatsApp.
- AC: Mutual reveal stays the default (Q1); this is an opt-out.

### 5.3 Volunteer (V)

**US-V01 · Must · G1, G3 · v1 core — Apply to volunteer**
As a member, I want to apply to become a volunteer, so that I can help coordinate.
- AC: Short application (area, institution, motivation) with an explicit consent: **"While I'm on duty, my first name and phone number may be shown to people requesting blood in my area"** (V09).
- AC: Requires a verified phone; an admin approves or rejects (A05); the role appears on my profile.

**US-V02 · Must · G1 · v1 core — One shared request board**
As a volunteer, I want one live board of open requests in my district, sorted by urgency and "minutes without a response", so that we focus on the stuck ones.
- AC: Includes "Not sure" blood-group requests (G-16) and requests no volunteer has claimed yet; "I'm on it" claims a request so others see who is handling it.
- AC: Filters by blood group, whole blood / platelets, hospital, status; updates in real time; **donors' numbers are never shown on the board**.

**US-V03 · Must · G1 · v1 core — Escalation alerts**
As a volunteer, I want to be alerted when a request reaches its last wave and nobody is handling it, so that a human steps in.
- AC: Push to all on-duty volunteers of that district and to admins when the final wave passes with no confirmed donor and no volunteer has tapped "I'm on it".

**US-V04 · Should · G1 · v1 if time — Post on behalf of a family from a public post (Version C)**
As a volunteer, I want to paste a blood request I found on Facebook/WhatsApp and turn it into a UDVASITO request, so that families who don't use the app still reach donors.
- AC: Same AI extraction and redaction as US-R03; the contact number in the post becomes the request contact; the request is labelled "posted by a volunteer from a public post".
- AC: The family can later claim the request with their verified number.

**US-V05 · Should · G5 · v1 if time — Check slip photos**
As a volunteer, I want to review slip photos and grant the "verified" badge, so that donors can trust requests.
- AC: Queue of pending slips; Approve / Reject with reason; the photo is never downloadable and is auto-deleted on schedule.

**US-V06 · Should · G1 · v1 if time — Merge duplicate requests**
As a volunteer, I want to merge requests that are the same patient, so that donors aren't split across copies.
- AC: Suggested pairs from rules (plus optional AI hint); merging keeps all acceptances and stops duplicate notifications; both requesters are informed.

**US-V07 · Should · G3 · v1 if time — Campus drive mode**
As a volunteer, I want a QR code / link with a campaign code, so that donors signing up at a campus drive are counted for that campus.
- AC: Admin dashboard shows sign-ups per campaign.

**US-V08 · Nice · G1 · Later — Internal notes on a request**
As a volunteer, I want to add notes visible only to volunteers (e.g. "called CMCH blood bank, 1 bag arranged"), so that we don't repeat work.

**US-V09 · Must · G1 · v1 core — A human within 30 seconds (on-duty volunteer hotline)**
As a requester, I want a real person's number if no donor has accepted within 30 seconds, so that I'm never alone in an emergency. *(Team decision, G-02.)*
- AC: Volunteers switch themselves **On duty / Off duty** and set their area; every new request in their area notifies on-duty volunteers immediately.
- AC: If no donor has accepted within **30 s** *(admin setting)*, the requester sees the first name and phone number (Call / WhatsApp) of an on-duty volunteer for that area — at most 2, chosen by least-busy rotation.
- AC: A volunteer's number is shown only while the request is open and only to that requester; volunteers can report and block requesters.
- AC: If no volunteer is on duty, the requester sees the team's fallback contact and the blood-bank list (R10).
- AC: The admin dashboard shows on-duty coverage by hour, so gaps (e.g. 1–7 am) are visible.

**US-V10 · Must · G1, G5 · v1 core — Find donors for a request without seeing their numbers**
As a volunteer, I want to search the donor pool for a specific request and ask chosen donors directly, so that I can find blood for the patient — without anyone's number leaving the app. *(Team decision G-02 "volunteer checks the database", reconciled with G-14 — confirmed C1.)*
- AC: Search is only available from inside an open request; filters: blood group, area, available now, eligible now, platelets.
- AC: Results show first name, blood group, area, last active and eligibility — **never phone numbers**.
- AC: "Ask this donor" sends that donor a direct notification for this request; if they accept, the normal flow applies (confirmation, mutual reveal or D16).
- AC: Optional donor setting "Volunteers may call me directly in an emergency": only for those donors, a volunteer can reveal the number with a typed reason.
- AC: Every search, ask and reveal is logged (A03) and rate-limited.

### 5.4 Admin (A)

**US-A01 · Must · G2 · v1 core — Live dashboard**
As an admin, I want a dashboard with real numbers, so that we can run the network and show judges and partners honest impact.
- AC: Donors total and available by blood group (blood-pool chart), registrations trend (30 days), open requests, the full funnel with the confirmation response rate (G-19), time to first notification, median time to first acceptance (G1), and on-duty volunteer coverage by hour (V09).
- AC: Numbers are computed from the source data by the backend — no separately maintained counters. **Practice-area data is always excluded** (A15).

**US-A02 · Must · G5 · v1 core — Moderation queue**
As an admin, I want one queue of reports and automatic flags, so that abuse is stopped quickly.
- AC: Actions: hide request, warn user, suspend / ban user, restore — each requires a reason; the affected user is notified.
- AC: Automatic flags: request-farming patterns (many groups / hospitals / reveals, requests never closed — G-09), money mentions, unusual reveal volumes by admins or volunteers (G-14).
- AC: Flags put items in the queue but **never block or delay a request from going live**; "asked for money" and confirmed-donor "fake request" reports apply their automatic freezes (D08).

**US-A03 · Must · G5 · v1 core — Audit log**
As an admin, I want every sensitive action recorded, so that we can prove personal data is handled responsibly.
- AC: Logged: contact reveals, admin and volunteer number reveals (with reason), volunteer donor searches and "Ask this donor" actions, exports, role changes, moderation actions, setting changes, AI setting changes, consent records (version and date).
- AC: Read-only, filterable by person, action and date; cannot be edited or deleted from the app.

**US-A04 · Must · G5 · v1 core — AI controls and graceful fallback**
As an admin, I want to see AI usage and switch AI features off, so that the app stays reliable within the free quota and we can stop any AI misbehaviour instantly.
- AC: Per-feature on/off switches; today's AI calls vs the free daily limit; automatic fallback to manual flows when the quota is used up or calls fail.
- AC: A log of AI calls with the **redacted** input and the output, for spot checks.

**US-A05 · Must · G5 · v1 core — Approve volunteers and manage roles**
As an admin, I want to approve volunteer applications and grant or remove roles, so that only trusted, consenting people coordinate.
- AC: Queue of volunteer applications (V01) with Approve / Reject and reason.
- AC: Every change is in the audit log; an admin cannot remove the last admin.

**US-A06 · Should · G1 · v1 if time — Tune the rules without code**
As an admin, I want to change matching and timing settings from the admin panel, so that we can adapt without a new release.
- AC: Editable: donation interval, wave size and interval, number of waves, radius, donor alert limits, request expiry, escalation timing, compatibility table — with validation and safe defaults.

**US-A07 · Should · G3 · v1 if time — Import and export donors safely**
As an admin, I want to import donors from CSV and export reports, so that existing lists (e.g. v0 pilot donors, campus clubs) can join and the team can report.
- AC: Imported people are **invited** to verify their phone and consent before they become matchable; nobody is matchable without their own consent.
- AC: Normal exports are **anonymised**. Exports with personal data are super-admin only, logged and rate-limited (G-14).
- AC: Exports are generated on the server and protected against spreadsheet formula injection.

**US-A08 · Should · G4 · v1 if time — Hospital and blood-bank directory**
As an admin, I want to manage the list of hospitals and blood banks, so that requesters can pick hospitals quickly and get correct blood-bank numbers.
- AC: Seeded with Chattogram hospitals; fields: name (Bangla/English), area, district, blood-bank phone, approximate location.

**US-A09 · Should · G5 · v1 if time — Manage the assistant's FAQ**
As an admin, I want to add, edit and approve FAQ entries in Bangla and English, so that the AI assistant only says things we have reviewed.
- AC: Only approved entries are used; each entry records who approved it and when.

**US-A10 · Should · G2 · v1 if time — Weekly summary**
As an admin, I want an automatic weekly summary in plain language, so that the team sees trends and problems without digging.
- AC: Built from aggregated numbers only (no personal data); delivered in the admin panel.

**US-A11 · Nice · G3 · Later — Targeted announcements**
As an admin, I want to send an announcement to a donor segment (e.g. all O− donors in Chattogram), so that we can respond to shortages.
- AC: Rate-limited; respects donor quiet hours; logged.

**US-A12 · Nice · G2 · Later — Google Sheets export**
As an admin, I want a server-side export to a Google Sheet, so that the team can report in a familiar tool (replaces the risky v0 Apps Script sync).

**US-A13 · Must · G5 · v1 core — Free-tier usage monitor**
As an admin, I want to see how close we are to every free-tier limit, so that we know when — and whether — to buy a subscription before anything breaks. *(G-03)*
- AC: One panel listing each service (backend, hosting, images, AI, notifications, builds) with our measured usage vs the free limit, and a link to the provider's own dashboard where we can't measure it ourselves.
- AC: Warnings at 70 % and 90 % *(proposed)* to all admins.
- AC: Shows the fixed degradation order: AI → images → non-essential pages; the request → match → notify → accept path is never switched off.

**US-A14 · Must · G5 · v1 core — See a donor's number only with a reason**
As an admin, I want donor numbers hidden by default even in the admin panel, so that insiders can't quietly copy them. *(G-14)*
- AC: Admin screens show donors without phone numbers; "Reveal" requires a typed reason and is logged.
- AC: Unusual reveal volumes *(proposed: more than 20 a day per person)* raise a flag in the moderation queue.
- AC: Volunteers never see donor numbers, except the opt-in case in V10.

**US-A15 · Must · G2, G5 · v1 core — Practice area so judges can try the live platform safely**
As an admin, I want a practice area inside the live platform, completely separated from real donors and real numbers, so that judges can try the full loop on the real system without sending test requests to real people. *(G-20, D12)*
- AC: Practice accounts are real phones (team members' or judges') with their real, verified numbers — no fake accounts or numbers; judges sign in with a practice ID + PIN while the practice area is on.
- AC: Requests posted there notify only practice accounts — never real donors — and real requests never reach practice accounts. Everything else (push, AI, Telegram, calls) is the real system.
- AC: Practice data never appears in public numbers, the impact page or the real dashboard; practice screens carry a visible "PRACTICE" label.
- AC: An admin can switch the practice area on/off and wipe practice data in one action.

### 5.5 Visitor / judge (P)

**US-P01 · Should · G2 · v1 if time — Public impact page**
As a visitor, I want to see live, anonymised impact numbers and how UDVASITO works, so that I can trust it and join.
- AC: No login; totals, donors by blood group, requests fulfilled, donations confirmed; "Need blood" and "Become a donor" buttons; shareable link.

**US-P02 · Should · G1, G3 · v1 if time — Open a shared request link without the app**
As a visitor who sees a shared request on Facebook, I want to open it in my browser and offer to help, so that I can respond even if I've never used UDVASITO.
- AC: Shows the anonymised request (no numbers, no patient name); "I can help" leads to quick sign-up → donor profile → accept, if eligible by the rules.

**US-P03 · Should · G4 · v1 if time — Learn about donating**
As a visitor, I want simple Bangla/English pages on donation basics, eligibility and myths, so that I feel confident to donate.
- AC: Reviewed content; clear disclaimer "UDVASITO is not a blood bank or medical service"; privacy policy and terms pages.

**US-P04 · Nice · G4 · Later — Easy install**
As a visitor, I want to install the web app or download the Android app from the website, so that I'm ready for the next emergency.

**US-P05 · Should · G4 · v1 if time — Dengue & platelets information**
As a visitor or requester, I want a simple page about dengue and platelet donation, so that families and donors know what platelet donation involves and where it can be done.
- AC: Team-reviewed content in English and Bangla; no medical advice — "follow your doctor"; links to the platelet request flow and to becoming a platelet donor.

### 5.6 Supporter (S) — later phase F3

**US-S01 · Nice · G3 · Later — Support the platform via bKash / Nagad**
As a supporter, I want to send a contribution to the official bKash/Nagad number and submit the transaction ID, so that my support is recorded.
- AC: Status: pending → confirmed / rejected; confirmation message.
- AC: **Not in the 15–20-day build or the judging (G-15).** When built: an organisation-owned account (never a personal number), every transaction ID checked against the statement by two people.

**US-S02 · Nice · G3 · Later — See where the money goes**
As a supporter, I want a public page of money received and spent, so that I trust the platform. Money is used only to run and grow the platform — never paid for giving blood.

**US-S03 · Nice · G3 · Later — Verify contributions (admin)**
As an admin, I want to verify submitted transaction IDs and record expenses, so that the transparency page is accurate.

### 5.7 Partner organisation (B) — later phases F1, F2

**US-B01 · Nice · G3 · Later — Invite our donors with consent**
As a blood-bank or blood-club coordinator, I want invite links/QR codes for our donors, so that they can join UDVASITO themselves.
- AC: Each donor opts in individually; the partner sees only an aggregate count.

**US-B02 · Nice · G1, G5 · Later — Post verified requests as hospital staff**
As verified hospital or blood-bank staff, I want to post requests directly, so that they carry an automatic "verified" badge.

### 5.8 Everyone (X) — cross-cutting

**US-X01 · Must · G1, G5 · v1 core — Sign in fast, post first, verify in parallel**
As any user, I want to get in with one tap and post immediately, so that verification never costs a patient time. *(G-01)*
- AC: Sign-in with one tap (Google) or an email code (final methods in Step 5). **Date of birth is required**; under-18s cannot create an account and see a friendly explanation (G-13).
- AC: A first-time requester can post right after sign-in; phone verification (৳0: Telegram, or in person with an admin or volunteer for people without Telegram) is prompted **while donors are being notified**.
- AC: Until my phone is verified: max 1 open request, and donors see "phone not yet verified" on my request.
- AC: A donor profile or volunteer application cannot go live without a verified phone.
- AC: If the verification service is down, posting still works.
- AC: The phone is verified once; I stay signed in. Target: first-timer from opening a shared link to a live request in ≤ 2 min, consent screen included.

**US-X02 · Must · G4 · v1 core — English and Bangla everywhere**
As any user, I want the whole app in English or Bangla and to switch anytime, so that I understand every word.
- AC: 100 % of user-facing text available in both languages.
- AC: **English is the default (Q4)**, with three exceptions (G-17): if the phone or browser language is Bangla, the app opens in Bangla; a shared request link opens in the language it was shared in; the first screen shows a large "বাংলা / English" choice.
- AC: A one-tap switch in the header of every screen, remembered on the device and in my account.
- AC: Dates and numbers are formatted for the chosen language.

**US-X03 · Must · G4 · v1 core — Works on cheap phones and weak networks**
As any user, I want the app to work on a low-end Android phone and a slow, unstable connection, so that nobody is left out.
- AC: Fast first screen (≤ 3 s target from `vision.md` G4), skeleton loading, an offline banner, automatic retries.
- AC: Every create/accept action has a device-generated ID so repeats are ignored; unsent actions wait in an on-device outbox and are sent automatically when the connection returns (G-05).
- AC: Live screens fall back to refreshing every 15 s when the real-time connection drops.

**US-X04 · Must · G4 · v1 core — Accessible to everyone**
As a user with low vision or who uses a screen reader, I want the app to follow accessibility standards, so that I can use it independently.
- AC: WCAG 2.2 AA on web; labels on all buttons and icons; touch targets ≥ 48 dp; text scales; status never shown by colour alone.
- AC: Every build is tested on a real low-end Android phone and with TalkBack using a written checklist (G-07).

**US-X05 · Must · G5 · v1 core — AI is always a suggestion**
As any user, I want AI suggestions clearly labelled and editable, so that I'm always in control.
- AC: Every AI-filled field is marked "AI suggested"; nothing AI-generated is submitted, sent or published without a person confirming; AI being unavailable never blocks a flow.

**US-X06 · Must · G5 · v1 core — Protection against abuse**
As any user, I want the platform protected from spam and fake activity, so that it stays trustworthy.
- AC: Limits *(proposed)*: 1 open request for unverified accounts, 2 for verified, at most 5 requests per month; sign-ups per device/network per hour; contact reveals per day (G-09).
- AC: Suspicious patterns go to the moderation queue (A02) — honest users' emergency requests are never slowed.

**US-X07 · Should · G4 · v1 if time — Install on iPhone and desktop**
As an iPhone or desktop user, I want to install the web app to my home screen and receive notifications where my device allows, so that I get the same experience as Android users.

**US-X08 · Must · G5 · v1 core — Consent and permissions screen on first open**
As any user, I want to read in plain words what UDVASITO does with my data and which permissions it may use, and agree once, so that I know what I'm signing up for. *(Team decision G-04, G-11, G-12.)*
- AC: Shown on first open of the app (and before first sign-in on the web), in English and Bangla: terms, privacy notice, how data is used — **including that text I type may be processed by an AI service** (G-12) — and the list of every permission the app may ask for, and why: location (to find where blood is needed / my area — live location never stored), notifications (alerts), microphone (voice requests — converted to text by the phone's or browser's own speech service, which may be Google's), camera/photos (slip photo).
- AC: One tick — "I am 18 or older and I agree" — is required to continue; consent is recorded with date and version. The donor profile asks a second, separate consent for health data and contact sharing (D01).
- AC: Each phone/browser permission pop-up appears the first time the related feature is used, with a one-line reason — never a wall of pop-ups at start (confirmed C3).
- AC: Public pages (impact, education, an anonymised shared request) can be viewed without this screen; any action (sign in, post, accept) requires it.
- AC: One screen, one tick: ≤ 15 s for a first-timer.

---

## 6. Summary table

| ID | Title | Priority | Goal | Release |
|---|---|---|---|---|
| R01 | Post a request with a short form | Must | G1 | v1 core |
| R02 | Speak the request in Bangla | Must | G1 G4 | v1 core |
| R03 | Type or paste a request in my own words | Must | G1 | v1 core |
| R04 | Right donors notified automatically | Must | G1 | v1 core |
| R05 | Search widens by itself | Must | G1 | v1 core |
| R06 | Live status of my request | Must | G1 | v1 core |
| R07 | Contact a confirmed donor in one tap | Must | G1 G5 | v1 core |
| R08 | Close or update my request | Must | G2 | v1 core |
| R09 | Confirm the donation happened | Must | G2 | v1 core |
| R10 | Honest "no donors yet" guidance | Must | G4 | v1 core |
| R11 | Shareable appeal card and link | Should | G1 G3 | v1 if time |
| R12 | Duplicate warning | Should | G1 | v1 if time |
| R13 | Attach the hospital slip for a "verified" badge | Should | G5 | v1 if time |
| R14 | Request platelets (dengue) | Must | G1 | v1 core |
| R15 | Repeat a previous request | Should | G1 | v1 if time |
| R16 | See how many donors could help before posting | Nice | G4 | Later |
| R17 | Thank my donor | Nice | G3 | Later |
| D01 | Become a donor in under 2 minutes | Must | G3 | v1 core |
| D02 | Get notified about requests I can help with | Must | G1 | v1 core |
| D03 | Accept or decline in one tap | Must | G1 | v1 core |
| D04 | Act after I'm confirmed | Must | G1 | v1 core |
| D05 | Control my availability instantly | Must | G3 | v1 core |
| D06 | Automatic cooldown after donating | Must | G5 | v1 core |
| D07 | Keep my number private and my data mine | Must | G5 | v1 core |
| D08 | Report a bad request or person | Must | G5 | v1 core |
| D09 | Set notification limits | Should | G1 G3 | v1 if time |
| D10 | Ask "Can I donate?" in English or Bangla | Should | G4 G5 | v1 if time |
| D11 | Helpful reminders | Should | G3 | v1 if time |
| D12 | Donation history and recognition | Should | G3 | v1 if time |
| D13 | Edit my profile safely | Should | G3 | v1 if time |
| D14 | Share that I donated | Nice | G3 | Later |
| D15 | Invite friends | Nice | G3 | Later |
| D16 | "Don't share my number — I'll call them" | Must | G5 | v1 core |
| V01 | Apply to volunteer | Must | G1 G3 | v1 core |
| V02 | One shared request board | Must | G1 | v1 core |
| V03 | Escalation alerts | Must | G1 | v1 core |
| V04 | Post on behalf of a family from a public post (Version C) | Should | G1 | v1 if time |
| V05 | Check slip photos | Should | G5 | v1 if time |
| V06 | Merge duplicate requests | Should | G1 | v1 if time |
| V07 | Campus drive mode | Should | G3 | v1 if time |
| V08 | Internal notes on a request | Nice | G1 | Later |
| V09 | A human within 30 seconds (on-duty volunteer hotline) | Must | G1 | v1 core |
| V10 | Find donors for a request without seeing their numbers | Must | G1 G5 | v1 core |
| A01 | Live dashboard | Must | G2 | v1 core |
| A02 | Moderation queue | Must | G5 | v1 core |
| A03 | Audit log | Must | G5 | v1 core |
| A04 | AI controls and graceful fallback | Must | G5 | v1 core |
| A05 | Approve volunteers and manage roles | Must | G5 | v1 core |
| A06 | Tune the rules without code | Should | G1 | v1 if time |
| A07 | Import and export donors safely | Should | G3 | v1 if time |
| A08 | Hospital and blood-bank directory | Should | G4 | v1 if time |
| A09 | Manage the assistant's FAQ | Should | G5 | v1 if time |
| A10 | Weekly summary | Should | G2 | v1 if time |
| A11 | Targeted announcements | Nice | G3 | Later |
| A12 | Google Sheets export | Nice | G2 | Later |
| A13 | Free-tier usage monitor | Must | G5 | v1 core |
| A14 | See a donor's number only with a reason | Must | G5 | v1 core |
| A15 | Practice area so judges can try the live platform safely | Must | G2 G5 | v1 core |
| P01 | Public impact page | Should | G2 | v1 if time |
| P02 | Open a shared request link without the app | Should | G1 G3 | v1 if time |
| P03 | Learn about donating | Should | G4 | v1 if time |
| P04 | Easy install | Nice | G4 | Later |
| P05 | Dengue & platelets information | Should | G4 | v1 if time |
| S01 | Support the platform via bKash / Nagad | Nice | G3 | Later |
| S02 | See where the money goes | Nice | G3 | Later |
| S03 | Verify contributions (admin) | Nice | G3 | Later |
| B01 | Invite our donors with consent | Nice | G3 | Later |
| B02 | Post verified requests as hospital staff | Nice | G1 G5 | Later |
| X01 | Sign in fast, post first, verify in parallel | Must | G1 G5 | v1 core |
| X02 | English and Bangla everywhere | Must | G4 | v1 core |
| X03 | Works on cheap phones and weak networks | Must | G4 | v1 core |
| X04 | Accessible to everyone | Must | G4 | v1 core |
| X05 | AI is always a suggestion | Must | G5 | v1 core |
| X06 | Protection against abuse | Must | G5 | v1 core |
| X07 | Install on iPhone and desktop | Should | G4 | v1 if time |
| X08 | Consent and permissions screen on first open | Must | G5 | v1 core |

**Totals:** 76 stories — **40 Must**, **23 Should**, **13 Nice** (S01–S03 and B01–B02 are later-phase F1–F3).

---

## 7. Coverage check

**Every vision goal has Must stories:** G1 (R01–R07, R14, D02–D04, V01–V03, V09, V10, X01) · G2 (R08, R09, A01) · G3 (D01, D05) · G4 (R02, R10, X02–X04) · G5 (R07, D06–D08, D16, A02–A05, A13–A15, X05, X06, X08).

**Every vision differentiator is covered:** consent-gated contact (R07, D02, D04, D07) · AI intake (R02, R03, V04) · duplicates (R12, V06) · explainable rules (R04, R05, D06, A06) · self-running operations (R05, R08, R09, D05, D06, D11) · honest impact (R09, A01, P01).

**What happened to each v0 feature:**

| v0 feature | v1 |
|---|---|
| Home with live counts | A01 (admin) and P01 (public, anonymised) |
| Find tab — public donor search with phone numbers | **Removed.** Replaced by requests + matching (R01–R07). Aggregated counts only (R16, P01) |
| Join — 3-step donor registration | D01 (shorter, consented) |
| Update availability (admin-approved) | D05 (instant, self-service) |
| Volunteer registration | V01 |
| Admin console: records, requests, CSV, Sheets | A01–A12 (server-side, logged) |
| Charts: blood pool, 30-day trend | A01, P01 |
| About / founder | P03 (about and education pages) |

---

## 8. Assumptions built into these stories (to be challenged in Step 3)

1. One account can be both requester and donor.
2. Donors see request details (blood group, hospital, area, needed-by, whole blood or platelets) before accepting, but not the requester's number or patient details. After accepting, both sides see each other's number (Q1).
3. Notifications go out in waves rather than to every donor at once, to protect donors from fatigue.
4. Volunteers handle escalations and slip checks; admins make moderation decisions.
5. A requester's contact number defaults to their own number (verified in parallel — G-01).
7. Volunteers are part of every request from second 0 (G-02); volunteers and admins never see donor numbers by default (G-14).
6. Every *(proposed)* number becomes an admin setting with a default, decided in `PRD.md`.

---

## 9. Team decisions (resolved 2026-11-23)

| ID | Question | Decision |
|---|---|---|
| Q1 | When a donor accepts, who sees whose number? | **Both** see each other's number (mutual reveal) — US-R07, US-D01, US-D04 |
| Q2 | Roles | **3 roles: Member / Volunteer / Admin** — §2 |
| Q3 | Platelet requests in v1? | **Yes — promoted to Must and featured**, because dengue is spreading fast in Bangladesh — US-R14, US-D01, new US-P05 |
| Q4 | Language on first open | **English by default**, Bangla one tap away on every screen — US-X02 (refined by G-17: Bangla phones open in Bangla) |

Step 3 (Grilling) decisions G-01–G-20 and their effect on each story are recorded in `grilling-notes.md` §4–§5.

## 10. Change log

| Version | Date | Change |
|---|---|---|
| 0.1 | 2026-11-23 | First draft from `vision.md` v1.0: 7 personas, 68 stories (28 Must / 27 Should / 13 Nice), coverage check, assumptions, 4 questions |
| 1.0 | 2026-11-23 | **Approved.** Applied Q1–Q4: mutual number reveal; 3 roles; platelet requests promoted to Must (R14) with donor platelet opt-in and new P05 dengue page; English default with one-tap Bangla. Now 69 stories (29 Must / 27 Should / 13 Nice) |
| 1.1 | 2026-11-23 | Step 3 grilling updates, **approved** with C1–C5: new Must stories D16, V09, V10, A13, A14, A15, X08; V01, V02, V03, A05 promoted to Must; 30 existing stories rewritten (G-01–G-20); core journey and roles updated. Now 76 stories (40 Must / 23 Should / 13 Nice) |
| 1.2 | 2026-11-23 | Synced with ADR-011: honest speech-recognition wording in R02 and X08 |
| 1.3 | 2026-11-23 | Step 7 decisions: X01 in-person verification (D-R1); A15 rewritten as a practice area of the live platform with real phones (D-R4, D12); "demo area" → practice area |
