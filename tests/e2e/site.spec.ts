import fs from 'node:fs';
import path from 'node:path';
import { test, expect } from '@playwright/test';
import {
  MODEL_LABEL,
  ROOT,
  VIEWPORTS,
  bodyText,
  chipTexts,
  expectNoOverflow,
  expectPlaceholder,
  expectedVerdictLabels,
  isPhone,
  missingModels,
  openOverview,
  openSection,
  openTallyActions,
  readStore,
} from './helpers';

const EN_2_0 = path.join(ROOT, 'data', 'en', '2.0-disruption-ladder.md');

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

function findEntry(store: Record<string, { winner?: string; note?: string }>, re: RegExp) {
  const key = Object.keys(store).find((k) => re.test(k));
  return key === undefined ? undefined : { key, ...store[key] };
}

// Placeholder tests derive their expectations from data/ files. They are skipped only when none of
// the placeholder sections is missing a model translation.
const PLACEHOLDER_SECTIONS = ['2.0', '2.1', '2.2', '2.3', '2.4'];
const anyMissing = PLACEHOLDER_SECTIONS.some((s) => missingModels(s).length > 0);
const PLACEHOLDER_SKIP_NOTE =
  `no section in ${PLACEHOLDER_SECTIONS.join('/')} is missing a model translation under data/kimi or data/gemini; ` +
  'placeholder tests skipped (nothing to derive)';

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

    test(`[${vp.name}] tabs switch between 2.0 and 2.1; tab labels and overview tab`, async ({ page }) => {
      await openSection(page, '2.0');
      await expect(page.getByTestId('tab-2.0')).toHaveText(/2\.0\s*中斷階梯/);
      await expect(page.getByTestId('tab-overview')).toBeVisible();
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

    test(`[${vp.name}] blind mode hides model names until reveal (section and #/overview)`, async ({ page }) => {
      await openSection(page, '2.0');
      await expect(page.getByTestId('summary-strip').filter({ visible: true }).first()).toBeVisible();
      await page.getByTestId('toggle-blind').click();
      await expect.poll(() => bodyText(page)).toContain('譯本 A');
      await expect(
        page.getByTestId('summary-strip').filter({ visible: true }),
        'no summary-strip may be visible while blind',
      ).toHaveCount(0);
      const blind = await bodyText(page);
      console.log(`[${vp.name}] blind mode innerText length=${blind.length}`);
      expect(blind, 'blind mode leaks "Kimi"').not.toContain('Kimi');
      expect(blind, 'blind mode leaks "Gemini"').not.toContain('Gemini');
      expect(blind).toContain('譯本 A');

      await openOverview(page);
      await expect(page.getByTestId('overview-blind')).toBeVisible();
      await expect(page.getByTestId('overview-blind')).toContainText('揭曉後顯示');
      const blindOverview = await bodyText(page);
      expect(blindOverview, 'blind #/overview leaks "Kimi"').not.toContain('Kimi');
      expect(blindOverview, 'blind #/overview leaks "Gemini"').not.toContain('Gemini');

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

      // Desktop: copy-verdicts is in the topbar. Phone: it lives in the tally-menu popover.
      await openTallyActions(page, vp);
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

    test(`[${vp.name}] 2.0 placeholder matches data`, async ({ page }) => {
      test.skip(!anyMissing, PLACEHOLDER_SKIP_NOTE);
      await expectPlaceholder(page, vp.name, '2.0');
    });

    test(`[${vp.name}] 2.1 placeholder matches data`, async ({ page }) => {
      test.skip(!anyMissing, PLACEHOLDER_SKIP_NOTE);
      await expectPlaceholder(page, vp.name, '2.1');
    });

    test(`[${vp.name}] 2.2 placeholder matches data`, async ({ page }) => {
      test.skip(!anyMissing, PLACEHOLDER_SKIP_NOTE);
      await expectPlaceholder(page, vp.name, '2.2');
    });

    test(`[${vp.name}] 2.3 placeholder matches data`, async ({ page }) => {
      test.skip(!anyMissing, PLACEHOLDER_SKIP_NOTE);
      await expectPlaceholder(page, vp.name, '2.3');
    });

    test(`[${vp.name}] 2.4 placeholder matches data`, async ({ page }) => {
      test.skip(!anyMissing, PLACEHOLDER_SKIP_NOTE);
      await expectPlaceholder(page, vp.name, '2.4');
    });

    test(`[${vp.name}] verdict labels follow column order, normal and blind; click twice clears`, async ({ page }) => {
      await openSection(page, '2.0');
      const row = page.getByTestId('row-2.0-2');
      await expect(row).toBeVisible();

      const normalChips = await chipTexts(row);
      console.log(`[${vp.name}] normal chips (left,right): ${JSON.stringify(normalChips)}`);
      expect(normalChips, 'non-blind 2.0 should show Kimi on the left and Gemini on the right').toEqual([
        'Kimi K3.1 Pro',
        'Gemini 3.6 Flash',
      ]);
      await verifyVerdictRow(page, row, expectedVerdictLabels(normalChips));

      await page.getByTestId('toggle-blind').click();
      await expect(page.getByTestId('toggle-blind')).toHaveAttribute('aria-pressed', 'true');
      await expect.poll(() => chipTexts(row)).toEqual(['譯本 A', '譯本 B']);
      await verifyVerdictRow(page, row, expectedVerdictLabels(await chipTexts(row)));
    });

    test(`[${vp.name}] overview: tally, note, and blind placeholder`, async ({ page }) => {
      await openSection(page, '2.0');
      await page.evaluate(() => localStorage.clear());
      await page.reload();
      const row = page.getByTestId('row-2.0-2');
      await expect(row).toBeVisible();
      const chips = await chipTexts(row);
      const { left } = expectedVerdictLabels(chips);
      const chosen = left.replace(/ 較好$/, '');

      await row.getByTestId('verdict-left').click();
      const note = row.getByTestId('verdict-note');
      const NOTE = `概覽備註-${vp.name}`;
      await note.fill(NOTE);
      await note.press('Tab');

      await openOverview(page);
      await expect(page.getByText(NOTE).filter({ visible: true }).first()).toBeVisible();
      const tally = await overviewTallyFor(page, '2.0', chosen);
      console.log(`[${vp.name}] overview 2.0 tally for ${chosen}: ${tally}`);
      expect(tally, `overview 2.0 tally for ${chosen} should be 1`).toBe(1);

      await page.getByTestId('toggle-blind').click();
      await expect(page.getByTestId('overview-blind')).toBeVisible();
      const blind = await bodyText(page);
      expect(blind, 'blind overview leaks "Kimi"').not.toContain('Kimi');
      expect(blind, 'blind overview leaks "Gemini"').not.toContain('Gemini');
    });

    test(`[${vp.name}] copy-verdicts is inside the topbar (desktop) or tally-menu (phone)`, async ({ page }) => {
      await openSection(page, '2.0');
      if (isPhone(vp)) {
        const bar = page.getByTestId('bottombar');
        await expect(bar).toBeVisible();
        const box = await bar.boundingBox();
        expect(box?.height ?? 999, 'bottombar must be <=48px tall on phones').toBeLessThanOrEqual(48);
        await expect(bar.getByTestId('tally-menu')).toBeVisible();
        await expect(page.getByTestId('copy-verdicts')).toBeHidden();
        await page.getByTestId('tally-menu').click();
        await expect(page.getByTestId('copy-verdicts')).toBeVisible();
      } else {
        const bar = page.getByTestId('topbar');
        await expect(bar).toBeVisible();
        for (const id of ['tally-left', 'tally-tie', 'tally-right', 'copy-verdicts', 'clear-verdicts']) {
          await expect(bar.getByTestId(id), `${id} must be in topbar`).toBeVisible();
        }
      }
    });
  });
}

async function verifyVerdictRow(
  page: import('@playwright/test').Page,
  row: import('@playwright/test').Locator,
  exp: { left: string; tie: string; right: string },
): Promise<void> {
  const left = row.getByTestId('verdict-left');
  const tie = row.getByTestId('verdict-tie');
  const right = row.getByTestId('verdict-right');
  await expect(left).toHaveText(exp.left);
  await expect(tie).toHaveText(exp.tie);
  await expect(right).toHaveText(exp.right);
  console.log(`verdict labels: [${exp.left}] [${exp.tie}] [${exp.right}]`);

  await left.click();
  await expect(left).toHaveAttribute('aria-pressed', 'true');
  await left.click();
  await expect(left).toHaveAttribute('aria-pressed', 'false');
  await expect(tie).toHaveAttribute('aria-pressed', 'false');
  await expect(right).toHaveAttribute('aria-pressed', 'false');
  const { store } = await readStore(page);
  const entry = findEntry(store, /2\.0\D+2$/);
  expect(entry?.winner, 'row 2.0-2 winner should be cleared after the second click').toBeUndefined();
}

/**
 * Tally for one model in one section, read from the 評判統計 table on #/overview: the cell under the
 * model's column header, on the row whose first header cell starts with the section id.
 * Returns NaN when the table, column, or row cannot be found.
 */
async function overviewTallyFor(
  page: import('@playwright/test').Page,
  section: string,
  modelShort: string,
): Promise<number> {
  return page.evaluate(
    ({ section, modelShort }) => {
      const table = Array.from(document.querySelectorAll('table')).find((t) =>
        /平手/.test(t.querySelector('thead')?.textContent ?? ''),
      );
      if (!table) return NaN;
      const headers = Array.from(table.querySelectorAll('thead th')).map((th) => (th.textContent ?? '').trim());
      const col = headers.indexOf(modelShort);
      if (col < 0) return NaN;
      const tr = Array.from(table.querySelectorAll('tbody tr')).find((r) =>
        (r.querySelector('th')?.textContent ?? '').trim().startsWith(`${section} `),
      );
      const cell = tr?.children[col];
      if (!cell) return NaN;
      const n = Number((cell.textContent ?? '').trim());
      return Number.isFinite(n) ? n : NaN;
    },
    { section, modelShort },
  );
}
