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

### Step 2 — Log in to Convex and Expo from this computer (2 commands) — ✅ done (Claude checked both)
**Why:** these let Claude create the database and the Android builds from your PC.
1. Run `npx convex login` → a browser page opens → click **Log in with GitHub/Google** using the team account → when it
   says "Success", go back to the terminal.
2. Run `npx eas-cli@latest login` → type the Expo username **udvasitos-team** and its password (you type it — not Claude).

### Step 3 — Tell Claude your test phones
**Why:** we need to test Bangla voice and lock-screen alerts on real phones (one cheap 2 GB phone, ideally one Xiaomi/Redmi).
Just write in the chat: phone brand + model + Android version for each phone.

---

### Step 3b — Give Convex the Google sign-in secrets (10 minutes) — ✅ done 27 Nov (Claude checked it: sign-in works)
**Why:** Claude created two Google sign-in "clients": **UDVASITO staging (dev + staging)** for testing and
**UDVASITO production** for the real app. Each has a **secret** (like a password), so **you** copy it from Google
straight into Convex. It never goes into the chat or the code.

**A. The testing secret (goes into 2 places)**
1. Open https://console.cloud.google.com/auth/clients?project=udvasito-516006 → click **UDVASITO staging (dev + staging)**.
   On the right, under **Client secrets**, click **+ Add secret**. A new secret appears with a **copy** button
   (two small squares) → click it.
2. Open https://dashboard.convex.dev/d/wry-tern-774/settings/environment-variables → **+ Add** →
   Name: `GOOGLE_CLIENT_SECRET` → Value: **Ctrl + V** → **Save**.
3. Open https://dashboard.convex.dev/d/outstanding-grasshopper-711/settings/environment-variables (this is **staging**)
   → **+ Add** → Name: `GOOGLE_CLIENT_SECRET` → Value: **Ctrl + V** (the same secret) → **Save**.
4. Back on Google Cloud: the **older** secret (it ends in **LH4C** — nobody has ever seen it) → **Disable**, then
   **Delete**. Keep the new one.

**B. The production secret (goes into 1 place)**
5. Google Cloud clients list → click **UDVASITO production** → **+ Add secret** → copy it.
6. Open https://dashboard.convex.dev/d/striped-starling-176/settings/environment-variables (this is **production** —
   the purple "Production" label) → **+ Add** → Name: `GOOGLE_CLIENT_SECRET` → Value: **Ctrl + V** → **Save**.
7. Back on Google Cloud: the **older** production secret (it ends in **zrYy** — nobody has seen it) → **Disable**,
   then **Delete**.
8. Tell Claude "step 3b done". Claude then tests "Continue with Google" on the web app.

> While the app is in Google's **Testing** mode only listed test accounts can sign in (now: udvasitobd@gmail.com).
> To test with your own Gmail: Google Cloud → **Audience** → **Test users** → **+ Add users** → type it → **Save**.
> Before the real launch Claude asks you to switch it to **In production**.

### Step 3c — Give Convex the Cloudinary key (5 minutes, can wait a few days)
**Why:** Cloudinary makes the picture people share on Facebook/WhatsApp when someone needs blood. Claude created the
free account (cloud name **udvasito**). Its **API key + API secret** work like a password, so **you** copy them.
1. Open https://console.cloudinary.com → sign in with Google (**udvasitobd@gmail.com**) → ⚙️ **Settings** (bottom
   left) → **API Keys**. You see a row with an **API Key** (numbers) and an **API Secret** (hidden — click the eye or
   the copy button).
2. Open https://dashboard.convex.dev/d/outstanding-grasshopper-711/settings/environment-variables (**staging**) →
   **+ Add** → Name `CLOUDINARY_API_KEY` → Value: paste the API Key → **Save**. Again **+ Add** → Name
   `CLOUDINARY_API_SECRET` → Value: paste the API Secret → **Save**.
3. Do the same two on https://dashboard.convex.dev/d/wry-tern-774/settings/environment-variables (testing) and
   https://dashboard.convex.dev/d/striped-starling-176/settings/environment-variables (**production**).
4. Tell Claude "step 3c done".

---

## 🟡 Tomorrow (Sat 28 Nov)

### Step 4 — Create the Vercel account (website hosting, free)
**Why:** Vercel puts the web app online at **udvasito.com** (your Namecheap domain is connected to it later).
1. Go to https://vercel.com/signup → choose **Hobby (free)** → **Continue with GitHub** → sign in as the
   **udvasitobd** GitHub account.
2. Do **not** add a card. Tell Claude when you are in — Claude does the rest (import the repo, settings, keys).

