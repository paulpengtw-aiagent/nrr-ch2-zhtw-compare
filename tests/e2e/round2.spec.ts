import fs from 'node:fs';
import path from 'node:path';
import { test, expect, type Locator, type Page } from '@playwright/test';
import {
  QA_DIR,
  ROOT,
  bodyText,
  expectNoOverflow,
  isPhone,
  openTallyActions,
  settle,
  type Viewport,
} from './helpers';

// Round 2: Fable-rewritten English vs Gemini 3.6 Flash zh-TW. Routes #/r2/...; storage nrr-round, nrr-verdicts-r2.

const DESKTOP: Viewport = { name: '1440x900', width: 1440, height: 900 };
const PHONE: Viewport = { name: '402x874', width: 402, height: 874 };
const SECTIONS = ['2.0', '2.1', '2.2', '2.3', '2.4'];

const KEY_ROUND = 'nrr-round';
const KEY_V1 = 'nrr-verdicts';
const KEY_V2 = 'nrr-verdicts-r2';

const LINT_CAVEAT = 'Lint 只計算表面字詞模式（翻譯腔、大陸用語等），不衡量讀起來是否清楚。';
const MD_TITLE = '# 第二輪翻譯評語（Fable 改寫英文 · Gemini 3.6 Flash）';
const MD_HEADER = '| 章節 | 列 | 原文開頭 | 評判 | 備註 |';
const EN_URL =
  'https://github.com/paulpengtw/network-resilience-report/tree/9b80936876b94bcdec36fd5a07b815d74fe7df8d/report/ch2';
const RUN_URL =
  'https://github.com/paulpengtw-aiagent/gemini-web-runs/tree/6550aa39c459483478f3227d4a715fedc8241052/2026-11-10-nrr-ch2-plain-zhtw';

type Verdict2 = 'good' | 'ok' | 'fix';
type Store2 = Record<string, { verdict?: Verdict2; note?: string }>;

interface R2RowInfo {
  testid: string;
  hasEn: boolean;
  hasGemini: boolean;
  enText: string;
  geminiText: string;
  geminiHan: boolean;
  mismatch: boolean;
  notes: string[];
  anchors: string[];
}

async function storageRaw(page: Page, key: string): Promise<string | null> {
  return page.evaluate((k) => window.localStorage.getItem(k), key);
}

/** nrr-round is '1' or '2'; a JSON-encoded value ('"2"') is accepted as well. */
async function storedRound(page: Page): Promise<string | null> {
  const raw = await storageRaw(page, KEY_ROUND);
  if (raw === null) return null;
  try {
    const parsed: unknown = JSON.parse(raw);
    return typeof parsed === 'string' ? parsed : raw;
  } catch {
    return raw;
  }
}

async function storedR2(page: Page): Promise<Store2> {
  const raw = await storageRaw(page, KEY_V2);
  return raw ? (JSON.parse(raw) as Store2) : {};
}

/** Loads a hash, clears storage and reloads, then waits until the marker is visible. */
async function freshLoad(page: Page, hash: string, marker: Locator): Promise<void> {
  await page.goto(`/${hash}`);
  await page.evaluate(() => window.localStorage.clear());
  await page.reload();
  await expect(marker).toBeVisible();
}

/** Rows of one round-2 section: English and Gemini cell text, Han check, notes and link hrefs. */
async function r2Rows(page: Page, section: string): Promise<R2RowInfo[]> {
  return page.evaluate((sec) => {
    const rows = Array.from(
      document.querySelectorAll<HTMLElement>(`#section-panel article[data-testid^="row-${sec}-"]`),
    );
    return rows.map((row) => {
      const en = row.querySelector<HTMLElement>('[data-col="en"]');
      const gm = row.querySelector<HTMLElement>('[data-col="gemini"]');
      const enText = (en?.textContent ?? '').replace(/\s+/g, ' ').trim();
      const geminiText = (gm?.textContent ?? '').replace(/\s+/g, ' ').trim();
      const anchors = gm ? Array.from(gm.querySelectorAll<HTMLAnchorElement>('a')) : [];
      return {
        testid: row.getAttribute('data-testid') ?? '',
        hasEn: en !== null,
        hasGemini: gm !== null,
        enText,
        geminiText,
        geminiHan: /[一-鿿]/.test(geminiText),
        mismatch: row.querySelector('[data-testid="mismatch-badge"]') !== null,
        notes: Array.from(row.querySelectorAll<HTMLElement>('[data-testid="row-note"]')).map((n) =>
          (n.textContent ?? '').trim(),
        ),
        anchors: anchors.map((a) => a.getAttribute('href') ?? ''),
      };
    });
  }, section);
}

