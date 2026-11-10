import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { toast, Toaster } from 'sonner';
import rawR2 from '@/generated/compare-r2.json';
import type { R2Data, R2Section } from '@/types';
import { TooltipProvider } from '@/components/ui/tooltip';
import { useHashRoute } from '@/hooks/useHashRoute';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import { useTheme } from '@/hooks/useTheme';
import { useVerdictsR2 } from '@/hooks/useVerdictsR2';
import { OVERVIEW_ID } from '@/lib/ui/links';
import { DEFAULT_PAIR } from '@/lib/ui/models';
import { buildRoundHash, parseRoundHash, TITLE_R2 } from '@/lib/ui/round';
import { buildVerdictMarkdownR2, tally2All, tallyOf2, type Tally2 } from '@/lib/ui/verdicts2';
import { cn } from '@/lib/ui/utils';
import { BottomBar } from './BottomBar';
import { ClearDialog } from './VerdictActions';
import { HeaderR2 } from './HeaderR2';
import { OverviewViewR2 } from './OverviewViewR2';
import { RoundSwitch } from './RoundSwitch';
import { SectionViewR2 } from './SectionViewR2';
import type { NavTarget } from './SectionView';
import type { TabItem } from './SectionTabs';
import { TopBar } from './TopBar';

const data = rawR2 as unknown as R2Data;

// Round-1 tally props are unused while tally2 is set; TopBar and BottomBar still require them.
const UNUSED_R1 = { tally: { kimi: 0, gemini: 0, tie: 0 }, pair: DEFAULT_PAIR, blind: false, names: { kimi: 'Kimi', gemini: 'Gemini' } };

