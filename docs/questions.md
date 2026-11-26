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
**Answer (2026-11-27, developer): B — use the new domain everywhere.** Written as ADR-023; all docs switched to `udvasito.com`; staging web = `staging.udvasito.com`.
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