/** The number shown in a tally cell; labels around it are ignored. */
async function tallyNumber(loc: Locator): Promise<number> {
  const digits = ((await loc.textContent()) ?? '').replace(/\D/g, '');
  return digits === '' ? Number.NaN : Number(digits);
}

/** Phones show the round-2 tally in the bottombar; wider screens in the topbar. */
function tallyBar(page: Page, vp: Viewport): Locator {
  return page.getByTestId(isPhone(vp) ? 'bottombar' : 'topbar');
}

/** Centres the control first so the phone bottombar cannot cover it, then clicks. */
async function clickCentered(page: Page, loc: Locator): Promise<void> {
  await loc.evaluate((el) => el.scrollIntoView({ block: 'center', behavior: 'instant' as ScrollBehavior }));
  await settle(page);
  await loc.click();
}

async function pressVerdict(page: Page, rowId: string, verdict: Verdict2): Promise<void> {
  await clickCentered(page, page.getByTestId(`row-${rowId}`).getByTestId(`verdict2-${verdict}`));
}

/** Scrolls so the element's top sits just below the sticky topbar, without smooth-scroll animation. */
async function scrollBelowTopbar(page: Page, selector: string): Promise<void> {
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

async function save(page: Page, file: string): Promise<void> {
  fs.mkdirSync(QA_DIR, { recursive: true });
  const out = path.join(QA_DIR, file);
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path: out, animations: 'disabled', caret: 'hide' });
  expect(fs.existsSync(out), `${file} written`).toBe(true);
  console.log(`saved ${path.relative(ROOT, out)}`);
}

