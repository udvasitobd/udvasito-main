# for_me.md — your checklist

This file lists **only the things a human has to do**. Claude Code (the AI) does everything else.
**It is a live checklist:** Claude updates it every time you finish something, so you always see what is
finished and what to do next.

| Sign | Meaning |
|---|---|
| 👉 | **Do this now** (in the order shown) |
| ✅ | Finished — thank you! |
| ⏳ | Later — Claude will tell you when |
| 👥 | A job for another team member |

_Last updated: Sat 28 Nov 2026._

> 🔒 **Golden rules**
> 1. **Never enter a credit/debit card** on any website for this project. If a site asks for a card, stop and tell Claude.
> 2. **Never paste a password, key or token into the chat.** Claude tells you where to paste it instead (a website's
>    "secrets" or "environment variables" page). The code is public on GitHub — anything pasted into code is public.
> 3. Use the team Gmail **udvasitobd@gmail.com** for every new account.

---

## 👉 Do now

### ✅ 1. Cloudflare connected to GitHub (28 Nov) — the test website is live
You said yes and typed GitHub's email code. **https://staging.udvasito.com** now builds itself every time the
`staging` code changes. You can open it and sign in with Google to look around (it is the test copy: nothing there is
real, and real people should not use it yet).

### 👉 6. Get the new screens on your phone (about 3 minutes) — after Claude writes "update sent"
The app on your phone stopped at **"Please review and accept the updated terms"** because the privacy notice and terms
did not exist yet. Claude has now written them, so the app gets a small update (no new install needed). This update
also adds the **"New version available" bar**, so this is the **last time** you have to do the close-and-open trick.
1. When Claude writes **"update sent"**: on the phone, close UDVASITO completely — open the recent-apps view (swipe up
   from the bottom and hold) and swipe UDVASITO away.
2. Open UDVASITO again, wait 10 seconds, then close it and open it **once more** (the first opening downloads the
   update, the second one uses it).
3. You should now see **Welcome to UDVASITO**: tick the box "I'm 18 or older…" → **Continue** → fill in your name, date
   of birth and phone number.
4. Write in the chat what you saw — **"profile done"**, or a screenshot of anything that looks wrong (cover the phone
   number).

**From the next update on** you don't need any trick: a dark-blue bar appears at the top of the screen saying
**"New version available"**. Tap **What's new** to read what changed, then **Update now** — the app restarts by itself
in a few seconds with the new version. Tap **✕** if you are busy; the bar comes back the next time you open the app.
The website (staging.udvasito.com) shows the same bar; there **Update now** simply reloads the page.

### ✅ 5. Test app installed on your iQOO phone (28 Nov) — Google sign-in worked
The first phone version of UDVASITO is ready (a test copy: it talks to the test server, not the real one).
1. On your **phone**, open **Chrome** and go to the build page:
   **https://expo.dev/accounts/udvasitos-team/projects/udvasito/builds/2c7bb228-48f2-4e3e-a348-e2e6d675ec05**
   If Expo asks you to log in, tap **Continue with Google** and pick the team Gmail.
2. Tap **Install** (or the download button). Chrome downloads a file ending in **.apk**. If Chrome warns
   "this type of file can harm your device", tap **Download anyway**: it is our own app.
3. Open the downloaded file (tap the notification, or Chrome menu ⋮ → **Downloads**).
4. Android asks to **allow Chrome to install unknown apps** → tap **Settings** → switch on **Allow from this source** →
   press back.
