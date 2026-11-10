import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { test, expect, type Page } from '@playwright/test';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const EN_2_0 = path.join(ROOT, 'data', 'en', '2.0-disruption-ladder.md');

const VIEWPORTS = [
  { name: '1440x900', width: 1440, height: 900 },
  { name: '1024x768', width: 1024, height: 768 },
  { name: '402x874', width: 402, height: 874 },
];

const MODEL_LABEL: Record<string, string> = {
  kimi: 'Kimi K3.1 Pro',
  gemini: 'Gemini 3.6 Flash',
};

type Verdict = { winner?: string; note?: string };
type Store = Record<string, Verdict>;

// Row 2.0-1 is keyed as "2.0-1" (or some separator variant ending in "2.0<sep>1").
const ROW_2_0_1 = /2\.0\D+1$/;

function englishFirstHeading(): string {
  const md = fs.readFileSync(EN_2_0, 'utf8');
  const line = md.split(/\r?\n/).find((l) => /^\s*#{1,6}\s+\S/.test(l));
  if (!line) throw new Error(`no markdown heading found in ${EN_2_0}`);
  return line
    .replace(/^\s*#{1,6}\s+/, '')
    .replace(/\s+#+\s*$/, '')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/[*_`]/g, '')
    .trim();
}

function findEntry(store: Store, re: RegExp): ({ key: string } & Verdict) | undefined {
  const key = Object.keys(store).find((k) => re.test(k));
  return key === undefined ? undefined : { key, ...store[key] };
}

async function readStore(page: Page): Promise<{ raw: string | null; store: Store }> {
  const raw = await page.evaluate(() => localStorage.getItem('nrr-verdicts'));
  return { raw, store: raw ? (JSON.parse(raw) as Store) : {} };
}

async function bodyText(page: Page): Promise<string> {
  return page.evaluate(() => document.body.innerText);
}

async function openSection(page: Page, section: string): Promise<void> {
  await page.goto(`/#/${section}`);
  await expect(page.getByTestId(`row-${section}-1`)).toBeVisible();
}

async function overflowReport(page: Page) {
  return page.evaluate(() => {
    const de = document.documentElement;
    const cw = de.clientWidth;
    const sw = de.scrollWidth;
    const offenders = Array.from(document.querySelectorAll<HTMLElement>('body *'))
      .map((el) => ({ el, right: el.getBoundingClientRect().right }))
      .filter(({ right }) => right > cw + 1)
      .sort((a, b) => b.right - a.right)
      .slice(0, 10)
      .map(({ el, right }) => {
        const cls = (el.getAttribute('class') ?? '').trim().split(/\s+/).filter(Boolean).join('.');
        const tid = el.getAttribute('data-testid');
        return `${el.tagName.toLowerCase()}${cls ? `.${cls}` : ''}${tid ? `[data-testid="${tid}"]` : ''} right=${Math.round(right)}`;
      });
    return { sw, cw, offenders };
  });
}

async function expectNoOverflow(page: Page, label: string): Promise<void> {
  const { sw, cw, offenders } = await overflowReport(page);
  console.log(`${label}: scrollWidth=${sw} clientWidth=${cw} overflow=${sw - cw}px`);
  expect(
    sw,
    `${label}: documentElement.scrollWidth ${sw} > clientWidth ${cw}. ` +
      `Offenders (top 10 by right edge, right > clientWidth+1): ${offenders.join(' | ') || 'none'}`,
  ).toBeLessThanOrEqual(cw);
}

async function expectPlaceholder(page: Page, vpName: string, section: string): Promise<void> {
  await openSection(page, section);
  const ph = page.locator('[data-testid="placeholder-missing"]');
  const count = await ph.count();
  console.log(`[${vpName}] #/${section} placeholder-missing count=${count}`);
  expect(count, `no [data-testid="placeholder-missing"] in #/${section}`).toBeGreaterThanOrEqual(1);
  const visible = ph.filter({ visible: true }).first();
  await expect(visible, `no visible placeholder-missing in #/${section}`).toBeVisible();
  const text = (await visible.innerText()).trim();
  console.log(`[${vpName}] #/${section} placeholder text: "${text}"`);
  expect(text, `placeholder text in #/${section}`).toContain('尚未完成');
}

for (const vp of VIEWPORTS) {
  test.describe(vp.name, () => {
    test.use({ viewport: { width: vp.width, height: vp.height } });

    test(`[${vp.name}] 2.0 no overflow`, async ({ page }) => {
      await openSection(page, '2.0');
      await expectNoOverflow(page, `[${vp.name}] 2.0 EN off`);
    });

    test(`[${vp.name}] 2.0 no overflow (English on)`, async ({ page }) => {
      await openSection(page, '2.0');
      const toggle = page.getByTestId('toggle-en');
      await toggle.click();
      await expect(toggle).toHaveAttribute('aria-pressed', 'true');
      await expectNoOverflow(page, `[${vp.name}] 2.0 EN on`);
    });

    test(`[${vp.name}] 2.1 no overflow`, async ({ page }) => {
      await openSection(page, '2.1');
      await expectNoOverflow(page, `[${vp.name}] 2.1 EN off`);
    });

    test(`[${vp.name}] 2.1 no overflow (English on)`, async ({ page }) => {
      await openSection(page, '2.1');
      const toggle = page.getByTestId('toggle-en');
      await toggle.click();
      await expect(toggle).toHaveAttribute('aria-pressed', 'true');
      await expectNoOverflow(page, `[${vp.name}] 2.1 EN on`);
    });

    test(`[${vp.name}] tabs switch between 2.0 and 2.1`, async ({ page }) => {
      await openSection(page, '2.0');
      await page.getByTestId('tab-2.1').click();
      await expect.poll(() => new URL(page.url()).hash).toContain('2.1');
      await expect(page.getByTestId('row-2.1-1')).toBeVisible();
      await page.getByTestId('tab-2.0').click();
      await expect.poll(() => new URL(page.url()).hash).toContain('2.0');
      await expect(page.getByTestId('row-2.0-1')).toBeVisible();
    });

    test(`[${vp.name}] English toggle shows EN 2.0 first heading`, async ({ page }) => {
      const heading = englishFirstHeading();
      console.log(`[${vp.name}] EN 2.0 first heading: "${heading}"`);
      await openSection(page, '2.0');
      const toggle = page.getByTestId('toggle-en');
      await toggle.click();
      await expect(toggle).toHaveAttribute('aria-pressed', 'true');
      await expect(page.getByText(heading).filter({ visible: true }).first()).toBeVisible();
      await toggle.click();
      await expect(toggle).toHaveAttribute('aria-pressed', 'false');
    });

    test(`[${vp.name}] blind mode hides model names until reveal`, async ({ page }) => {
      await openSection(page, '2.0');
      await page.getByTestId('toggle-blind').click();
      await expect.poll(() => bodyText(page)).toContain('譯本 A');
      const blind = await bodyText(page);
      console.log(`[${vp.name}] blind mode innerText length=${blind.length}`);
      expect(blind, 'blind mode leaks "Kimi"').not.toContain('Kimi');
      expect(blind, 'blind mode leaks "Gemini"').not.toContain('Gemini');
      expect(blind).toContain('譯本 A');

      await page.getByTestId('reveal').click();
      await expect.poll(() => bodyText(page)).toContain('Kimi');
    });

    test(`[${vp.name}] verdict persists across reload`, async ({ page }) => {
      await openSection(page, '2.0');
      await page.evaluate(() => localStorage.clear());
      await page.reload();
      await expect(page.getByTestId('row-2.0-1')).toBeVisible();

      await page.getByTestId('row-2.0-1').getByTestId('verdict-left').click();
      await expect(page.getByTestId('row-2.0-1').getByTestId('verdict-left')).toHaveAttribute(
        'aria-pressed',
        'true',
      );

      await page.reload();
      await expect(page.getByTestId('row-2.0-1').getByTestId('verdict-left')).toHaveAttribute(
        'aria-pressed',
        'true',
      );

      const { raw, store } = await readStore(page);
      console.log(`[${vp.name}] nrr-verdicts after reload: ${raw}`);
      const entry = findEntry(store, ROW_2_0_1);
      expect(entry, `no nrr-verdicts entry for row 2.0-1; keys=${Object.keys(store).join(',') || '(none)'}`).toBeDefined();
      expect(['kimi', 'gemini', 'tie']).toContain(entry?.winner);
    });

    test(`[${vp.name}] copy-verdicts yields expected Markdown`, async ({ page, context }) => {
      await context.grantPermissions(['clipboard-read', 'clipboard-write']);
      await openSection(page, '2.0');
      await page.evaluate(() => localStorage.clear());
      await page.reload();
      await expect(page.getByTestId('row-2.0-1')).toBeVisible();

      const row = page.getByTestId('row-2.0-1');
      await row.getByTestId('verdict-left').click();
      const note = row.getByTestId('verdict-note');
      await note.fill('測試備註');
      await note.press('Tab');

      const { store } = await readStore(page);
      const entry = findEntry(store, ROW_2_0_1);
      expect(entry, `no nrr-verdicts entry for row 2.0-1; keys=${Object.keys(store).join(',') || '(none)'}`).toBeDefined();
      const winner = entry?.winner ?? '';
      const label = MODEL_LABEL[winner];
      expect(label, `unexpected winner "${winner}" recorded by verdict-left`).toBeDefined();

      await page.getByTestId('copy-verdicts').click();
      await page.waitForFunction(
        () => typeof (window as any).__lastCopied === 'string' && (window as any).__lastCopied.length > 0,
      );
      const md = (await page.evaluate(() => (window as any).__lastCopied)) as string;
      console.log(`[${vp.name}] copied markdown (winner=${winner}):\n${md}`);

      expect(md.startsWith('# 第 2 章翻譯評語'), 'copied markdown must start with "# 第 2 章翻譯評語"').toBe(true);
      expect(md, 'missing exact table header line').toContain('| 章節 | 列 | 原文開頭 | 評判 | 備註 |');
      const line = md.split(/\r?\n/).find((l) => l.startsWith('| 2.0 | 1 | '));
      expect(line, 'no line starting with "| 2.0 | 1 | "').toBeDefined();
      expect(line ?? '', `row line should contain " ${label} 較好 | 測試備註 |"`).toContain(
        ` ${label} 較好 | 測試備註 |`,
      );
    });

    test(`[${vp.name}] 2.0 missing-translation placeholder renders`, async ({ page }) => {
      await expectPlaceholder(page, vp.name, '2.0');
    });

    test(`[${vp.name}] 2.1 missing-translation placeholder renders`, async ({ page }) => {
      await expectPlaceholder(page, vp.name, '2.1');
    });
  });
}
