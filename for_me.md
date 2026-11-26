# for_me.md — What YOU need to do (plain-language guide)

Hi! This file lists **only the things a human has to do**. Claude Code (the AI) does everything else.
Each step says **why** it is needed and **exactly what to click or type**. Do them in order.
When a step is finished, put an ✅ in front of it (or just tell Claude "step X done").

> 🔒 **Golden rules**
> 1. **Never enter a credit/debit card** on any website for this project. If a site asks for a card, stop and tell Claude.
> 2. **Never paste a password, key or token into the chat.** Claude will tell you where to paste it instead
>    (a website's "Environment variables" page). The code is public on GitHub — anything pasted into code is public.
> 3. Use the team Gmail **udvasitobd@gmail.com** for every new account.

---

## How to run a command (you will need this a few times)
1. In VS Code (or Windows Terminal) open the folder `E:\ROUGH CODING\Udvasito new`.
2. Type the command shown in grey boxes below and press **Enter**.
3. Tip: inside Claude Code you can also type `!` and then the command (for example `! npx convex login`)
   — then Claude can see the output too.

---

## 🔴 Right now (today, Fri 27 Nov)

### Step 1 — Keep Chrome signed in to the team Gmail
**Why:** Claude creates the free accounts (Google sign-in keys, Firebase, Telegram bot, etc.) through your Chrome
browser. It can only do that if Chrome is signed in as **udvasitobd@gmail.com**.
1. Open Chrome → click your profile picture (top right) → make sure **udvasitobd@gmail.com** is signed in on
   https://accounts.google.com.
2. Keep the Claude extension connected. If Google asks "Is it you?" or shows a phone/2-step check, **you** do that part
   (Claude is not allowed to handle security checks).

### Step 2 — Log in to Convex and Expo from this computer (2 commands)
**Why:** these let Claude create the database and the Android builds from your PC.
1. Run `npx convex login` → a browser page opens → click **Log in with GitHub/Google** using the team account → when it
   says "Success", go back to the terminal.
2. Run `npx eas-cli@latest login` → type the Expo username **udvasitos-team** and its password (you type it — not Claude).

### Step 3 — Tell Claude your test phones
**Why:** we need to test Bangla voice and lock-screen alerts on real phones (one cheap 2 GB phone, ideally one Xiaomi/Redmi).
Just write in the chat: phone brand + model + Android version for each phone.

---

## 🟡 Tomorrow (Sat 28 Nov)

### Step 4 — Create the Vercel account (website hosting, free)
**Why:** Vercel puts the web app online at `udvasito.vercel.app`.
1. Go to https://vercel.com/signup → choose **Hobby (free)** → **Continue with GitHub** → sign in as the
   **udvasitobd** GitHub account.
2. Do **not** add a card. Tell Claude when you are in — Claude does the rest (import the repo, settings, keys).

---

## 🟢 Later (Claude will tell you when)
- Install the first test app (APK) on your phones: Claude will send you a link; open it on the phone → **Download** →
  **Install** (Android may ask "Allow from this source?" → allow).
- Sign in once on the app with **udvasitobd@gmail.com**, then Claude makes that account the first super-admin.

---

## ❓ Questions waiting for you / the team
See `docs/questions.md` — Claude writes each question with a recommended answer. You only reply "OK" or pick another option.

## Glossary (short)
- **Convex** = our database + server (free).
- **Vercel** = puts the website online (free).
- **Expo / EAS** = builds the Android app file (APK) (free, 15 builds a month).
- **Staging** = our private test copy. **Production** = the real app people use.
- **PR (pull request)** = a proposed change to the code. Claude never merges one before it has been reviewed and fixed.
