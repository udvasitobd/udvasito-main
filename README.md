# উদ্ভাসিত · UDVASITO

**One request. The right donor. Minutes, not hours.**

UDVASITO is a free, bilingual (English / বাংলা) blood-donor platform for Bangladesh, starting in Chattogram.
A family posts one request — by typing, speaking or pasting — and the nearest matching donors are alerted in waves.
Phone numbers are shared only when a donor says yes. If nobody answers in 30 seconds, a volunteer steps in.

- Web: **https://udvasito.com** · Android: APK from https://udvasito.com/download
- A student initiative · University of Chittagong
- UDVASITO connects people; it is **not** a blood bank or a medical service.

## Stack
Expo SDK 57 (Android + web from one codebase) · Expo Router · TypeScript · NativeWind v4 · Convex (EU) ·
Better Auth (Google) · Expo Push + Web Push · Gemini Flash-Lite (suggestions only, redacted input) · Cloudflare Workers · EAS.
Every service runs on a free tier (৳0). Details: [`docs/ADRs.md`](docs/ADRs.md).

## Run it locally
Requirements: Node.js 22 LTS or newer, git.

```bash
npm install
npm run convex     # starts your Convex dev deployment (first run asks you to log in)
npm run dev        # Expo dev server — press w for web
```

| Command | Does |
|---|---|
| `npm run dev` | Expo dev server (web + dev client) |
| `npm run convex` | `npx convex dev` against your dev deployment of `udvasito-staging` |
| `npm run check` | Type check + ESLint (incl. i18n lint) + Vitest |
| `npm test` | Vitest only |
| `npm run test:e2e` | Playwright web smoke test against `dist/` (run `build:web` first; uses your installed Chrome). P6 adds the practice-area flow |
| `npm run copy:extract` | Regenerate `en.json` / `bn.json` from the copy tables in `docs/specs.md` |
| `npm run content:build` | `src/content/*.md` → `src/content/generated/*.json` |
| `npm run places:build` | `data/sources/places/*` → `data/places.json` (after the team edits the metro-thana list) |
| `npm run seed:places` · `seed:settings` · `import:hospitals` | Idempotent reference-data loaders (`-- --prod` = the project's prod deployment; `seed:settings` reads staging/production from the deployment's `SITE_URL`) |
| `npm run seed:staging` | Fake data for **staging only** (refuses production) |
| `npm run build:web` | Static web export for Cloudflare Workers (`dist/`) |

## Reference data
Places come from open datasets (BBS / UN OCHA via nuhil/bangladesh-geocode, bd-geocode-with-lat-long) — sources,
licences and credits in [`docs/data-licences.md`](docs/data-licences.md). Hospitals come from the team's own list,
`data/hospitals.csv` ([`docs/roadmap.md`](docs/roadmap.md) §5.1).

## Documents
Everything the product does is decided in [`docs/`](docs/): vision, user stories, PRD, ADRs, specs, roadmap and build
prompts. Open questions live in [`docs/questions.md`](docs/questions.md).

## Privacy
No phone number ever appears in logs, analytics, push text, error reports or AI input. Health data is limited to what
`docs/specs.md` lists. Secrets live only in Convex / Cloudflare / EAS environment variables — never in this repository.

## Licence
Code: [MIT](LICENSE). Name and logo © 2026 Team UDVASITO.
