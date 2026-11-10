import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { toast, Toaster } from 'sonner';
import rawData from '@/generated/compare.json';
import type { CompareData, ModelId, Section } from '@/types';
import { TooltipProvider } from '@/components/ui/tooltip';
import { BottomBar } from '@/components/BottomBar';
import { ClearDialog } from '@/components/VerdictActions';
import { Footer } from '@/components/Footer';
import { Header } from '@/components/Header';
import { OverviewView } from '@/components/OverviewView';
import { RoundSwitch } from '@/components/RoundSwitch';
import { RoundTwoApp } from '@/components/RoundTwoApp';
import { SectionView, type NavTarget } from '@/components/SectionView';
import { TopBar } from '@/components/TopBar';
import type { TabItem } from '@/components/SectionTabs';
import { useBlind } from '@/hooks/useBlind';
import { useHashRoute } from '@/hooks/useHashRoute';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import { useRound } from '@/hooks/useRound';
import { useTheme } from '@/hooks/useTheme';
import { useVerdicts } from '@/hooks/useVerdicts';
import { buildHash, OVERVIEW_ID } from '@/lib/ui/links';
import { DEFAULT_PAIR, TITLE_BLIND, TITLE_NAMED } from '@/lib/ui/models';
import { buildRoundHash } from '@/lib/ui/round';
import { shortName, tallyOf, type Tally } from '@/lib/ui/stats';
import { buildVerdictMarkdown } from '@/lib/ui/verdicts';
import { cn } from '@/lib/ui/utils';

const data = rawData as unknown as CompareData;
const NAMES: Record<ModelId, string> = {
  kimi: shortName(data.meta, 'kimi'),
  gemini: shortName(data.meta, 'gemini'),
};

