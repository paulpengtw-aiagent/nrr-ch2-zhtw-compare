import fs from 'node:fs';
import path from 'node:path';
import { test, expect, type Page } from '@playwright/test';
import { QA_DIR, ROOT, expectNoOverflow, settle } from './helpers';

// Round 3: four Gemini models via Antigravity + the published copy. Routes #/r3/...; storage nrr-round,
// nrr-verdicts-r3, nrr-r3-cols, nrr-r3-cols-blind, nrr-blind-r3. The expectations are read from the built data,
// so the suite passes both while models are placeholders and after the run folder fills in.

interface R3Json {
  meta: { models: { id: string; label: string; short: string }[] };
  sections: {
    id: string;
    rows: { id: string; models: Record<string, unknown> }[];
    models: Record<string, { present: boolean }>;
    published: { present: boolean; state: string };
    blindOrder: string[];
  }[];
}
const DATA: R3Json = JSON.parse(fs.readFileSync(path.join(ROOT, 'src', 'generated', 'compare-r3.json'), 'utf8'));
const MODELS = DATA.meta.models;
const SECTIONS = DATA.sections.map((s) => s.id);
const sectionOf = (id: string) => DATA.sections.find((s) => s.id === id)!;
const LETTERS = ['A', 'B', 'C', 'D'];

async function storage(page: Page, key: string): Promise<string | null> {
  return page.evaluate((k) => window.localStorage.getItem(k), key);
}

