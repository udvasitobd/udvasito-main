/**
 * Web smoke test (P0): the signed-out shell works, switches language, guards signed-in pages and passes axe.
 * Since the privacy notice and terms exist (Q-009), a first visit meets the consent gate G3 (`/welcome`) before the
 * session gate G4 (`/sign-in`) — specs §1.5.
 */
import { AxeBuilder } from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';

function collectErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(`console: ${m.text()}`);
  });
  return errors;
}

test('a first visit opens the welcome (consent) screen, and sign-in works, without errors', async ({ page }) => {
  const errors = collectErrors(page);
  await page.goto('/');
  await expect(page).toHaveURL(/\/welcome/);
  await expect(page.getByText('Welcome to UDVASITO', { exact: true })).toBeVisible();
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  await page.goto('/sign-in');
  await expect(page.getByText('Sign in', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Continue with Google' })).toBeVisible();
  expect(errors).toEqual([]);
});

test('the language switch changes the text and html lang, and is remembered', async ({ page }) => {
  await page.goto('/sign-in');
  const bangla = page.getByRole('radio', { name: 'বাংলা' });
  await expect(bangla).toHaveAttribute('aria-checked', 'false');
  await bangla.click();
  await expect(bangla).toHaveAttribute('aria-checked', 'true');
  await expect(page.locator('html')).toHaveAttribute('lang', 'bn');
  await expect(page.getByText('সাইন ইন করুন', { exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByText('সাইন ইন করুন', { exact: true })).toBeVisible();
  await page.getByRole('radio', { name: 'English' }).click();
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
});

test('a signed-in page sends a new visitor to the consent gate and keeps where they were going', async ({ page }) => {
  await page.goto('/home');
  await expect(page).toHaveURL(/\/welcome\?next=%2Fhome$/);
});

test("a newer website shows the update bar with What's new; Later hides it (CMP-UpdateBanner, Q-028)", async ({
  page,
}) => {
  const errors = collectErrors(page);
  // The live notes file says a newer release is out than the one this page was built with.
  await page.route('**/whats-new.json', async (route) => {
    const built = (await (await route.fetch()).json()) as { releases: { id: number }[] };
    const newest = Math.max(...built.releases.map((r) => r.id)) + 1;
    await route.fulfill({
      json: { releases: [{ id: newest, date: '2026-11-29', en: ['A test change'], bn: ['একটি পরীক্ষার পরিবর্তন'] }] },
    });
  });
  await page.goto('/sign-in');
  await expect(page.getByText('New version available', { exact: true })).toBeVisible();
  const axe = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
    .analyze();
  const serious = axe.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical');
  expect(serious.map((v) => `${v.id}: ${v.nodes.length} node(s)`)).toEqual([]);
  await page.getByRole('button', { name: "What's new" }).click();
  const whatsNew = page.getByRole('dialog', { name: "What's new" });
  await expect(whatsNew.getByText('A test change')).toBeVisible();
  // Escape closes it once the dialog has finished opening (react-native-web listens from then on).
  await expect(async () => {
    await page.keyboard.press('Escape');
    await expect(whatsNew).toBeHidden({ timeout: 500 });
  }).toPass();
  await page.getByRole('button', { name: 'Later' }).click();
  await expect(page.getByText('New version available', { exact: true })).toBeHidden();
  expect(errors).toEqual([]);
});

test('the same website shows no update bar', async ({ page }) => {
  await page.goto('/sign-in');
  await expect(page.getByRole('button', { name: 'Continue with Google' })).toBeVisible();
  await page.waitForResponse((r) => r.url().endsWith('/whats-new.json')).catch(() => undefined);
  await expect(page.getByText('New version available', { exact: true })).toBeHidden();
});

test('the sign-in screen has no serious accessibility problems (axe, WCAG 2.2 AA)', async ({ page }) => {
  await page.goto('/sign-in');
  await expect(page.getByRole('button', { name: 'Continue with Google' })).toBeVisible();
  const result = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
    .analyze();
  const serious = result.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical');
  expect(serious.map((v) => `${v.id}: ${v.nodes.length} node(s)`)).toEqual([]);
});

test('crawlers get the app for app addresses and a 404 for missing files, with the security headers', async ({
  request,
}) => {
  // APIRequestContext sends no Sec-Fetch-Mode, like WhatsApp/Facebook previews and search bots (review of PR #2).
  const page = await request.get('/learn/dengue');
  expect(page.status()).toBe(200);
  expect(await page.text()).toContain('<div id="root">');
  expect(page.headers()['x-frame-options']).toBe('DENY');
  expect(page.headers()['strict-transport-security']).toContain('max-age=');
  for (const missing of ['/_expo/static/js/web/entry-missing.js', '/robots.txt', '/api/r/abc', '/%E0%A4.js']) {
    const response = await request.get(missing);
    expect(response.status(), missing).toBe(404);
    expect(response.headers()['x-content-type-options'], missing).toBe('nosniff');
  }
});

test('the page ships no inline scripts (CSP script-src self)', async ({ request }) => {
  const html = await (await request.get('/')).text();
  expect(html).not.toMatch(/<script(?![^>]*\bsrc=)[^>]*>/i);
});