/** Round 1 (original English, Kimi vs Gemini). Its behaviour is unchanged; the round switch sits above its hero. */
function RoundOneApp() {
  const sections = data.sections;
  const { route } = useHashRoute();
  const isOverview = route.overview;
  const active: Section | undefined = isOverview
    ? undefined
    : (sections.find((s) => s.id === route.sectionId) ?? sections[0]);
  const currentId = isOverview ? OVERVIEW_ID : (active?.id ?? OVERVIEW_ID);
  const rowN = active && route.sectionId === active.id ? route.rowN : null;

  const theme = useTheme();
  const { blind, setBlind, reveal, pairFor } = useBlind(sections.map((s) => s.id));
  const [showEn, setShowEn] = useLocalStorage<boolean>('nrr-show-en', false);
  const { store, setWinner, setNote, clearAll, epoch } = useVerdicts();
  const isPhone = useMediaQuery('(max-width: 640px)');
  const [clearOpen, setClearOpen] = useState(false);

  useEffect(() => {
    document.title = blind ? TITLE_BLIND : TITLE_NAMED;
  }, [blind]);

  // Moving to the overview scrolls past the hero; the first render (deep link) does not.
  const firstRender = useRef(true);
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    if (isOverview) document.getElementById('content')?.scrollIntoView({ block: 'start' });
  }, [isOverview]);

  const pair = active ? pairFor(active.id) : DEFAULT_PAIR;

  const tally: Tally = useMemo(() => {
    if (active) return tallyOf(active, store);
    const total: Tally = { kimi: 0, gemini: 0, tie: 0 };
    for (const s of sections) {
      const t = tallyOf(s, store);
      total.kimi += t.kimi;
      total.gemini += t.gemini;
      total.tie += t.tie;
    }
    return total;
  }, [active, sections, store]);

  const tabs: TabItem[] = useMemo(
    () => [
      ...sections.map((s) => ({ id: s.id, num: s.id, label: s.titleZh, tip: s.titleEn })),
      { id: OVERVIEW_ID, num: '', label: '總覽', tip: '全部章節的評判統計、耗時、花費、Lint 與結構，以及備註列表' },
    ],
    [sections],
  );

  const order = useMemo(() => [...sections.map((s) => s.id), OVERVIEW_ID], [sections]);
  const idx = order.indexOf(currentId);
  const prevId = idx > 0 ? order[idx - 1] : null;
  const nextId = idx >= 0 && idx < order.length - 1 ? order[idx + 1] : null;

  const go = useCallback((id: string) => {
    window.location.hash = buildHash(id);
  }, []);

  const targetOf = (id: string | null): NavTarget | null => {
    if (!id) return null;
    if (id === OVERVIEW_ID) return { id, text: '總覽', tip: '全部章節的評判統計與備註列表' };
    const s = sections.find((x) => x.id === id);
    return s ? { id, text: `${s.id} ${s.titleZh}`, tip: s.titleEn } : null;
  };

  const getMarkdown = useCallback(() => buildVerdictMarkdown(data, store), [store]);

  // Keyboard shortcuts. Ignored while typing and while a dialog is open.
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
      if (key === 'b') {
        e.preventDefault();
        setBlind((v) => !v);
        return;
      }
      if (isOverview) return;

      if (key === 'j' || key === 'k') {
        const rows = Array.from(document.querySelectorAll<HTMLElement>('#section-panel article[data-row]'));
        if (rows.length === 0) return;
        const focused = document.activeElement;
        const cur = rows.findIndex((r) => r === focused || r.contains(focused));
        const nextIndex =
          cur === -1 ? 0 : Math.min(rows.length - 1, Math.max(0, cur + (key === 'j' ? 1 : -1)));
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
        const testId = key === '1' ? 'verdict-left' : key === '2' ? 'verdict-tie' : 'verdict-right';
        const btn = row.querySelector<HTMLButtonElement>(`[data-testid="${testId}"]`);
        if (!btn) return;
        e.preventDefault();
        btn.click();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [clearOpen, go, isOverview, nextId, prevId, setBlind, setShowEn]);

  return (
    <TooltipProvider delayDuration={200} skipDelayDuration={300}>
      <div className={cn('min-h-dvh bg-background text-foreground', isPhone && 'pb-16')}>
        <a
          href="#content"
          className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-[100] focus:rounded-md focus:bg-card focus:px-3 focus:py-2 focus:shadow-lg focus:ring-2 focus:ring-ring"
        >
          跳到正文
        </a>
        <RoundSwitch round={1} blind={blind} onSelect={(r) => (window.location.hash = buildRoundHash(r, currentId))} />
        <Header
          meta={data.meta}
          blind={blind}
          showEn={showEn}
          themeMode={theme.mode}
          onCycleTheme={theme.cycle}
          onToggleEn={() => setShowEn((v) => !v)}
          onToggleBlind={() => setBlind((v) => !v)}
          onReveal={reveal}
        />
        <TopBar
          items={tabs}
          activeId={currentId}
          onSelect={go}
          isPhone={isPhone}
          tally={tally}
          pair={pair}
          blind={blind}
          names={NAMES}
          getMarkdown={getMarkdown}
          onClear={() => setClearOpen(true)}
        />
        <main id="content" className="mx-auto w-full max-w-[88rem] scroll-mt-24 px-3 pb-12 pt-6 sm:px-6 sm:pb-16">
          {active ? (
            <SectionView
              section={active}
              meta={data.meta}
              names={NAMES}
              blind={blind}
              showEn={showEn}
              pair={pair}
              rowN={rowN}
              store={store}
              epoch={epoch}
              prev={targetOf(prevId)}
              next={targetOf(nextId)}
              onSelect={go}
              onWinner={setWinner}
              onNote={setNote}
            />
          ) : (
            <OverviewView
              sections={sections}
              meta={data.meta}
              store={store}
              names={NAMES}
              blind={blind}
              onReveal={reveal}
            />
          )}
        </main>
        <Footer meta={data.meta} generatedAt={data.generatedAt} blind={blind} />
        {isPhone && (
          <BottomBar
            tally={tally}
            pair={pair}
            blind={blind}
            names={NAMES}
            getMarkdown={getMarkdown}
            onClear={() => setClearOpen(true)}
          />
        )}
        <ClearDialog
          open={clearOpen}
          onOpenChange={setClearOpen}
          onConfirm={() => {
            clearAll();
            toast('已清除');
          }}
        />
        <Toaster position="top-center" theme={theme.dark ? 'dark' : 'light'} closeButton />
      </div>
    </TooltipProvider>
  );
}

/** Picks the round named by the hash (or the remembered round); each round owns its own app shell. */
export default function App() {
  const { round } = useRound();
  return round === 2 ? <RoundTwoApp /> : <RoundOneApp />;
}
