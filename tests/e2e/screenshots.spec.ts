import fs from 'node:fs';
import path from 'node:path';
import { test, expect, type Page } from '@playwright/test';
import { QA_DIR, ROOT, openSection, scrollRowToStart } from './helpers';

async function save(page: Page, file: string): Promise<void> {
  fs.mkdirSync(QA_DIR, { recursive: true });
  const out = path.join(QA_DIR, file);
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path: out, animations: 'disabled', caret: 'hide' });
  console.log(`saved ${path.relative(ROOT, out)}`);
}

async function sectionMid(page: Page, section: string, row: string): Promise<void> {
  await openSection(page, section);
  await expect(page.getByTestId(row)).toBeVisible();
  await scrollRowToStart(page, row);
}

test.describe('desktop 1440x900 screenshots', () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  test('top-1440.png', async ({ page }) => {
    await openSection(page, '2.0');
    await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior }));
    await save(page, 'top-1440.png');
  });

  test('mid-1440-normal.png', async ({ page }) => {
    await sectionMid(page, '2.1', 'row-2.1-5');
    await save(page, 'mid-1440-normal.png');
  });

  test('mid-1440-blind.png', async ({ page }) => {
    await sectionMid(page, '2.1', 'row-2.1-5');
    await page.getByTestId('toggle-blind').click();
    await expect(page.getByTestId('toggle-blind')).toHaveAttribute('aria-pressed', 'true');
    await expect(page.getByText('譯本 A').first()).toBeVisible();
    await scrollRowToStart(page, 'row-2.1-5');
    await save(page, 'mid-1440-blind.png');
  });

  test('mid-1440-english.png', async ({ page }) => {
    await sectionMid(page, '2.1', 'row-2.1-5');
    await page.getByTestId('toggle-en').click();
    await expect(page.getByTestId('toggle-en')).toHaveAttribute('aria-pressed', 'true');
    await scrollRowToStart(page, 'row-2.1-5');
    await save(page, 'mid-1440-english.png');
  });

  test('table-1440.png', async ({ page }) => {
    await openSection(page, '2.0');
    const tableRow = page.locator('[data-testid^="row-2.0-"]').filter({ has: page.locator('table') }).first();
    await expect(tableRow, 'no row in 2.0 contains a <table>').toHaveCount(1);
    const tid = (await tableRow.getAttribute('data-testid')) ?? '';
    await scrollRowToStart(page, tid);
    await tableRow.screenshot({ path: path.join(QA_DIR, 'table-1440.png'), animations: 'disabled', caret: 'hide' });
    console.log(`saved qa/table-1440.png from ${tid}`);
  });

  test('overview-1440.png', async ({ page }) => {
    await openSection(page, '2.0');
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await expect(page.getByTestId('row-2.0-1')).toBeVisible();
    await page.getByTestId('row-2.0-1').getByTestId('verdict-left').click();
    await page.getByTestId('row-2.0-2').getByTestId('verdict-tie').click();
    await page.getByTestId('tab-overview').click();
    await expect.poll(() => new URL(page.url()).hash).toBe('#/overview');
    await page.waitForTimeout(400);
    await save(page, 'overview-1440.png');
  });
});

test.describe('dark 1440x900 screenshot', () => {
  test.use({ viewport: { width: 1440, height: 900 }, colorScheme: 'dark' });

  test('dark-1440.png', async ({ page }) => {
    await sectionMid(page, '2.1', 'row-2.1-5');
    await expect(page.locator('html')).toHaveClass(/dark/);
    await save(page, 'dark-1440.png');
  });
});

test.describe('phone 402x874 screenshots', () => {
  test.use({ viewport: { width: 402, height: 874 } });

  test('top-402.png', async ({ page }) => {
    await openSection(page, '2.0');
    await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior }));
    await save(page, 'top-402.png');
  });

  test('mid-402-normal.png', async ({ page }) => {
    await sectionMid(page, '2.1', 'row-2.1-5');
    await save(page, 'mid-402-normal.png');
  });

  test('mid-402-blind.png', async ({ page }) => {
    await sectionMid(page, '2.1', 'row-2.1-5');
    await page.getByTestId('toggle-blind').click();
    await expect(page.getByTestId('toggle-blind')).toHaveAttribute('aria-pressed', 'true');
    await expect(page.getByText('譯本 A').first()).toBeVisible();
    await scrollRowToStart(page, 'row-2.1-5');
    await save(page, 'mid-402-blind.png');
  });

  test('mid-402-english.png', async ({ page }) => {
    await sectionMid(page, '2.1', 'row-2.1-5');
    await page.getByTestId('toggle-en').click();
    await expect(page.getByTestId('toggle-en')).toHaveAttribute('aria-pressed', 'true');
    await scrollRowToStart(page, 'row-2.1-5');
    await save(page, 'mid-402-english.png');
  });

  test('table-402.png', async ({ page }) => {
    await openSection(page, '2.0');
    const tableRow = page.locator('[data-testid^="row-2.0-"]').filter({ has: page.locator('table') }).first();
    await expect(tableRow, 'no row in 2.0 contains a <table>').toHaveCount(1);
    const tid = (await tableRow.getAttribute('data-testid')) ?? '';
    await scrollRowToStart(page, tid);
    await tableRow.screenshot({ path: path.join(QA_DIR, 'table-402.png'), animations: 'disabled', caret: 'hide' });
    console.log(`saved qa/table-402.png from ${tid}`);
  });
});