/** Round 2 app shell: Fable-rewritten English vs Gemini 3.6 Flash, one model, no blind mode. */
export function RoundTwoApp() {
  const sections = data.sections;
  const { hash } = useHashRoute();
  const { route } = parseRoundHash(hash);
  const isOverview = route.overview;
  const active: R2Section | undefined = isOverview
    ? undefined
    : (sections.find((s) => s.id === route.sectionId) ?? sections[0]);
  const currentId = isOverview ? OVERVIEW_ID : (active?.id ?? OVERVIEW_ID);
  const rowN = active && route.sectionId === active.id ? route.rowN : null;

  const theme = useTheme();
  const [showEn, setShowEn] = useLocalStorage<boolean>('nrr-show-en-r2', true);
  const { store, setVerdict, setNote, clearAll, epoch } = useVerdictsR2();
  const isPhone = useMediaQuery('(max-width: 640px)');
  const [clearOpen, setClearOpen] = useState(false);

  useEffect(() => {
    document.title = TITLE_R2;
  }, []);

  // Moving to the overview scrolls past the hero; the first render (deep link) does not.
  const firstRender = useRef(true);
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    if (isOverview) document.getElementById('content')?.scrollIntoView({ block: 'start' });
  }, [isOverview]);

  const tally: Tally2 = useMemo(
    () => (active ? tallyOf2(active, store) : tally2All(sections, store)),
    [active, sections, store],
  );

  const tabs: TabItem[] = useMemo(
    () => [
      ...sections.map((s) => ({ id: s.id, num: s.id, label: s.titleZh, tip: s.titleEn })),
      { id: OVERVIEW_ID, num: '', label: '總覽', tip: '第二輪全部章節的評判統計、耗時、--check、Lint 與備註列表' },
    ],
    [sections],
  );

  const order = useMemo(() => [...sections.map((s) => s.id), OVERVIEW_ID], [sections]);
  const idx = order.indexOf(currentId);
  const prevId = idx > 0 ? order[idx - 1] : null;
  const nextId = idx >= 0 && idx < order.length - 1 ? order[idx + 1] : null;

  const go = useCallback((id: string) => {
    window.location.hash = buildRoundHash(2, id);
  }, []);

  const targetOf = (id: string | null): NavTarget | null => {
    if (!id) return null;
    if (id === OVERVIEW_ID) return { id, text: '總覽', tip: '第二輪全部章節的評判統計與備註列表' };
    const s = sections.find((x) => x.id === id);
    return s ? { id, text: `${s.id} ${s.titleZh}`, tip: s.titleEn } : null;
  };

  const getMarkdown = useCallback(() => buildVerdictMarkdownR2(data, store), [store]);

  // Keyboard shortcuts (round 2). Ignored while typing and while a dialog is open. b (blind) does not exist here.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.defaultPrevented || e.metaKey || e.ctrlKey || e.altKey) return;
      const target = e.target as HTMLElement | null;
      if (target && (target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName))) return;
      if (clearOpen || target?.closest('[role="dialog"], [role="alertdialog"]')) return;

      const key = e.key;
      if (key === '[' || key === ']') {
        const to = key === '[' ? prevId : nextId;
        if (to) {
          e.preventDefault();
          go(to);
        }
        return;
      }
      if (key === 'e') {
        e.preventDefault();
        setShowEn((v) => !v);
        return;
      }
      if (isOverview) return;

      if (key === 'j' || key === 'k') {
        const rows = Array.from(document.querySelectorAll<HTMLElement>('#section-panel article[data-row]'));
        if (rows.length === 0) return;
        const focused = document.activeElement;
        const cur = rows.findIndex((r) => r === focused || r.contains(focused));
        const nextIndex = cur === -1 ? 0 : Math.min(rows.length - 1, Math.max(0, cur + (key === 'j' ? 1 : -1)));
        e.preventDefault();
        const el = rows[nextIndex];
        if (!el) return;
        const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        el.focus({ preventScroll: true });
        el.scrollIntoView({ block: 'start', behavior: reduce ? 'auto' : 'smooth' });
        return;
      }

      if (key === '1' || key === '2' || key === '3') {
        const focused = document.activeElement as HTMLElement | null;
        const row = focused?.closest<HTMLElement>('article[data-row]');
        if (!row) return;
        const testId = key === '1' ? 'verdict2-good' : key === '2' ? 'verdict2-ok' : 'verdict2-fix';
        const btn = row.querySelector<HTMLButtonElement>(`[data-testid="${testId}"]`);
        if (!btn) return;
        e.preventDefault();
        btn.click();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [clearOpen, go, isOverview, nextId, prevId, setShowEn]);

  return (
    <TooltipProvider delayDuration={200} skipDelayDuration={300}>
      <div className={cn('min-h-dvh bg-background text-foreground', isPhone && 'pb-16')}>
        <a
          href="#content"
          className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-[100] focus:rounded-md focus:bg-card focus:px-3 focus:py-2 focus:shadow-lg focus:ring-2 focus:ring-ring"
        >
          跳到正文
        </a>
        <RoundSwitch round={2} onSelect={(r) => (window.location.hash = buildRoundHash(r, currentId))} />
        <HeaderR2
          meta={data.meta}
          themeMode={theme.mode}
          onCycleTheme={theme.cycle}
          showEn={showEn}
          onToggleEn={() => setShowEn((v) => !v)}
        />
        <TopBar
          items={tabs}
          activeId={currentId}
          onSelect={go}
          isPhone={isPhone}
          getMarkdown={getMarkdown}
          onClear={() => setClearOpen(true)}
          {...UNUSED_R1}
          tally2={tally}
        />
        <main id="content" className="mx-auto w-full max-w-[88rem] scroll-mt-24 px-3 pb-12 pt-6 sm:px-6 sm:pb-16">
          {active ? (
            <SectionViewR2
              section={active}
              showEn={showEn}
              rowN={rowN}
              store={store}
              epoch={epoch}
              prev={targetOf(prevId)}
              next={targetOf(nextId)}
              onSelect={go}
              onVerdict={setVerdict}
              onNote={setNote}
            />
          ) : (
            <OverviewViewR2 data={data} store={store} />
          )}
        </main>
        <footer className="mx-auto w-full max-w-[88rem] border-t border-border px-4 py-8 text-sm leading-relaxed text-muted-foreground sm:px-6">
          <p>執行日期：{data.meta.runDate}</p>
          <p>比較對象：Fable 改寫英文（新英文）× Gemini 3.6 Flash（zh-TW）</p>
          <p>
            <a
              href={data.meta.enSource.url}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-sm underline underline-offset-4 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              英文原文（第二輪）
            </a>
            <span className="mx-2" aria-hidden="true">
              ·
            </span>
            資料產生時間：{data.generatedAt}
          </p>
        </footer>
        {isPhone && (
          <BottomBar
            getMarkdown={getMarkdown}
            onClear={() => setClearOpen(true)}
            {...UNUSED_R1}
            tally2={tally}
          />
        )}
        <ClearDialog
          open={clearOpen}
          onOpenChange={setClearOpen}
          description="第二輪的所有評判與備註都會從這個瀏覽器移除，無法復原。第一輪的評語不受影響。若還需要，請先複製評語。"
          onConfirm={() => {
            clearAll();
            toast('已清除第二輪評語');
          }}
        />
        <Toaster position="top-center" theme={theme.dark ? 'dark' : 'light'} closeButton />
      </div>
    </TooltipProvider>
  );
}