test.describe('round 3', () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  test('[round3] hash routes, remembered round, deep link to a row', async ({ page }) => {
    await page.goto('/#/r3/2.4');
    await expect(page.getByTestId('round-3')).toHaveAttribute('aria-pressed', 'true');
    await expect.poll(() => storage(page, 'nrr-round')).toBe('3');
    await page.goto('/');
    await expect(page.getByTestId('round-3')).toHaveAttribute('aria-pressed', 'true');
    await page.goto('/#/r3/overview');
    await expect(page.getByTestId('overview-r3')).toBeVisible();
    await page.goto('/#/r3/2.3/r5');
    await settle(page);
    await expect(page.locator('#r5')).toBeFocused();
    await expect(page.locator('#r5')).toBeInViewport();
    // A round-1 hash still wins and resets the remembered round.
    await page.goto('/#/2.0');
    await expect(page.getByTestId('round-1')).toHaveAttribute('aria-pressed', 'true');
    await expect.poll(() => storage(page, 'nrr-round')).toBe('1');
  });

  test('[round3] switch keeps the section; rounds 1 and 2 still open', async ({ page }) => {
    await page.goto('/#/r3/2.3');
    await page.getByTestId('round-2').click();
    await expect(page).toHaveURL(/#\/r2\/2\.3$/);
    await page.getByTestId('round-3').click();
    await expect(page).toHaveURL(/#\/r3\/2\.3$/);
    await page.getByTestId('round-1').click();
    await expect(page).toHaveURL(/#\/2\.3$/);
  });

  for (const id of SECTIONS) {
    test(`[round3] ${id}: one row per English block, placeholders for missing models`, async ({ page }) => {
      const s = sectionOf(id);
      await page.goto(`/#/r3/${id}`);
      await expect(page.locator('#section-panel article[data-row]')).toHaveCount(s.rows.length);
      const first = page.getByTestId(`row-${s.rows[0]!.id}`);
      await expect(first.locator('[data-col="en"]')).toHaveCount(1);
      const missing = MODELS.filter((m) => !s.models[m.id]?.present);
      await expect(first.getByTestId('r3-placeholder')).toHaveCount(missing.length);
      for (const m of MODELS) {
        const btn = first.locator(`[data-pick="${m.id}"]`);
        if (s.models[m.id]?.present) await expect(btn).toBeEnabled();
        else await expect(btn).toBeDisabled();
      }
      await expect(page.getByTestId('r3-present')).toContainText(`${MODELS.length - missing.length} / ${MODELS.length}`);
    });
  }

  test('[round3] column picker: 2 to 4 columns, published column with its state, remembered', async ({ page }) => {
    await page.goto('/#/r3/2.4');
    const row = page.getByTestId(`row-${sectionOf('2.4').rows[0]!.id}`);
    await expect(row.locator('[data-testid="r3-grid"] > section')).toHaveCount(4);
    // Already four: adding the published column is refused.
    await page.getByTestId('col-published').click();
    await expect(page.getByTestId('col-published')).toHaveAttribute('aria-pressed', 'false');
    await page.getByTestId(`col-${MODELS[3]!.id}`).click();
    await page.getByTestId('col-published').click();
    await expect(page.getByTestId('col-published')).toHaveAttribute('aria-pressed', 'true');
    await expect(row.locator('[data-col="published"]')).toHaveCount(1);
    const pub = sectionOf('2.4').published;
    await expect(row.getByTestId('published-state')).toContainText(pub.state === 'current' ? '與英文同步' : pub.state === 'stale' ? '已過期' : '');
    await expect(row.locator('[data-col="published"]')).toContainText('Published (Gemini 4 Hydrogen High, #277)');
    // Down to two, then the minimum holds.
    await page.getByTestId(`col-${MODELS[0]!.id}`).click();
    await page.getByTestId(`col-${MODELS[1]!.id}`).click();
    await expect(row.locator('[data-testid="r3-grid"] > section')).toHaveCount(2);
    await page.getByTestId(`col-${MODELS[2]!.id}`).click();
    await expect(row.locator('[data-testid="r3-grid"] > section')).toHaveCount(2);
    await page.reload();
    await expect(row.locator('[data-testid="r3-grid"] > section')).toHaveCount(2);
    expect(JSON.parse((await storage(page, 'nrr-r3-cols'))!)).toEqual([MODELS[2]!.id, 'published']);
    // Side by side on desktop.
    const cols = await row.getByTestId('r3-grid').evaluate((el) => getComputedStyle(el).gridTemplateColumns.split(' ').length);
    expect(cols).toBe(2);
  });

  test('[round3] verdicts: tally in the top bar, toggle off, stored separately, export', async ({ page }) => {
    await page.goto('/#/r3/2.0');
    const s = sectionOf('2.0');
    const row = page.getByTestId(`row-${s.rows[0]!.id}`);
    await row.getByTestId('pick-tie').click();
    await expect(page.getByTestId('topbar').getByTestId('tally3-tie')).toHaveText('1');
    expect(JSON.parse((await storage(page, 'nrr-verdicts-r3'))!)[s.rows[0]!.id].pick).toBe('tie');
    await row.getByTestId('pick-tie').click();
    await expect(page.getByTestId('topbar').getByTestId('tally3-tie')).toHaveText('0');
    const present = MODELS.find((m) => s.models[m.id]?.present);
    if (present) {
      await row.locator(`[data-pick="${present.id}"]`).click();
      await expect(page.getByTestId('topbar').getByTestId(`tally3-${present.id}`)).toHaveText('1');
    }
    await row.getByTestId('pick-tie').click();
    // Keyboard: focus the second row, 5 = 差不多.
    const row2 = page.getByTestId(`row-${s.rows[1]!.id}`);
    await row2.focus();
    await page.keyboard.press('5');
    await expect(row2.getByTestId('pick-tie')).toHaveAttribute('aria-pressed', 'true');
    expect(await storage(page, 'nrr-verdicts-r2')).toBeNull();
    expect(await storage(page, 'nrr-verdicts')).toBeNull();
    // The tally is in the bar, not over the text.
    const bar = await page.getByTestId('topbar').boundingBox();
    const tally = await page.getByTestId('topbar').getByTestId('tally3').boundingBox();
    expect(tally!.y).toBeGreaterThanOrEqual(bar!.y);
    expect(tally!.y + tally!.height).toBeLessThanOrEqual(bar!.y + bar!.height + 1);
  });

  test('[round3] blind mode: 譯本 A–D in the fixed per-file order, overview hidden until reveal', async ({ page }) => {
    await page.goto('/#/r3/2.3');
    await page.getByTestId('toggle-blind-r3').click();
    await expect.poll(() => storage(page, 'nrr-blind-r3')).toBe('true');
    const s = sectionOf('2.3');
    const row = page.getByTestId(`row-${s.rows[0]!.id}`);
    for (let i = 0; i < 4; i++) {
      const btn = row.getByTestId(`pick-${i + 1}`);
      await expect(btn).toHaveText(new RegExp(`譯本 ${LETTERS[i]}`));
      await expect(btn).toHaveAttribute('data-pick', s.blindOrder[i]!);
    }
    const text = await page.locator('main').innerText();
    for (const m of MODELS) expect(text).not.toContain(m.label);
    await expect(page).toHaveTitle(/譯本 A–D/);
    await page.goto('/#/r3/overview');
    await expect(page.getByTestId('overview-r3-blind')).toBeVisible();
    await page.getByTestId('reveal-r3').click();
    await expect(page.getByTestId('overview-r3')).toBeVisible();
    await expect(page.getByTestId('r3-tally-table')).toContainText(MODELS[0]!.label);
  });

  test('[round3] overview lists every model and file, placeholders where missing', async ({ page }) => {
    await page.goto('/#/r3/overview');
    for (const m of MODELS) {
      for (const s of DATA.sections) {
        const cell = page.getByTestId(`r3-stat-${m.id}-${s.id}`);
        await expect(cell).toHaveCount(1);
        if (!s.models[m.id]?.present) await expect(cell).toContainText('尚未翻譯');
      }
    }
    for (const s of DATA.sections) await expect(page.getByTestId(`r3-published-${s.id}`)).toBeVisible();
    await expectNoOverflow(page, 'r3 overview 1440');
    fs.mkdirSync(QA_DIR, { recursive: true });
    await page.screenshot({ path: path.join(QA_DIR, 'r3-overview-1440.png'), fullPage: true });
    await page.goto('/#/r3/2.4');
    await settle(page);
    await page.screenshot({ path: path.join(QA_DIR, 'r3-section-1440.png') });
  });
});

test.describe('round 3 on a phone', () => {
  test.use({ viewport: { width: 402, height: 874 } });

  test('[round3] columns stack, tally in the bottom bar, no horizontal overflow', async ({ page }) => {
    await page.goto('/#/r3/2.0');
    const row = page.getByTestId(`row-${sectionOf('2.0').rows[0]!.id}`);
    const cols = await row.getByTestId('r3-grid').evaluate((el) => getComputedStyle(el).gridTemplateColumns.split(' ').length);
    expect(cols).toBe(1);
    await expect(page.getByTestId('bottombar').getByTestId('tally3')).toBeVisible();
    await expectNoOverflow(page, 'r3 2.0 402');
    await row.getByTestId('pick-tie').click();
    await expect(page.getByTestId('bottombar').getByTestId('tally3-tie')).toHaveText('1');
    await page.screenshot({ path: path.join(QA_DIR, 'r3-section-402.png') });
    await page.goto('/#/r3/overview');
    await expectNoOverflow(page, 'r3 overview 402');
  });
});
