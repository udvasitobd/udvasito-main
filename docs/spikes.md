# Spikes (roadmap P0)

Each spike is time-boxed to 1 hour. The result and the decision that follows are written here; the decision is the
one the roadmap already names for "if it fails", so no spike changes a product rule by itself.

| # | Question | Needs | Status |
|---|---|---|---|
| S1 | Bangla (`bn-BD`) speech recognition on the 3 test phones and in Chrome | test phones (DEP-14), APK build #1 | ⏳ Chrome part can run now (human); phones wait for build #1 |
| S2 | Push reaches a locked Xiaomi/Redmi with default battery settings | Firebase FCM, APK build #1, a Xiaomi/Redmi phone | ⏳ waiting for FCM + build #1 |
| S3 | Google sign-in callback through `udvasito.com` (Vercel rewrite to the Convex site) | Vercel account + domain, Google OAuth client | ⏳ waiting for Vercel (2026-11-28) |
| S4 | Gemini free-tier call from a Convex action (EU) returns JSON with the current Flash-Lite model ID | Gemini API key in the Convex env | ⏳ waiting for the key |

---

## S1 — Bangla speech recognition
**Method.**
1. *Chrome (desktop and Android Chrome):* the developer speaks three test sentences into a Web Speech API page with
   language `bn-BD` — (a) "আমার এ পজিটিভ রক্ত লাগবে", (b) "চট্টগ্রাম মেডিকেল কলেজ হাসপাতালে, দুই ব্যাগ", (c) a phone-free
   sentence of their own. Record: recognised at all? words right? time to first result.
2. *Phones:* in APK build #1, the voice button (`expo-speech-recognition`, locale `bn-BD`) on each test phone, same
   three sentences, also with mobile data only. Record `getSupportedLocales()` and whether on-device recognition exists.

**If it fails on a device:** voice shows "not available" there (already specified); the judging walkthrough uses a
phone where it works.

**Result:** — (not run yet)

## S2 — Push to a locked Xiaomi/Redmi
**Method.** APK build #1 with FCM, default battery settings, app swiped away, screen locked 10 minutes, then send a
`blood_alert` channel push from staging; repeat after 1 hour locked. Record: arrived? sound? heads-up? delay.

**If it fails:** raise the priority of the alert guide (P4) and the in-app banner `donor.alertsOff`.

**Result:** — (not run yet)

## S3 — Google sign-in shows udvasito.com
**Method.** On the Vercel staging project, rewrite `/api/auth/*` to the Convex site (`<deployment>.convex.site`), set
Better Auth's base URL to the web address, add `https://staging.udvasito.com/api/auth/callback/google` as a redirect
URI, and sign in. Check: Google's screen names our domain, the session cookie is set, Android sign-in still works.

**If it fails:** keep the Convex site address on Google's screen for the pilot (R-12).

**Result:** — (not run yet)

## S4 — Gemini Flash-Lite from a Convex action
**Method.** A one-off internal action on the dev deployment calls the Gemini API (free tier, key from the Convex env)
with a redacted sample request text, asks for JSON (`responseMimeType: application/json`), and records the model IDs
that answer, the latency and whether the EU region is accepted. The working IDs go into `settings.ai.models` (seeded
now as `gemini-flash-lite-latest` / `gemini-flash-latest`, to be confirmed here).

**If it fails:** record the working model ID; if blocked, AI stays off and the rules parser carries intake (R-06).

**Result:** — (not run yet)
