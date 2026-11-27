/**
 * Web smoke test (P0): the signed-out shell works, switches language, guards signed-in pages and passes axe.
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

test('signed out, the app opens the sign-in screen without errors', async ({ page }) => {
  const errors = collectErrors(page);
  await page.goto('/');
  await expect(page).toHaveURL(/\/sign-in/);
  await expect(page.getByText('Sign in', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Continue with Google' })).toBeVisible();
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
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

test('a signed-in page sends a signed-out visitor to sign-in and keeps where they were going', async ({ page }) => {
  await page.goto('/home');
  await expect(page).toHaveURL(/\/sign-in\?next=%2Fhome$/);
});

test('the sign-in screen has no serious accessibility problems (axe, WCAG 2.2 AA)', async ({ page }) => {
  await page.goto('/sign-in');
  await expect(page.getByRole('button', { name: 'Continue with Google' })).toBeVisible();
  const result = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']).analyze();
  const serious = result.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical');
  expect(serious.map((v) => `${v.id}: ${v.nodes.length} node(s)`)).toEqual([]);
});

test('the page ships no inline scripts (CSP script-src self)', async ({ request }) => {
  const html = await (await request.get('/')).text();
  expect(html).not.toMatch(/<script(?![^>]*\bsrc=)[^>]*>/i);
});
