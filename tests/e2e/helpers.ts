import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { expect, type Locator, type Page } from '@playwright/test';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
export const DATA_DIR = path.join(ROOT, 'data');
export const QA_DIR = path.join(ROOT, 'qa');

export interface Viewport {
  name: string;
  width: number;
  height: number;
}

export const VIEWPORTS: Viewport[] = [
  { name: '1440x900', width: 1440, height: 900 },
  { name: '1024x768', width: 1024, height: 768 },
  { name: '402x874', width: 402, height: 874 },
];

/** Phones (<=640px) keep copy/clear in the tally-menu popover; wider screens use the topbar. */
export const isPhone = (vp: Viewport) => vp.width <= 640;

export const MODEL_LABEL: Record<string, string> = {
  kimi: 'Kimi K3.1 Pro',
  gemini: 'Gemini 3.6 Flash',
};

/** Short names used on verdict buttons, keyed by the column chip text. */
export const CHIP_SHORT: Record<string, string> = {
  'Kimi K3.1 Pro': 'Kimi',
  'Gemini 3.6 Flash': 'Gemini',
  '譯本 A': '譯本 A',
  '譯本 B': '譯本 B',
};

const CHIP_TEXT_RE = /^(Kimi K3\.1 Pro|Gemini 3\.6 Flash|譯本 A|譯本 B)$/;

export type Store = Record<string, { winner?: string; note?: string }>;

export async function openSection(page: Page, section: string): Promise<void> {
  await page.goto(`/#/${section}`);
  await expect(page.getByTestId(`row-${section}-1`)).toBeVisible();
}

export async function openOverview(page: Page): Promise<void> {
  await page.getByTestId('tab-overview').click();
  await expect.poll(() => new URL(page.url()).hash).toBe('#/overview');
}

export async function readStore(page: Page): Promise<{ raw: string | null; store: Store }> {
  const raw = await page.evaluate(() => localStorage.getItem('nrr-verdicts'));
  return { raw, store: raw ? (JSON.parse(raw) as Store) : {} };
}

export async function bodyText(page: Page): Promise<string> {
  return page.evaluate(() => document.body.innerText);
}

/** Phones keep copy/clear in a popover opened by tally-menu; desktop shows them in the topbar. */
export async function openTallyActions(page: Page, vp: Viewport): Promise<void> {
  if (isPhone(vp)) {
    await page.getByTestId('tally-menu').click();
  }
  await expect(page.getByTestId('copy-verdicts')).toBeVisible();
}

/** Waits until scrollY has stopped changing (smooth scrolls and entrance motion settle). */
export async function settle(page: Page): Promise<void> {
  await page.evaluate(
    () =>
      new Promise<void>((resolve) => {
        let last = window.scrollY;
        let stable = 0;
        let frames = 0;
        const step = () => {
          frames += 1;
          const y = window.scrollY;
          stable = y === last ? stable + 1 : 0;
          last = y;
          if ((stable >= 5 && frames >= 6) || frames > 120) resolve();
          else requestAnimationFrame(step);
        };
        requestAnimationFrame(step);
      }),
  );
}

/** Scrolls a row to block:start (rows carry scroll-margin) without smooth-scroll animation. */
export async function scrollRowToStart(page: Page, rowTestId: string): Promise<void> {
  await page.evaluate((id) => {
    const el = document.querySelector<HTMLElement>(`[data-testid="${id}"]`);
    if (!el) throw new Error(`no element with data-testid="${id}"`);
    el.scrollIntoView({ block: 'start', behavior: 'instant' as ScrollBehavior });
  }, rowTestId);
  await settle(page);
}

export async function scrollToBottom(page: Page): Promise<void> {
  await page.evaluate(() =>
    window.scrollTo({ top: document.documentElement.scrollHeight, behavior: 'instant' as ScrollBehavior }),
  );
  await settle(page);
}

/**
 * Reads the column chip texts of a row in DOM order (left column first). Chips are the only text
 * nodes that exactly equal a model or 譯本 label, so this reads what the UI actually shows.
 */