test.describe('[round2] behaviour (1440x900)', () => {
  test.use({ viewport: { width: DESKTOP.width, height: DESKTOP.height } });

  test('[round2] remembered round opens on an empty hash; a round-1 hash wins and resets it', async ({ page }) => {
    await page.goto('/#/r2/2.0');
    await expect(page.getByTestId('round-2')).toHaveAttribute('aria-pressed', 'true');
    expect(await storedRound(page), 'nrr-round after #/r2/2.0').toBe('2');

    await page.goto('/');
    await expect(page.getByTestId('round-2')).toHaveAttribute('aria-pressed', 'true');
    await expect(page.getByTestId('round-1')).toHaveAttribute('aria-pressed', 'false');
    await expect(page.getByTestId('row-2.0-1').locator('[data-col="gemini"]')).toHaveCount(1);

    await page.goto('/#/2.0');
    await expect(page.getByTestId('round-1')).toHaveAttribute('aria-pressed', 'true');
    expect(await storedRound(page), 'nrr-round after #/2.0').toBe('1');
  });

  test('[round2] deep link #/r2/2.2 opens round 2 on section 2.2', async ({ page }) => {
    await page.goto('/#/r2/2.2');
    await expect(page.getByTestId('round-2')).toHaveAttribute('aria-pressed', 'true');
    await expect(page.getByTestId('tab-2.2')).toHaveAttribute('aria-selected', 'true');
    await expect(page.getByTestId('row-2.2-1').locator('[data-col="gemini"]')).toHaveCount(1);
  });

  test('[round2] all five sections have rows with an English column and Gemini zh text', async ({ page }) => {
    for (const s of SECTIONS) {
      await page.goto(`/#/r2/${s}`);
      await expect(page.getByTestId(`row-${s}-1`)).toBeVisible();
      const rows = await r2Rows(page, s);
      const withHan = rows.filter((r) => r.geminiHan).length;
      console.log(`[round2] ${s}: rows=${rows.length} rows with Han text in the Gemini column=${withHan}`);
      expect(rows.length, `#/r2/${s} has rows`).toBeGreaterThan(0);
      expect(withHan, `#/r2/${s} has Gemini zh rows`).toBeGreaterThan(0);
      for (const r of rows) {
        expect(r.hasEn, `${r.testid} has an English column`).toBe(true);
        expect(r.hasGemini, `${r.testid} has a Gemini column`).toBe(true);
        if (!r.mismatch) {
          expect(r.enText.length, `${r.testid} English column text`).toBeGreaterThan(0);
          expect(r.geminiHan, `${r.testid} Gemini column has Han characters`).toBe(true);
        }
      }
    }
  });

  test('[round2] EN and Gemini cells of row 2.0-3 start at the same top (within 4px) at 1440', async ({ page }) => {
    await page.goto('/#/r2/2.0');
    const row = page.getByTestId('row-2.0-3');
    await expect(row).toBeVisible();
    const box = await row.evaluate((el) => {
      const en = el.querySelector<HTMLElement>('[data-col="en"]');
      const gm = el.querySelector<HTMLElement>('[data-col="gemini"]');
      if (!en || !gm) return null;
      const a = en.getBoundingClientRect();
      const b = gm.getBoundingClientRect();
      return { enTop: a.top, gmTop: b.top, enLeft: a.left, gmLeft: b.left };
    });
    console.log(`[round2] row 2.0-3 columns: ${JSON.stringify(box)}`);
    expect(box, 'row 2.0-3 has both columns').not.toBeNull();
    expect(Math.abs((box?.enTop ?? 0) - (box?.gmTop ?? 0)), 'top offset between EN and Gemini cells (px)').toBeLessThanOrEqual(4);
    expect(box?.enLeft ?? 0, 'English column sits left of the Gemini column').toBeLessThan(box?.gmLeft ?? 0);
  });

  test('[round2] row notes: 2.0 at least 1, 2.1 exactly 1, 2.2 exactly 2, 2.3 and 2.4 none', async ({ page }) => {
    const noted: Record<string, R2RowInfo[]> = {};
    const totals: Record<string, number> = {};
    for (const s of SECTIONS) {
      await page.goto(`/#/r2/${s}`);
      await expect(page.getByTestId(`row-${s}-1`)).toBeVisible();
      const rows = await r2Rows(page, s);
      noted[s] = rows.filter((r) => r.notes.length > 0);
      totals[s] = rows.reduce((n, r) => n + r.notes.length, 0);
      console.log(`[round2] ${s} row notes=${totals[s]} in rows ${noted[s].map((r) => r.testid).join(',') || '(none)'}`);
    }
    expect(totals['2.0'], '2.0 row notes (OONI / Al Jazeera)').toBeGreaterThanOrEqual(1);
    expect(noted['2.0'].flatMap((r) => r.notes).join('\n'), '2.0 note names OONI and Al Jazeera').toMatch(/OONI[\s\S]*Al Jazeera/);
    expect(totals['2.1'], '2.1 row notes (Domino Theory)').toBe(1);
    expect(noted['2.1'][0]?.notes.join('\n') ?? '', '2.1 note names Domino Theory').toContain('Domino Theory');
    expect(totals['2.2'], '2.2 row notes').toBe(2);
    // The 50–60 note's text does not repeat 五、六十倍, so check the row it sits on instead.
    const numbers = noted['2.2'].find((r) => r.geminiText.includes('五、六十倍（五、六十倍）'));
    expect(numbers?.notes.join('\n') ?? '', 'note on the 五、六十倍（五、六十倍） row').toContain('50–60');
    const cause = noted['2.2'].find((r) => r.enText.includes('The cause is either'));
    expect(cause?.notes.join('\n') ?? '', 'note on the "The cause is either" row').toContain('原因可能為');
    expect(totals['2.3'], '2.3 row notes').toBe(0);
    expect(totals['2.4'], '2.4 row notes').toBe(0);
  });

  test('[round2] the broken OONI and Al Jazeera links keep the full-width ）Gemini wrote', async ({ page }) => {
    await page.goto('/#/r2/2.0');
    await expect(page.getByTestId('row-2.0-1')).toBeVisible();
    const noted = (await r2Rows(page, '2.0')).filter((r) => r.notes.length > 0);
    expect(noted.length, '2.0 rows carrying the broken-link note').toBeGreaterThanOrEqual(1);
    let intact = false;
    for (const r of noted) {
      const badHrefs = r.anchors.filter((h) => h.includes('）'));
      const badText = r.geminiText.includes('/）');
      console.log(
        `[round2] ${r.testid}: anchors with ）=${badHrefs.length} URL text ending in /）=${badText} OONI in text=${r.geminiText.includes('OONI')}`,
      );
      if (badHrefs[0]) console.log(`[round2] ${r.testid} first broken href: ${badHrefs[0]}`);
      if (badHrefs.length > 0 || badText) intact = true;
    }
    expect(intact, 'a 2.0 note row shows ） inside the link href or the URL text').toBe(true);
  });

  test('[round2] hero-r2 links to the pinned English source and run folder', async ({ page }) => {
    await page.goto('/#/r2/2.0');
    const hero = page.getByTestId('hero-r2');
    await expect(hero).toBeVisible();
    await expect(hero).toContainText('第二輪：英文先由 Fable 5.2 改寫得更白話');
    await expect(hero.locator(`a[href="${EN_URL}"]`)).toHaveCount(1);
    await expect(hero.locator(`a[href="${RUN_URL}"]`)).toHaveCount(1);
  });

  test('[round2] overview: lint table (127, 106, 6.68, 6.46), lint caveat and raw check output', async ({ page }) => {
    await page.goto('/#/r2/overview');
    const ov = page.getByTestId('overview-r2');
    await expect(ov).toBeVisible();
    const text = (await ov.textContent()) ?? '';
    for (const needle of ['127', '106', '6.68', '6.46', '101']) {
      expect(text, `overview-r2 mentions ${needle}`).toContain(needle);
    }
    await expect(ov.locator('table').filter({ hasText: '6.68' }).first()).toContainText('127');
    await expect(ov.locator('table').filter({ hasText: '6.46' }).first()).toContainText('106');
    await expect(page.getByTestId('lint-caveat')).toBeVisible();
    await expect(page.getByTestId('lint-caveat')).toContainText(LINT_CAVEAT);
    await expect(page.getByTestId('check-output-r2')).toContainText('2 warning(s)');
  });

  test('[round2] keyboard: j, 1/2/3 verdicts, e, b ignored, ] moves to 2.1', async ({ page }) => {
    await page.goto('/#/r2/2.0');
    await expect(page.getByTestId('row-2.0-1')).toBeVisible();
    await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
    await page.keyboard.press('j');
    await expect(page.getByTestId('row-2.0-1')).toBeFocused();

    await page.keyboard.press('1');
    await expect(page.getByTestId('row-2.0-1').getByTestId('verdict2-good')).toHaveAttribute('aria-pressed', 'true');
    await page.keyboard.press('3');
    await expect(page.getByTestId('row-2.0-1').getByTestId('verdict2-fix')).toHaveAttribute('aria-pressed', 'true');
    await expect(page.getByTestId('row-2.0-1').getByTestId('verdict2-good')).toHaveAttribute('aria-pressed', 'false');
    await page.keyboard.press('2');
    await expect(page.getByTestId('row-2.0-1').getByTestId('verdict2-ok')).toHaveAttribute('aria-pressed', 'true');

    await page.keyboard.press('e');
    await expect(page.getByTestId('toggle-en')).toHaveAttribute('aria-pressed', 'false');
    await page.keyboard.press('e');
    await expect(page.getByTestId('toggle-en')).toHaveAttribute('aria-pressed', 'true');

    await page.keyboard.press('b');
    await expect(page.getByTestId('toggle-blind')).toHaveCount(0);
    expect(await bodyText(page), 'b must not switch to blind labels in round 2').not.toContain('譯本 A');
    await expect.poll(() => new URL(page.url()).hash).toBe('#/r2/2.0');

    await page.keyboard.press(']');
    await expect.poll(() => new URL(page.url()).hash).toBe('#/r2/2.1');
  });

  test('[round2] clear removes only the round-2 verdicts', async ({ page }) => {
    await freshLoad(page, '#/2.0', page.getByTestId('row-2.0-1'));
    await clickCentered(page, page.getByTestId('row-2.0-1').getByTestId('verdict-left'));
    await expect
      .poll(async () => JSON.parse((await storageRaw(page, KEY_V1)) ?? '{}')['2.0-1']?.winner)
      .toBeDefined();
    const v1Before = await storageRaw(page, KEY_V1);

    await page.getByTestId('round-2').click();
    await expect(page.getByTestId('row-2.0-1').locator('[data-col="gemini"]')).toHaveCount(1);
    await pressVerdict(page, '2.0-1', 'fix');
    await expect.poll(async () => (await storedR2(page))['2.0-1']?.verdict).toBe('fix');

    await page.getByTestId('clear-verdicts').click();
    await page.getByRole('alertdialog').getByRole('button', { name: '清除全部' }).click();
    await expect.poll(async () => (await storedR2(page))['2.0-1']?.verdict).toBeUndefined();
    expect(await storageRaw(page, KEY_V1), 'round-1 verdicts survive a round-2 clear').toBe(v1Before);
  });
});

