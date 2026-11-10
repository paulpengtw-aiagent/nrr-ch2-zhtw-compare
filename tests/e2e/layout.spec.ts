import { test, expect, type Page } from '@playwright/test';
import {
  VIEWPORTS,
  isPhone,
  openSection,
  overlapScan,
  scrollRowToStart,
  scrollToBottom,
  settle,
} from './helpers';

/** What the overlap scan actually looked at, so a zero-problem result cannot be vacuous. */
async function overlayStats(page: Page): Promise<string> {
  return page.evaluate(() => {
    const isBar = (el: Element) => el.closest('[data-testid="topbar"], [data-testid="bottombar"]') !== null;
    const overlays = Array.from(document.querySelectorAll('body *')).filter((el) => {
      const pos = getComputedStyle(el).position;
      return (pos === 'fixed' || pos === 'sticky') && !isBar(el);
    });
    const names = overlays.map((el) => {
      const r = el.getBoundingClientRect();
      const cls = (el.getAttribute('class') ?? '').trim().split(/\s+/)[0] ?? '';
      return `${el.tagName.toLowerCase()}.${cls} y=${Math.round(r.top)} h=${Math.round(r.height)}`;
    });
    const textBoxes = document.querySelectorAll('[data-testid^="row-"] .prose, [data-testid^="row-"] p, td').length;
    const bars = ['topbar', 'bottombar'].filter((id) => document.querySelector(`[data-testid="${id}"]`)).join(',');
    return `scrollY=${Math.round(window.scrollY)} fixed/sticky(non-bar)=${overlays.length} [${names.join(' ; ')}] textBoxes=${textBoxes} bars=[${bars}]`;
  });
}

// Fix 1 guard: no fixed/sticky element (other than topbar/bottombar) may cover row text, and the
// topbar/bottombar may not cover the row scrolled into view at block:start. Phones also check that
// the footer's last line sits above the bottombar at the bottom of the page.
for (const vp of VIEWPORTS) {
  test.describe(vp.name, () => {
    test.use({ viewport: { width: vp.width, height: vp.height } });

    for (const section of ['2.0', '2.1']) {
      test(`[${vp.name}] #/${section} no overlay covers row text at top, row 3, row 6, bottom`, async ({ page }) => {
        await openSection(page, section);
        // Let the topbar/bottombar entrance motion finish before measuring.
        await page.waitForTimeout(400);
        const problems: string[] = [];
        const record = (stop: string, list: string[]) => {
          for (const p of list) problems.push(`[${stop}] ${p}`);
        };

        await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior }));
        await settle(page);
        console.log(`[${vp.name}] #/${section} top: ${await overlayStats(page)}`);
        record('top', await page.evaluate(overlapScan, {}));

        const row3 = `row-${section}-3`;
        await scrollRowToStart(page, row3);
        console.log(`[${vp.name}] #/${section} ${row3}: ${await overlayStats(page)}`);
        record(row3, await page.evaluate(overlapScan, { rowTid: row3 }));

        const row6 = `row-${section}-6`;
        await scrollRowToStart(page, row6);
        console.log(`[${vp.name}] #/${section} ${row6}: ${await overlayStats(page)}`);
        record(row6, await page.evaluate(overlapScan, { rowTid: row6 }));

        await scrollToBottom(page);
        console.log(`[${vp.name}] #/${section} bottom: ${await overlayStats(page)}`);
        record('bottom', await page.evaluate(overlapScan, { checkFooter: isPhone(vp) }));

        console.log(`[${vp.name}] #/${section} overlap problems: ${problems.length}`);
        expect(
          problems.length,
          `${problems.length} overlap problem(s) on #/${section} at ${vp.name}:\n${problems.join('\n')}`,
        ).toBe(0);
      });
    }

    test(`[${vp.name}] topbar/bottombar sit where the layout contract says`, async ({ page }) => {
      await openSection(page, '2.0');
      if (isPhone(vp)) {
        await expect(page.getByTestId('bottombar')).toBeVisible();
        const box = await page.getByTestId('bottombar').boundingBox();
        console.log(`[${vp.name}] bottombar box=${JSON.stringify(box)}`);
        expect(box?.height ?? 999, 'bottombar must be <=48px tall on phones').toBeLessThanOrEqual(48);
        expect(box ? box.y + box.height : 0, 'bottombar must sit at the bottom of the viewport').toBeGreaterThanOrEqual(vp.height - 1);
      } else {
        // The topbar is in normal flow below the hero at scrollY 0 and sticks to the top once scrolled.
        await scrollRowToStart(page, 'row-2.0-3');
        await expect(page.getByTestId('topbar')).toBeVisible();
        const box = await page.getByTestId('topbar').boundingBox();
        console.log(`[${vp.name}] topbar box (scrolled to row 2.0-3)=${JSON.stringify(box)}`);
        expect(box?.y ?? 999, 'topbar must stick to the top of the viewport once scrolled').toBeLessThanOrEqual(1);
      }
    });
  });
}
