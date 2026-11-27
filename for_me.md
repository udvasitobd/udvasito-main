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

### 👉 1. Step 5 — Let GitHub build the Android app (3 minutes)
**Why:** the "Android local build" button on GitHub builds the app file (APK) for free on GitHub's computers. GitHub
needs a key from Expo to do that. A key is like a password, so **you** click the buttons that create and paste it
(Claude never sees it). Claude has already opened the two pages and typed the names for you.

**In the Chrome tab "Access tokens — @udvasitos-team — Expo":**
1. A box **Create Robot** is open. The name `github-actions` and the role **Developer** are already filled in.
   Click the black **Create robot** button.
   _(A "robot" is a separate login only for GitHub. It can build the app but cannot change the team, members or
   settings — safer than using your own key.)_
2. The robot **github-actions** now appears in the list. Click **Create token** next to it (it may be behind the
   **⋯** button). If it asks for a name, type `github`; leave everything else as it is → **Create** / **Generate**.
3. A long line of letters (the token) appears **only once**. Click its **Copy** button.
   ⚠️ Don't take a screenshot of it and don't paste it anywhere else.

**In the Chrome tab "Add Actions secret · udvasitobd/udvasito-main" (GitHub):**
4. **Name** already says `EXPO_TOKEN`. Click inside the big **Secret** box → press **Ctrl + V** → click the green
   **Add secret** button.
5. Go back to the Expo tab and close the token window (**Done** / **×**).
6. Tell Claude **"step 5 done"**. Claude checks that GitHub shows the name `EXPO_TOKEN` (it never sees the value).

_Stuck on a button name? Tell Claude what you see — Claude looks at the page only when no token is on screen._

### 👉 2. Check the Namecheap "ALERT" (2 minutes)
On the Namecheap page of **udvasito.com** a yellow **ALERT** sign is next to "Status & Validity". It usually means one
of two things:
- **Namecheap sent an email "Verify your contact information"** to the email of your Namecheap account. Open that inbox and click the link in the email. ⚠️ If it is not verified within **15 days** the
  domain stops working — so please check today.
- **Auto-renew is OFF.** The domain is paid until **26 Nov 2027**. Turning auto-renew on is your choice (it uses the
  card saved at Namecheap — this is the one yearly payment of the project). Claude will remind you in October 2027.

Tell Claude what you found (for example "verified" or "no email").

### 👉 3. Tell Claude your test phones
**Why:** we test Bangla voice input and lock-screen alerts on real phones (one cheap 2 GB phone, ideally also one
Xiaomi/Redmi). Just write in the chat: **phone brand + model + Android version** for each phone.

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

---

## ⏳ Later (Claude will tell you when)
- ⏳ **Read the code review and say "merge"** for the next pull request (Cloudflare + today's work). Claude never merges
  before the review and fixes are done.
- ⏳ **Connect Cloudflare to GitHub (1 click):** Claude opens the page; you click **Install & Authorize** so Cloudflare
  can build the website from the repository. Then the test website appears at **staging.udvasito.com**.
- ⏳ **One key for the real website:** you copy a "deploy key" from Convex and paste it into Cloudflare (Claude shows
  you exactly where). Before the real website **udvasito.com** goes live, Claude asks you first.
- ⏳ **Telegram bot:** needs your phone's Telegram app for 2 minutes (talking to @BotFather).
- ⏳ **Gemini AI key:** you create it in Google AI Studio and paste it into Convex (Claude shows where).
- ⏳ **Install the first test app (APK)** on your phones: Claude sends a link; open it on the phone → **Download** →
  **Install** (Android may ask "Allow from this source?" → allow). Claude asks before using a build (15 a month).
- ⏳ **Sign in once** on the app with **udvasitobd@gmail.com** → Claude makes that account the first super-admin.

---

## 👥 Jobs for the team (pass these on)
- 👥 **NEW — whoever made the promo videos:** the last picture of the videos shows **udvasito.vercel.app**. That address
  does **not** exist (we moved to Cloudflare). Change it to **udvasito.com** and render the videos again **before
  sharing them**.
- 👥 **Member 2 — hospital list (DEP-01):** fill `data/hospitals.csv` (the first line already has the column names; the
  rules are in `docs/roadmap.md` §5.1). Blood-bank numbers: **only the hospital's public number, never a person's.**
  Then run `npm run import:hospitals -- --check-only` — it lists every row that needs fixing, by line number.
- 👥 **Member 2 — city thanas:** open `data/sources/places/chattogram-metro-thanas.csv` and check the 15 thana names
  against the Chattogram Metropolitan Police list. **Akbar Shah** is missing its location: in Google Maps right-click
  the middle of Akbar Shah thana → click the numbers at the top (they are copied) → paste them into the `lat,lng`
  columns of that row (first number = lat, second = lng). Then tell Claude.
- 👥 **Member 1 — missing text:** `docs/questions.md` Q-005 lists 4 small texts that need English + Bangla wording.

## ❓ Questions waiting for you / the team
See `docs/questions.md` — Claude writes each question with a recommended answer. You only reply "OK" or pick another
option. Waiting now: **Q-004, Q-005, Q-006** and the small confirm in **Q-007** (all already built the recommended
way — a short "OK" is enough).

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