for (const vp of [DESKTOP, PHONE]) {
  test.describe(`viewport ${vp.name}`, () => {
    test.use({ viewport: { width: vp.width, height: vp.height } });

    test(`[round2] ${vp.name} round switch changes the URL, keeps the section, flips aria-pressed`, async ({ page }) => {
      await page.goto('/#/2.0');
      const r1 = page.getByTestId('round-1');
      const r2 = page.getByTestId('round-2');
      await expect(r1).toHaveAttribute('aria-pressed', 'true');
      await expect(r2).toHaveAttribute('aria-pressed', 'false');

      await r2.click();
      await expect.poll(() => new URL(page.url()).hash).toBe('#/r2/2.0');
      await expect(r2).toHaveAttribute('aria-pressed', 'true');
      await expect(r1).toHaveAttribute('aria-pressed', 'false');
      await expect(page.getByTestId('row-2.0-1').locator('[data-col="gemini"]')).toHaveCount(1);

      await page.getByTestId('tab-2.1').click();
      await expect.poll(() => new URL(page.url()).hash).toBe('#/r2/2.1');

      await r1.click();
      await expect.poll(() => new URL(page.url()).hash).toBe('#/2.1');
      await expect(r1).toHaveAttribute('aria-pressed', 'true');
      await expect(r2).toHaveAttribute('aria-pressed', 'false');

      await page.getByTestId('tab-overview').click();
      await expect.poll(() => new URL(page.url()).hash).toBe('#/overview');
      await r2.click();
      await expect.poll(() => new URL(page.url()).hash).toBe('#/r2/overview');
      await expect(page.getByTestId('overview-r2')).toBeVisible();
      await r1.click();
      await expect.poll(() => new URL(page.url()).hash).toBe('#/overview');
    });

    test(`[round2] ${vp.name} verdict2 toggles store in nrr-verdicts-r2 and leave nrr-verdicts alone`, async ({ page }) => {
      await freshLoad(page, '#/r2/2.0', page.getByTestId('row-2.0-1'));
      const v1Before = await storageRaw(page, KEY_V1);
      const row = page.getByTestId('row-2.0-1');
      const good = row.getByTestId('verdict2-good');

      await clickCentered(page, good);
      await expect(good).toHaveAttribute('aria-pressed', 'true');
      await expect(row.getByTestId('verdict2-ok')).toHaveAttribute('aria-pressed', 'false');
      await expect.poll(async () => (await storedR2(page))['2.0-1']?.verdict).toBe('good');

      await clickCentered(page, good);
      await expect(good).toHaveAttribute('aria-pressed', 'false');
      await expect.poll(async () => (await storedR2(page))['2.0-1']?.verdict).toBeUndefined();

      expect(await storageRaw(page, KEY_V1), 'nrr-verdicts untouched by round-2 verdicts').toBe(v1Before);
    });

    test(`[round2] ${vp.name} tally2 counts follow the verdicts in the section and on the overview`, async ({ page }) => {
      await freshLoad(page, '#/r2/2.0', page.getByTestId('row-2.0-1'));
      await pressVerdict(page, '2.0-1', 'good');
      await pressVerdict(page, '2.0-2', 'ok');

      const bar = tallyBar(page, vp);
      await expect.poll(() => tallyNumber(bar.getByTestId('tally2-good'))).toBe(1);
      await expect.poll(() => tallyNumber(bar.getByTestId('tally2-ok'))).toBe(1);
      await expect.poll(() => tallyNumber(bar.getByTestId('tally2-fix'))).toBe(0);

      await page.goto('/#/r2/overview');
      await expect(page.getByTestId('overview-r2')).toBeVisible();
      await expect.poll(() => tallyNumber(tallyBar(page, vp).getByTestId('tally2-good'))).toBe(1);
      await expect.poll(() => tallyNumber(tallyBar(page, vp).getByTestId('tally2-ok'))).toBe(1);
      console.log(`[round2] ${vp.name} overview tally2 good=1 ok=1 fix=0`);
    });

    test(`[round2] ${vp.name} copy-verdicts writes the round-2 Markdown with verdict and note`, async ({ page, context }) => {
      await context.grantPermissions(['clipboard-read', 'clipboard-write']);
      await freshLoad(page, '#/r2/2.0', page.getByTestId('row-2.0-1'));
      const row = page.getByTestId('row-2.0-1');
      await clickCentered(page, row.getByTestId('verdict2-good'));
      const note = row.getByTestId('verdict-note');
      await clickCentered(page, note);
      await note.fill('第二輪測試備註');
      await note.press('Tab');
      await expect.poll(async () => (await storedR2(page))['2.0-1']?.note).toBe('第二輪測試備註');

      await openTallyActions(page, vp);
      await page.getByTestId('copy-verdicts').click();
      await page.waitForFunction(
        () => typeof (window as any).__lastCopied === 'string' && (window as any).__lastCopied.length > 0,
      );
      const md = (await page.evaluate(() => (window as any).__lastCopied)) as string;
      console.log(`[round2] ${vp.name} copied markdown:\n${md}`);

      expect(md.split(/\r?\n/)[0], 'first line of round-2 Markdown').toBe(MD_TITLE);
      expect(md, 'mentions 第二輪').toContain('第二輪');
      expect(md, 'names both sources').toContain('Fable 改寫英文 · Gemini 3.6 Flash');
      expect(md, 'table header').toContain(MD_HEADER);
      const line = md.split(/\r?\n/).find((l) => l.startsWith('| 2.0 | 1 | '));
      expect(line, 'row line for 2.0 / 1').toBeDefined();
      expect(line ?? '', 'row line carries 通順 and the note').toContain(' 通順 | 第二輪測試備註 |');
    });

    test(`[round2] ${vp.name} no horizontal overflow in section 2.0 and in the overview`, async ({ page }) => {
      await page.goto('/#/r2/2.0');
      await expect(page.getByTestId('row-2.0-1')).toBeVisible();
      await expectNoOverflow(page, `[${vp.name}] round2 section 2.0`);
      await page.goto('/#/r2/overview');
      await expect(page.getByTestId('overview-r2')).toBeVisible();
      await expectNoOverflow(page, `[${vp.name}] round2 overview`);
    });
  });
}