### Step 5 — Let GitHub build the Android app (one secret, 3 minutes)
**Why:** the "Android local build" button on GitHub builds the APK for free on GitHub's computers. It needs an Expo key.
A key is like a password, so **you** create it and paste it straight into GitHub (never into the chat).
1. Go to https://expo.dev → sign in as **udvasitos-team** → click the account picture (top right) → **Account settings**
   → **Access tokens** → **Create token** → name it `github-actions` → **Create** → click **Copy**.
2. Go to https://github.com/udvasitobd/udvasito-main/settings/secrets/actions → **New repository secret**.
3. Name: `EXPO_TOKEN` · Secret: paste (Ctrl + V) → **Add secret**.
4. Tell Claude "step 5 done". Claude adds the non-secret project id itself.

### Step 6 — Android notifications + the app's signing key (15 minutes, before the first app build)
**Why:** Claude set up Firebase (Google's free phone-notification service) for **org.udvasito.app**. Three files are
like passwords, so **you** move them: Firebase's settings file, Firebase's "push key", and the app's **signing key**
(Expo creates it — it proves every future update really comes from us; Expo keeps it safe).

**A. Upload the Firebase settings file to Expo**
1. Open https://expo.dev/accounts/udvasitos-team/projects/udvasito/environment-variables → **Add variables**.
2. Name: `GOOGLE_SERVICES_JSON`. Next to the Value box click the small **file** icon → choose
   `C:\Users\User\Downloads\udvasito-google-services.json` (Claude downloaded and renamed it — **not** the older
   `google-services.json` in the same folder, that one is from something else).
3. Visibility: **Secret**. Environments: tick **production**, **preview** and **development** → **Add variables**.

**B. Create Firebase's push key (it downloads a file)**
4. Open https://console.firebase.google.com/project/udvasito-516006/settings/serviceaccounts/adminsdk →
   **Generate new private key** → **Generate key**. A file like `udvasito-516006-firebase-adminsdk-….json` downloads.
   ⚠️ This file is a real secret: never put it in the project folder, the chat or GitHub.

**C. Create the signing key and give Expo the push key (in a terminal)**
5. In the terminal (see "How to run a command") run: `npx eas-cli@latest credentials -p android`
6. Use the arrow keys + Enter:
   - "Which build profile…" → **production**
   - **Keystore: Manage everything needed to build your project** → **Set up a new keystore** → press Enter to accept
     the suggested name → **Generate a new keystore**. (It says "Created keystore".)
   - Back in the menu: **Google Service Account** → **Manage your Google Service Account Key for Push Notifications
     (FCM V1)** → **Set up a Google Service Account Key for Push Notifications (FCM V1)** → **Upload a new service
     account key** → when it asks for the path, type the full path of the file from step 4, for example
     `C:\Users\User\Downloads\udvasito-516006-firebase-adminsdk-xxxxx.json` → Enter.
   - **Exit**.
7. Delete both files from Downloads (`udvasito-google-services.json` and the `…firebase-adminsdk….json` file) — Expo
   has them now. Then empty the Recycle Bin.
8. Tell Claude "step 6 done". Claude checks it on the Expo website (it shows only names, never the secrets).

---

## 🟢 Later (Claude will tell you when)
- Install the first test app (APK) on your phones: Claude will send you a link; open it on the phone → **Download** →
  **Install** (Android may ask "Allow from this source?" → allow).
- Sign in once on the app with **udvasitobd@gmail.com**, then Claude makes that account the first super-admin.

---

## 👥 Jobs for the team (pass these on)
- **Member 2 — hospital list (DEP-01):** fill `data/hospitals.csv` (the first line already has the column names; the
  rules are in `docs/roadmap.md` §5.1). Blood-bank numbers: **only the hospital's public number, never a person's.**
  Then run `npm run import:hospitals -- --check-only` — it lists every row that needs fixing, by line number.
- **Member 2 — city thanas:** open `data/sources/places/chattogram-metro-thanas.csv` and check the 15 thana names
  against the Chattogram Metropolitan Police list. **Akbar Shah** is missing its location: in Google Maps right-click
  the middle of Akbar Shah thana → click the numbers at the top (they are copied) → paste them into the `lat,lng`
  columns of that row (first number = lat, second = lng). Then tell Claude.
- **Member 1 — missing text:** `docs/questions.md` Q-005 lists 4 small texts that need English + Bangla wording.

## ❓ Questions waiting for you / the team
See `docs/questions.md` — Claude writes each question with a recommended answer. You only reply "OK" or pick another option.
Waiting now: **Q-004, Q-005, Q-006** and the small confirm in **Q-007** (all already built the recommended way —
a short "OK" is enough).

## Glossary (short)
- **Convex** = our database + server (free).
- **Vercel** = puts the website online (free).
- **Expo / EAS** = builds the Android app file (APK) (free, 15 builds a month).
- **Staging** = our private test copy. **Production** = the real app people use.
- **PR (pull request)** = a proposed change to the code. Claude never merges one before it has been reviewed and fixed.