5. Tap **Install**. The iQOO phone may show a security check or say the app is "not from an app store": choose
   **Continue installing** / **Install anyway**. If **Google Play Protect** says "unsafe app blocked", tap
   **More details** → **Install anyway**. (This happens to every app that isn't in the Play Store yet.)
6. Open **UDVASITO**. When it asks to **send notifications**, tap **Allow** — that is how blood requests reach you.
7. Sign in with Google and pick the **team Gmail** (while we test, Google only lets that account in).
8. Look around. Then write in the chat: **"app installed"** and anything that looked wrong or confusing. A screenshot
   is fine — just cover any phone number on it.

### 👉 2. Share the team to-do doc with members 2–5
Open **https://claude.ai/artifact/PJT9GL12qaHMyQ63Tw2L6v** → **Share** → add the four members (or copy the link and send it in your team group). The most
urgent jobs in it: **member 4 books the law teacher** to read the privacy notice + terms Claude wrote, **the hospital
list** (members 2 + 4) and **two more test phones** (anyone). Nobody else can open the link until you share it.

### 👉 3. Make the **test** Telegram bot (about 5 minutes)
**Why:** people verify their phone number by tapping a button that opens this bot in Telegram. The code is ready; it
only needs its own bot. This one is for the test website (staging) — the real one comes later.
1. On the computer open **https://web.telegram.org** → it shows a QR code. On your phone open **Telegram** →
   **Settings** → **Devices** → **Link Desktop Device** → point the phone at the QR code.
2. In Telegram on the computer, search **@BotFather** (the one with the blue tick ✔) → open it → click **Start**.
3. Send this message: `/newbot`
4. It asks for a name. Send: `UDVASITO test`
5. It asks for a username (it must end in "bot"). Send: `udvasito_test_bot`
   If it says the name is taken, try `udvasito_staging_bot`, then `udvasito_test1_bot`.
6. BotFather answers **"Done! Congratulations…"**. Under **"Use this token to access the HTTP API:"** there is a long
   line like `123456789:AAH…`. That is a **secret password for the bot** — 🔒 never paste it into the chat. Click it
   once (Telegram copies it).
7. Open **https://dashboard.convex.dev** → click the project **udvasito-staging** → at the top, open the deployment
   menu and choose **Production** (its name is `outstanding-grasshopper-711` — this is our **test website's**
   database, not the real one) → **Settings** (left) → **Environment Variables** → **+ Add**.
   - **Name:** `TELEGRAM_BOT_TOKEN`
   - **Value:** paste (Ctrl + V) → **Save**.
8. Write in the chat: **"test bot done, it is @…"** with the username from step 5 (the username is not secret).
   Claude does the rest (a second secret, connecting the bot, switching the button on).

### 👉 4. Put the helpline number in (about 3 minutes)
**Why:** when nobody says "yes" to a blood request within 30 seconds, or no donor matches at all, the app shows a
**"Call the UDVASITO helpline"** button. The plan says this is the super-admin's phone (yours), on loud at night. The
button stays hidden until a number is set. The number is never in the website's code: the app asks for it only when
someone taps the button. You type it yourself because it is your personal number.
1. Open **https://dashboard.convex.dev** → project **udvasito-staging** → deployment menu at the top → **Production**
   (`outstanding-grasshopper-711`, the **test website's** database).
2. Click **Functions** (left) → open **admin/ops** → click **setSetting**.
3. Click **Run function** (top right). In the box that opens, replace everything with this, putting your number
   after `+880` (11 digits starting with 01 → drop the first 0, e.g. 01712345678 → `+8801712345678`):
   ```
   {"key": "fallbackContactPhone", "value": "+8801XXXXXXXXX", "reason": "helpline for the test website"}
   ```
4. Click **Run**. It answers `null` = done. An error saying "wrong format" means a digit is missing: check the number.
5. Write in the chat: **"helpline done"** (don't write the number).

---

## ✅ Done

| | What you did | When |
|---|---|---|
| ✅ | Created the team Gmail, the GitHub account + repository, the Convex and Expo accounts | before 27 Nov |
| ✅ | Bought the domain **udvasito.com** (Namecheap) | 26 Nov |
| ✅ | **Step 1** — Chrome signed in as the team Gmail, Claude extension connected | 27 Nov |
| ✅ | Answered **Q-001** (dates), **Q-002** (use udvasito.com everywhere), **Q-003** (Claude decides) | 27 Nov |
| ✅ | **Step 2** — logged in to Convex and Expo on this PC (Claude checked) | 27 Nov |
| ✅ | Said yes: download the places files; Google Cloud + Firebase + AI Studio terms | 27 Nov |
| ✅ | **Step 3b** — Google sign-in secrets into Convex (Claude tested: sign-in works) | 27 Nov |
| ✅ | Said yes: merge pull request #1 after its review | 27 Nov |
| ✅ | Said yes: set up Sentry (error reports), Cloudinary (share pictures), Firebase (phone alerts) | 27 Nov |
| ✅ | **Step 3c** — Cloudinary keys into all three Convex servers (Claude checked) | 27 Nov |
| ✅ | **Step 6** — Firebase file, push key and the app's signing key on Expo (Claude checked) | 27 Nov |
| ✅ | Said yes: delete the two secret files (Claude deleted them for good) | 27 Nov |
| ✅ | Decided: **Cloudflare instead of Vercel** for the website (written down as ADR-024) | 27 Nov |
| ✅ | **Signed in to Namecheap** → Claude switched udvasito.com to Cloudflare (nameservers `jen` + `marvin`; the internet already sees it; email records kept) | 27 Nov |
| ✅ | ~~Step 4 — Vercel account~~ → not needed any more (replaced by Cloudflare) | 27 Nov |
| ✅ | **Step 5** — Expo robot `github-actions` + its key saved on GitHub as `EXPO_TOKEN` (Claude checked the name) | 27 Nov |
| ✅ | **Namecheap contact email verified** (the domain can't be suspended for that any more) | 27 Nov |
| ✅ | **Checked the promo videos:** they show **www.udvasito.com** — fine: Claude set Cloudflare to forward www.udvasito.com to udvasito.com and tested it | 27 Nov |
| ✅ | Cloudflare confirmed: **"Your domain is now protected by Cloudflare"** (udvasito.com is active there) | 27 Nov |
| ✅ | Said **merge** for pull request #2 after its review + fixes (Claude merged it once GitHub's checks passed) | 27 Nov |
| ✅ | Told Claude your test phone: **iQOO Z10 Turbo Pro** | 27 Nov |
| ✅ | Said **"do the recommendations"** → questions Q-004, Q-006, Q-007, Q-008, Q-009 settled | 27 Nov |
| ✅ | Said **start the next phase** → P1 (the first real version) has started | 27 Nov |
| ✅ | Said **merge** for pull request #3 (P1, after its review + 6 fixes) and **yes** to Cloudflare ↔ GitHub; typed GitHub's email code | 28 Nov |
| ✅ | Answered **Q-022 … Q-026** ("your recommendation") | 28 Nov |
| ✅ | Said **"yes build"** → the first phone app was built (the first try stopped on a setting; Claude fixed it and used the spare build) | 28 Nov |
| ✅ | **Step 5** — installed the test app on the iQOO phone; Google sign-in worked; sent the screenshot of the "accept the terms" screen | 28 Nov |
| ✅ | Decided: **Claude writes the privacy notice and terms** (English + Bangla); a law teacher reads them before the real website goes live | 28 Nov |

> 💡 Namecheap **auto-renew is off** — the domain is paid until **26 Nov 2027**. Turning it on is your choice (it uses
> the card saved at Namecheap — the project's one yearly payment). Claude will remind you in October 2027.

---

## ⏳ Later (Claude will tell you when)
- ⏳ **One key for the real website:** you copy a "deploy key" from Convex and paste it into Cloudflare (Claude shows
  you exactly where). Before the real website **udvasito.com** goes live, Claude asks you first.
- ⏳ **The real Telegram bot** (same taps as 👉 3, name `UDVASITO`, username `udvasito_bot` or similar) — just
  before the real website goes live; its token goes into the **udvasito-prod** project instead.
- ⏳ **Gemini AI key:** you create it in Google AI Studio and paste it into Convex (Claude shows where).
- ⏳ **Law teacher's read** of the privacy notice and terms (member 4 arranges it): before the real website goes live,
  the teacher reads them at **https://staging.udvasito.com/privacy** and **/terms** (both languages) and sends notes;
  Claude puts the fixes in. Nothing goes to the real website before this.
- ⏳ **Sign in once** on the app with **udvasitobd@gmail.com** → Claude makes that account the first super-admin.

---

## 👥 Jobs for the team (pass these on)
Every job for members 2–5 is now in one shared doc: **UDVASITO team to-do** → https://claude.ai/artifact/PJT9GL12qaHMyQ63Tw2L6v
- It has a table of the **11 jobs that must be finished before the first campus drive** (with a Status column the
  team changes themselves), then one checklist per member with plain step-by-step instructions, and a second tab
  **Bangla to check** where member 3 types fixes next to each Bangla line Claude wrote.
- 🔒 Only you can open the link until you share it: open it → **Share** (top right) → add the members, or copy the link.
- When someone sends you their work (the hospital sheet, the legal text, Bangla fixes…), give it to Claude in the chat;
  Claude puts it into the app and ticks the job in the doc.
- Team numbers: **member 1 = you (developer)**, member 2 = recruitment, member 3 = Bangla, FAQ and testing,
  member 4 = operations and data protection, member 5 = presentation. (Claude wrote "member 1" for the Bangla
  review by mistake earlier; it is member 3.)

## ❓ Questions waiting for you / the team
See `docs/questions.md` — Claude writes each question with a recommended answer. You said "do the recommendations",
so Claude follows them unless you say otherwise. Still waiting on people: **Q-005** (member 3's texts), **Q-009**
(the law teacher's read of the draft Claude wrote — member 4 arranges it), **Q-010** (two more phones).
- ✅ Q-011, Q-012, Q-013, Q-014 — you answered (recommended options; "default Bangla translation everywhere").
- 🟦 **Q-015** (one verified account per phone number), **Q-017** (what the Telegram bot says), **Q-018** (donor
  form words; the health-data consent follows the main consent version) and **Q-019** (request form words; a request
  shows "verified" only when its contact number is your own verified number) — Claude used the
  recommendation; just read them and say if you want something different.
- 🟦 **Q-020, Q-021** — words Claude chose for push alerts and answering a request. Claude used the recommendation;
  read them if you like.
- ✅ **Q-022 … Q-026** — you said "your recommendation" (28 Nov): copy-number button on Android (arrives with the next
  app build), "No longer needed" message to donors who already said yes, and Q-024/025/026 kept as built.
- ❓ **Q-016** — when a volunteer says "It doesn't match", should the person see a short message? Claude suggests yes
  (option A, the text is in the file). Until you answer, the screen simply shows the button again.

---

## Good to know
- **How to run a command:** in VS Code (or Windows Terminal) open the folder `E:\ROUGH CODING\Udvasito new`, type the
  command and press **Enter**. Inside Claude Code you can type `!` and then the command (for example
  `! npx convex login`) — then Claude sees the output too.
- **Google sign-in "Testing" mode:** only listed test accounts can sign in for now (udvasitobd@gmail.com). To test
  with your own Gmail: Google Cloud → **Audience** → **Test users** → **+ Add users** → type it → **Save**. Before the
  real launch Claude asks you to switch it to **In production**.
- **Google security checks** ("Is it you?", phone codes) are always yours — Claude is not allowed to do them.

## Glossary (short)
- **Convex** = our database + server (free).
- **Cloudflare** = puts the website online at udvasito.com and runs its "address book" (DNS) (free).
- **Namecheap** = where the name udvasito.com is registered (the only thing we pay for, once a year).
- **Nameservers / DNS** = the internet's address book that says where udvasito.com lives. Ours now points to Cloudflare.
- **Expo / EAS** = builds the Android app file (APK) (free, 15 builds a month).
- **Staging** = our private test copy (staging.udvasito.com). **Production** = the real app people use (udvasito.com).
- **PR (pull request)** = a proposed change to the code. Claude never merges one before it has been reviewed and fixed.