test.describe('[round2] screenshots 1440x900', () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  test('[round2] section 2.0 saved to qa/r2-section-1440.png', async ({ page }) => {
    await freshLoad(page, '#/r2/2.0', page.getByTestId('row-2.0-1'));
    await scrollBelowTopbar(page, '#section-panel h2');
    await page.waitForTimeout(400);
    await save(page, 'r2-section-1440.png');
  });

  test('[round2] overview saved to qa/r2-overview-1440.png', async ({ page }) => {
    await freshLoad(page, '#/r2/overview', page.getByTestId('overview-r2'));
    await scrollBelowTopbar(page, '[data-testid="overview-r2"]');
    await page.waitForTimeout(400);
    await save(page, 'r2-overview-1440.png');
  });
});

test.describe('[round2] screenshots 402x874', () => {
  test.use({ viewport: { width: 402, height: 874 } });

  test('[round2] section 2.0 saved to qa/r2-section-402.png', async ({ page }) => {
    await freshLoad(page, '#/r2/2.0', page.getByTestId('row-2.0-1'));
    await scrollBelowTopbar(page, '#section-panel h2');
    await page.waitForTimeout(400);
    await save(page, 'r2-section-402.png');
  });

  test('[round2] overview saved to qa/r2-overview-402.png', async ({ page }) => {
    await freshLoad(page, '#/r2/overview', page.getByTestId('overview-r2'));
    await scrollBelowTopbar(page, '[data-testid="overview-r2"]');
    await page.waitForTimeout(400);
    await save(page, 'r2-overview-402.png');
  });
});
