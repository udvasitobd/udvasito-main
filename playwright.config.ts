/**
 * npm run test:e2e — web smoke test against the static web export (`dist/`, built by `npm run build:web`), served
 * by scripts/serve-dist.ts the way Cloudflare serves it (SPA fallback, public/_headers incl. CSP — ADR-024).
 * Uses the installed Google Chrome (no browser download). Port 8081 because the dev deployment's SITE_URL — and so
 * Better Auth's trusted origin — is http://localhost:8081.
 * P6 extends this to the practice-area flow (post → match → accept) in CI before every production deploy.
 */
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: 'e2e',
  timeout: 30_000,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL: 'http://localhost:8081',
    channel: 'chrome',
    headless: true,
    locale: 'en-US',
  },
  webServer: {
    command: 'npx tsx scripts/serve-dist.ts --port 8081',
    url: 'http://localhost:8081',
    reuseExistingServer: false,
    timeout: 120_000,
  },
});
