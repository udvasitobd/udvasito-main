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

_Last updated: Fri 27 Nov 2026._

> 🔒 **Golden rules**
> 1. **Never enter a credit/debit card** on any website for this project. If a site asks for a card, stop and tell Claude.
> 2. **Never paste a password, key or token into the chat.** Claude tells you where to paste it instead (a website's
>    "secrets" or "environment variables" page). The code is public on GitHub — anything pasted into code is public.
> 3. Use the team Gmail **udvasitobd@gmail.com** for every new account.

---

## 👉 Do now

### 👉 1. Say "yes" to connecting Cloudflare to GitHub
**Why:** then the test website **staging.udvasito.com** builds itself from the code. Claude opens the page in Chrome;
you only click **Install & Authorize** (it lets Cloudflare read the code and show build results on GitHub; Claude shows
you the exact permissions on the page before you click). Write **yes** in the chat.

### 👉 2. Pass on the team jobs below 👥
Most urgent: **member 4's privacy notice + terms draft** (English + Bangla). Without it the app cannot show its
consent screen to real people (Q-009). Then the hospital list, two more test phones, and member 1's texts.

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

> 💡 Namecheap **auto-renew is off** — the domain is paid until **26 Nov 2027**. Turning it on is your choice (it uses
> the card saved at Namecheap — the project's one yearly payment). Claude will remind you in October 2027.

---

## ⏳ Later (Claude will tell you when)
- ⏳ **One key for the real website:** you copy a "deploy key" from Convex and paste it into Cloudflare (Claude shows
  you exactly where). Before the real website **udvasito.com** goes live, Claude asks you first.
- ⏳ **The real Telegram bot** (same taps as 👉 3, name `UDVASITO`, username `udvasito_bot` or similar) — just
  before the real website goes live; its token goes into the **udvasito-prod** project instead.
- ⏳ **Gemini AI key:** you create it in Google AI Studio and paste it into Convex (Claude shows where).
- ⏳ **Install the first test app (APK)** on your phones: Claude sends a link; open it on the phone → **Download** →
  **Install** (Android may ask "Allow from this source?" → allow). Claude asks before using a build (15 a month).
- ⏳ **Sign in once** on the app with **udvasitobd@gmail.com** → Claude makes that account the first super-admin.

---

## 👥 Jobs for the team (pass these on)
- 👥 **Member 4 — privacy notice + terms draft (DEP-02), MOST URGENT:** English + Bangla, four files:
  `src/content/legal/privacy.en.md`, `privacy.bn.md`, `terms.en.md`, `terms.bn.md`. Each starts with
  `version: 2026-11-28-pilot` and `effective: 2026-11-28` (format in `docs/roadmap.md` §5.4). A law teacher reads it
  for 30 minutes before real people use the app. Send the text to the developer if editing files is hard.
- 👥 **Anyone — two more Android test phones (DEP-14):** the first real test needs 3 phones (one asks for blood, two
  answer). Best: one cheap phone with 2 GB memory and one Xiaomi/Redmi. Tell Claude brand + model.
- 👥 **Member 5 — final app icon (DEP-11)** before the first app for real people.
- 👥 **Member 2 — hospital list (DEP-01):** fill `data/hospitals.csv` (the first line already has the column names; the
  rules are in `docs/roadmap.md` §5.1). Blood-bank numbers: **only the hospital's public number, never a person's.**
  Then run `npm run import:hospitals -- --check-only` — it lists every row that needs fixing, by line number.
- 👥 **Member 2 — city thanas:** open `data/sources/places/chattogram-metro-thanas.csv` and check the 15 thana names
  against the Chattogram Metropolitan Police list. **Akbar Shah** is missing its location: in Google Maps right-click
  the middle of Akbar Shah thana → click the numbers at the top (they are copied) → paste them into the `lat,lng`
  columns of that row (first number = lat, second = lng). Then tell Claude.
- 👥 **Member 1 — missing text:** `docs/questions.md` Q-005 lists 4 small texts that need English + Bangla wording.
- 👥 **Member 1 — check Claude's Bangla:** where the plan had English only, Claude wrote the Bangla itself (you said
  "use the default Bangla translation"). Please read these tables and fix any word that sounds wrong: `docs/questions.md`
  **Q-014** (tab bar, More, Settings, download page) and **Q-017** (the 3 Telegram bot messages), plus the new line
  `home.verifyCta` "Verify / যাচাই করুন". Send corrections to the developer; Claude updates the files.

## ❓ Questions waiting for you / the team
See `docs/questions.md` — Claude writes each question with a recommended answer. You said "do the recommendations",
so Claude follows them unless you say otherwise. Still waiting on people: **Q-005** (member 1's texts), **Q-009**
(member 4's legal draft), **Q-010** (two more phones).
- ✅ Q-011, Q-012, Q-013, Q-014 — you answered (recommended options; "default Bangla translation everywhere").
- 🟦 **Q-015** (one verified account per phone number) and **Q-017** (what the Telegram bot says) — Claude used the
  recommendation; just read them and say if you want something different.
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