export async function chipTexts(row: Locator): Promise<string[]> {
  return row.evaluate((root, re) => {
    const rx = new RegExp(re);
    const out: string[] = [];
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    let node = walker.nextNode();
    while (node) {
      const t = (node.textContent ?? '').trim();
      if (rx.test(t)) out.push(t);
      node = walker.nextNode();
    }
    return out;
  }, CHIP_TEXT_RE.source);
}

/** Expected verdict button labels from the chips in column order: left, tie, right. */
export function expectedVerdictLabels(chips: string[]): { left: string; tie: string; right: string } {
  const [l, r] = chips;
  const shortL = l === undefined ? undefined : CHIP_SHORT[l];
  const shortR = r === undefined ? undefined : CHIP_SHORT[r];
  if (!shortL || !shortR) {
    throw new Error(`unexpected column chip texts: ${JSON.stringify(chips)}`);
  }
  return { left: `${shortL} 較好`, tie: '差不多', right: `${shortR} 較好` };
}

export async function overflowReport(page: Page) {
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

export async function expectNoOverflow(page: Page, label: string): Promise<void> {
  const { sw, cw, offenders } = await overflowReport(page);
  console.log(`${label}: scrollWidth=${sw} clientWidth=${cw} overflow=${sw - cw}px`);
  expect(
    sw,
    `${label}: documentElement.scrollWidth ${sw} > clientWidth ${cw}. ` +
      `Offenders (top 10 by right edge, right > clientWidth+1): ${offenders.join(' | ') || 'none'}`,
  ).toBeLessThanOrEqual(cw);
}

/** A model's translation for a section is missing when data/<model>/ has no "<section>-*.md". */
export function missingModels(section: string): string[] {
  return ['kimi', 'gemini'].filter((model) => {
    const dir = path.join(DATA_DIR, model);
    return !fs.existsSync(dir) || !fs.readdirSync(dir).some((f) => f.startsWith(`${section}-`) && f.endsWith('.md'));
  });
}

/** Placeholder must render exactly when some model's translation is missing for the section. */
export async function expectPlaceholder(page: Page, vpName: string, section: string): Promise<void> {
  const missing = missingModels(section);
  await openSection(page, section);
  const ph = page.locator('[data-testid="placeholder-missing"]');
  const count = await ph.count();
  console.log(`[${vpName}] #/${section} missing=[${missing.join(',') || 'none'}] placeholder-missing count=${count}`);
  if (missing.length === 0) {
    expect(count, `#/${section} has no missing translation but ${count} placeholder-missing rendered`).toBe(0);
    return;
  }
  expect(count, `#/${section} missing ${missing.join(',')} but no [data-testid="placeholder-missing"]`).toBeGreaterThanOrEqual(1);
  const visible = ph.filter({ visible: true }).first();
  await expect(visible, `no visible placeholder-missing in #/${section}`).toBeVisible();
  const text = (await visible.innerText()).trim();
  console.log(`[${vpName}] #/${section} placeholder text: "${text}"`);
  expect(text, `placeholder text in #/${section}`).toContain('尚未完成');
}

/**
 * In-page scan for the overlap check. Returns human-readable problem lines (empty = clean).
 * - Every visible fixed/sticky element outside topbar/bottombar must not intersect a row text box
 *   (`[data-testid^=row-] .prose`, `[data-testid^=row-] p`, `td`).
 * - With opts.rowTid: topbar/bottombar must not cover that row's head band or first text box, and the
 *   topbar must sit above the row's top edge.
 * - With opts.checkFooter (phone, bottom of page): the footer's last line must be above the bottombar.
 */
export function overlapScan(opts: { rowTid?: string; checkFooter?: boolean }): string[] {
  type Box = { l: number; t: number; r: number; b: number };
  const problems: string[] = [];
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const box = (el: Element): Box => {
    const r = el.getBoundingClientRect();
    return { l: r.left, t: r.top, r: r.right, b: r.bottom };
  };
  const fmt = (q: Box) =>
    `rect(x=${Math.round(q.l)} y=${Math.round(q.t)} w=${Math.round(q.r - q.l)} h=${Math.round(q.b - q.t)})`;
  const describe = (el: Element) => {
    const cls = (el.getAttribute('class') ?? '').trim().split(/\s+/).filter(Boolean).slice(0, 6).join('.');
    const tid = el.getAttribute('data-testid');
    const txt = (el.textContent ?? '').replace(/\s+/g, ' ').trim().slice(0, 28);
    return `<${el.tagName.toLowerCase()}${cls ? ` class="${cls}"` : ''}${tid ? ` data-testid="${tid}"` : ''}>${txt ? ` "${txt}"` : ''}`;
  };
  const visible = (el: Element) => {
    const cs = getComputedStyle(el);
    if (cs.display === 'none' || cs.visibility === 'hidden' || Number(cs.opacity) === 0) return false;
    const q = box(el);
    if (q.r - q.l <= 0 || q.b - q.t <= 0) return false;
    return q.b > 0 && q.r > 0 && q.t < vh && q.l < vw;
  };
  const inBar = (el: Element) => el.closest('[data-testid="topbar"], [data-testid="bottombar"]') !== null;
  const hits = (a: Box, b: Box) => Math.min(a.r, b.r) - Math.max(a.l, b.l) > 1 && Math.min(a.b, b.b) - Math.max(a.t, b.t) > 1;
  const rowOf = (el: Element) => el.closest('[data-testid^="row-"]')?.getAttribute('data-testid') ?? '(outside rows)';

  const bars = ['topbar', 'bottombar']
    .map((id) => document.querySelector(`[data-testid="${id}"]`))
    .filter((el): el is Element => el !== null && visible(el));

  // 1. Other fixed/sticky elements against row text boxes.
  const textEls = Array.from(document.querySelectorAll('[data-testid^="row-"] .prose, [data-testid^="row-"] p, td'))
    .filter((el) => visible(el) && !inBar(el));
  const overlays = Array.from(document.querySelectorAll('body *')).filter((el) => {
    const pos = getComputedStyle(el).position;
    return (pos === 'fixed' || pos === 'sticky') && !inBar(el) && visible(el);
  });
  for (const f of overlays) {
    const fb = box(f);
    let shown = 0;
    for (const t of textEls) {
      const tb = box(t);
      if (!hits(fb, tb)) continue;
      shown += 1;
      if (shown > 3) break;
      problems.push(
        `overlay ${describe(f)} ${fmt(fb)} (position=${getComputedStyle(f).position}) intersects text ${describe(t)} ${fmt(tb)} in ${rowOf(t)}`,
      );
    }
  }

  // 2. Bars must not cover the row that was scrolled into view at block:start.
  if (opts.rowTid) {
    const row = document.querySelector(`[data-testid="${opts.rowTid}"]`);
    if (row) {
      const rb = box(row);
      const head: Box = { l: rb.l, r: rb.r, t: rb.t, b: rb.t + 48 };
      const firstText = Array.from(row.querySelectorAll('p, td, .prose')).find((el) => visible(el)) ?? null;
      for (const bar of bars) {
        const name = bar.getAttribute('data-testid');
        const bb = box(bar);
        if (hits(bb, head)) {
          problems.push(`${name} ${fmt(bb)} covers head of ${opts.rowTid} ${fmt(head)}`);
        }
        if (firstText && hits(bb, box(firstText))) {
          problems.push(`${name} ${fmt(bb)} covers first text of ${opts.rowTid} ${describe(firstText)} ${fmt(box(firstText))}`);
        }
        if (name === 'topbar' && bb.b > rb.t + 1) {
          problems.push(`topbar bottom ${Math.round(bb.b)} is below ${opts.rowTid} top ${Math.round(rb.t)}`);
        }
      }
    }
  }

  // 3. Phone at bottom of page: footer last line must sit above the bottombar.
  if (opts.checkFooter) {
    const bottom = document.querySelector('[data-testid="bottombar"]');
    const footerLines = Array.from(document.querySelectorAll('footer p')).filter((el) => visible(el));
    const last = footerLines[footerLines.length - 1];
    if (bottom && visible(bottom) && last) {
      const bb = box(bottom);
      const lb = box(last);
      if (lb.b > bb.t + 0.5) {
        problems.push(
          `footer last line ${describe(last)} ${fmt(lb)} bottom ${Math.round(lb.b)} is below bottombar top ${Math.round(bb.t)} ${fmt(bb)}`,
        );
      }
    }
  }
  return problems;
}
