import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { test, expect, type Locator, type Page } from '@playwright/test';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const QA_DIR = path.join(ROOT, 'qa');

async function openSection(page: Page, section: string): Promise<void> {
  await page.goto(`/#/${section}`);
  await expect(page.getByTestId(`row-${section}-1`)).toBeVisible();
  await page.evaluate(() => document.fonts.ready);
}

// Scroll so the target sits near the top, leaving room for any sticky header.
async function scrollToTop(locator: Locator, offset = 120): Promise<void> {
  await locator.first().evaluate((el: HTMLElement, off: number) => {
    el.scrollIntoView({ block: 'start' });
    window.scrollBy(0, -off);
  }, offset);
}

async function save(page: Page, file: string): Promise<void> {
  fs.mkdirSync(QA_DIR, { recursive: true });
  const out = path.join(QA_DIR, file);
  await page.screenshot({ path: out, animations: 'disabled', caret: 'hide' });
  console.log(`saved ${path.relative(ROOT, out)}`);
}

test.describe('desktop 1440x900 screenshots', () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  test('desktop-1440-normal.png', async ({ page }) => {
    await openSection(page, '2.0');
    await scrollToTop(page.getByTestId('row-2.0-1'));
    await save(page, 'desktop-1440-normal.png');
  });

  test('desktop-1440-blind.png', async ({ page }) => {
    await openSection(page, '2.0');
    await page.getByTestId('toggle-blind').click();
    await expect(page.getByText('譯本 A').first()).toBeVisible();
    await scrollToTop(page.getByTestId('row-2.0-1'));
    await save(page, 'desktop-1440-blind.png');
  });

  test('desktop-1440-english.png', async ({ page }) => {
    await openSection(page, '2.0');
    await page.getByTestId('toggle-en').click();
    await expect(page.getByTestId('toggle-en')).toHaveAttribute('aria-pressed', 'true');
    await scrollToTop(page.getByTestId('row-2.0-1'));
    await save(page, 'desktop-1440-english.png');
  });

  test('desktop-1440-2.1-placeholder.png', async ({ page }) => {
    await openSection(page, '2.1');
    const ph = page.locator('[data-testid="placeholder-missing"]').first();
    await expect(ph).toBeVisible();
    await scrollToTop(ph);
    await save(page, 'desktop-1440-2.1-placeholder.png');
  });
});

test.describe('phone 402x874 screenshots', () => {
  test.use({ viewport: { width: 402, height: 874 } });

  test('phone-402-normal.png', async ({ page }) => {
    await openSection(page, '2.0');
    await scrollToTop(page.getByTestId('row-2.0-1'));
    await save(page, 'phone-402-normal.png');
  });

  test('phone-402-blind.png', async ({ page }) => {
    await openSection(page, '2.0');
    await page.getByTestId('toggle-blind').click();
    await expect(page.getByText('譯本 A').first()).toBeVisible();
    await scrollToTop(page.getByTestId('row-2.0-1'));
    await save(page, 'phone-402-blind.png');
  });

  test('phone-402-english.png', async ({ page }) => {
    await openSection(page, '2.0');
    await page.getByTestId('toggle-en').click();
    await expect(page.getByTestId('toggle-en')).toHaveAttribute('aria-pressed', 'true');
    await scrollToTop(page.getByTestId('row-2.0-1'));
    await save(page, 'phone-402-english.png');
  });
});
