import fs from 'node:fs';
import path from 'node:path';
import { test, expect, type Page } from '@playwright/test';
import { MODEL_LABEL, QA_DIR, ROOT, openSection, scrollRowToStart, scrollToBottom, settle } from './helpers';

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

const NOTE_TEXT = '術語待確認';

/** Opens a section with cleared localStorage (no verdicts, no blind mode) and waits for its first row. */
async function openFreshSection(page: Page, section: string): Promise<void> {
  await openSection(page, section);
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await expect(page.getByTestId(`row-${section}-1`)).toBeVisible();
}

/**
 * Scrolls so the element's top sits just below the sticky topbar, without smooth-scroll animation.
 * The topbar is `sticky top-0` at every width and renders after the hero, so its viewport bottom is
 * hero-height + 48 at scrollY 0; only its height (the band it covers once stuck) is scroll-independent.
 * Fonts are awaited first so the target is not computed against a layout that is still reflowing.
 */
async function scrollTopOf(page: Page, selector: string): Promise<void> {
  await page.evaluate(() => document.fonts.ready);
  await page.evaluate((sel) => {
    const el = document.querySelector<HTMLElement>(sel);
    if (!el) throw new Error(`no element matching ${sel}`);
    const bar = document.querySelector<HTMLElement>('[data-testid="topbar"]');
    const barHeight = bar ? bar.getBoundingClientRect().height : 0;
    const top = el.getBoundingClientRect().top + window.scrollY - barHeight - 24;
    window.scrollTo({ top: Math.max(0, top), behavior: 'instant' as ScrollBehavior });
  }, selector);
  await settle(page);
}

/** Section viewport: heading, summary strip, and first row with both model chips visible. */
async function sectionTop(page: Page, section: string, file: string): Promise<void> {
  await openFreshSection(page, section);
  await scrollTopOf(page, '#section-panel h2');
  await expect(page.getByTestId('summary-strip')).toBeVisible();
  const row = page.getByTestId(`row-${section}-1`);
  await expect(row.getByText(MODEL_LABEL.kimi, { exact: true }).first()).toBeVisible();
  await expect(row.getByText(MODEL_LABEL.gemini, { exact: true }).first()).toBeVisible();
  await page.waitForTimeout(400);
  const scrollY = await page.evaluate(() => window.scrollY);
  expect(scrollY, `${file}: scrollY before screenshot`).toBeGreaterThan(300);
  await save(page, file);
}

/** Overview after two verdicts on 2.0; optionally a note on row 2.0-3 (saved on blur). */
async function overviewWithVerdicts(page: Page, withNote: boolean): Promise<void> {
  await openSection(page, '2.0');
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await expect(page.getByTestId('row-2.0-1')).toBeVisible();
  await page.getByTestId('row-2.0-1').getByTestId('verdict-left').click();
  await page.getByTestId('row-2.0-2').getByTestId('verdict-tie').click();
  if (withNote) {
    const note = page.getByTestId('row-2.0-3').getByTestId('verdict-note');
    await note.fill(NOTE_TEXT);
    await note.blur();
  }
  await page.getByTestId('tab-overview').click();
  await expect.poll(() => new URL(page.url()).hash).toBe('#/overview');
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

  test('section-2.2-1440.png', async ({ page }) => {
    await sectionTop(page, '2.2', 'section-2.2-1440.png');
  });

  test('section-2.3-1440.png', async ({ page }) => {
    await sectionTop(page, '2.3', 'section-2.3-1440.png');
  });

  test('glossary-2.2-1440.png', async ({ page }) => {
    await openFreshSection(page, '2.2');
    await scrollToBottom(page);
    const trigger = page.getByRole('button', { name: '詞彙備註', exact: true });
    await expect(trigger).toBeVisible();
    await trigger.click();
    await expect(trigger).toHaveAttribute('aria-expanded', 'true');
    const folded = page.getByText('folded variant', { exact: true }).first();
    await expect(folded, 'no "folded variant" glossary note in 2.2').toBeVisible();
    await folded.evaluate((el) => el.scrollIntoView({ block: 'center', behavior: 'instant' as ScrollBehavior }));
    await settle(page);
    await save(page, 'glossary-2.2-1440.png');
  });

  test('overview-notes-1440.png', async ({ page }) => {
    await overviewWithVerdicts(page, false);
    await expect(page.locator('#ov-runs')).toBeVisible();
    await scrollTopOf(page, '#ov-runs');
    await page.waitForTimeout(400);
    await save(page, 'overview-notes-1440.png');
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

  test('section-2.2-402.png', async ({ page }) => {
    await sectionTop(page, '2.2', 'section-2.2-402.png');
  });

  test('section-2.3-402.png', async ({ page }) => {
    await sectionTop(page, '2.3', 'section-2.3-402.png');
  });

  test('overview-402.png', async ({ page }) => {
    await overviewWithVerdicts(page, true);
    await expect(page.getByText(NOTE_TEXT).first()).toBeVisible();
    await scrollTopOf(page, '#ov-verdicts');
    await page.waitForTimeout(400);
    await save(page, 'overview-402.png');
  });
});
