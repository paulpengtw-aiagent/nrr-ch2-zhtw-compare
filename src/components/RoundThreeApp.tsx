import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'motion/react';
import { Eye, EyeOff } from 'lucide-react';
import { toast, Toaster } from 'sonner';
import rawR3 from '@/generated/compare-r3.json';
import type { R3Data, R3Section } from '@/types';
import { Button } from '@/components/ui/button';
import { Toggle } from '@/components/ui/toggle';
import { TooltipProvider } from '@/components/ui/tooltip';
import { useHashRoute } from '@/hooks/useHashRoute';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import { useTheme } from '@/hooks/useTheme';
import { useVerdictsR3 } from '@/hooks/useVerdictsR3';
import { OVERVIEW_ID } from '@/lib/ui/links';
import { DEFAULT_PAIR } from '@/lib/ui/models';
import { buildRoundHash, parseRoundHash, TITLE_R3, TITLE_R3_BLIND } from '@/lib/ui/round';
import { buildVerdictMarkdownR3, orderOf, tally3All, tallyOf3, TIE } from '@/lib/ui/verdicts3';
import { cn } from '@/lib/ui/utils';
import { BottomBar } from './BottomBar';
import { ClearDialog } from './VerdictActions';
import { InfoTip } from './InfoTip';
import { OverviewViewR3 } from './OverviewViewR3';
import { RoundSwitch } from './RoundSwitch';
import { SectionViewR3 } from './SectionViewR3';
import type { NavTarget } from './SectionView';
import type { TabItem } from './SectionTabs';
import { TallyR3 } from './TallyR3';
import { ThemeToggle } from './ThemeToggle';
import { TopBar } from './TopBar';

const data = rawR3 as unknown as R3Data;
const MODELS = data.meta.models;
const UNUSED_R1 = { tally: { kimi: 0, gemini: 0, tie: 0 }, pair: DEFAULT_PAIR, blind: false, names: { kimi: 'Kimi', gemini: 'Gemini' } };

/** Column ids: the four model ids and 'published'. Blind mode stores slots instead ('A'..'D', 'published'). */
export const DEFAULT_COLS = MODELS.map((m) => m.id);
export const DEFAULT_COLS_BLIND = ['A', 'B', 'C', 'D'];
export const COLS_KEY = 'nrr-r3-cols';
export const COLS_KEY_BLIND = 'nrr-r3-cols-blind';
export const MIN_COLS = 2;
export const MAX_COLS = 4;

/** Round 3: four Gemini models (Antigravity) on the same English, plus the published copy as a reference column. */
export function RoundThreeApp() {
  const sections = data.sections;
  const { hash } = useHashRoute();
  const { route } = parseRoundHash(hash);
  const isOverview = route.overview;
  const active: R3Section | undefined = isOverview ? undefined : (sections.find((s) => s.id === route.sectionId) ?? sections[0]);
  const currentId = isOverview ? OVERVIEW_ID : (active?.id ?? OVERVIEW_ID);
  const rowN = active && route.sectionId === active.id ? route.rowN : null;

  const theme = useTheme();
  const [showEn, setShowEn] = useLocalStorage<boolean>('nrr-show-en-r3', true);
  const [blind, setBlind] = useLocalStorage<boolean>('nrr-blind-r3', false);
  const [cols, setCols] = useLocalStorage<string[]>(COLS_KEY, DEFAULT_COLS);
  const [colsBlind, setColsBlind] = useLocalStorage<string[]>(COLS_KEY_BLIND, DEFAULT_COLS_BLIND);
  const { store, setPick, setNote, clearAll, epoch } = useVerdictsR3();
  const isPhone = useMediaQuery('(max-width: 640px)');
  const [clearOpen, setClearOpen] = useState(false);

  useEffect(() => {
    document.title = blind ? TITLE_R3_BLIND : TITLE_R3;
  }, [blind]);

  const firstRender = useRef(true);
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    if (isOverview) document.getElementById('content')?.scrollIntoView({ block: 'start' });
  }, [isOverview]);

  const tally = useMemo(
    () => (active ? tallyOf3(active, store, MODELS) : tally3All(sections, store, MODELS)),
    [active, sections, store],
  );

  const tabs: TabItem[] = useMemo(
    () => [
      ...sections.map((s) => ({ id: s.id, num: s.id, label: s.titleZh, tip: s.titleEn })),
      { id: OVERVIEW_ID, num: '', label: '總覽', tip: '第三輪：各模型的評判統計、耗時、tokens 與檢查結果' },
    ],
    [sections],
  );
  const order = useMemo(() => [...sections.map((s) => s.id), OVERVIEW_ID], [sections]);
  const idx = order.indexOf(currentId);
  const prevId = idx > 0 ? order[idx - 1] : null;
  const nextId = idx >= 0 && idx < order.length - 1 ? order[idx + 1] : null;

  const go = useCallback((id: string) => {
    window.location.hash = buildRoundHash(3, id);
  }, []);
  const targetOf = (id: string | null): NavTarget | null => {
    if (!id) return null;
    if (id === OVERVIEW_ID) return { id, text: '總覽', tip: '第三輪全部章節的評判統計與檢查結果' };
    const s = sections.find((x) => x.id === id);
    return s ? { id, text: `${s.id} ${s.titleZh}`, tip: s.titleEn } : null;
  };

  const getMarkdown = useCallback(() => buildVerdictMarkdownR3(data, store), [store]);

  const toggleBlind = useCallback(() => {
    setBlind((b) => {
      toast(b ? '已揭曉模型名稱' : '盲測：模型名稱改為譯本 A–D（每檔順序固定打亂）');
      return !b;
    });
  }, [setBlind]);

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
        toggleBlind();
        return;
      }
      if (isOverview || !active) return;
      if (key === 'j' || key === 'k') {
        const rows = Array.from(document.querySelectorAll<HTMLElement>('#section-panel article[data-row]'));
        if (rows.length === 0) return;
        const focused = document.activeElement;
        const cur = rows.findIndex((r) => r === focused || r.contains(focused));
        const next = cur === -1 ? 0 : Math.min(rows.length - 1, Math.max(0, cur + (key === 'j' ? 1 : -1)));
        e.preventDefault();
        const el = rows[next];
        if (!el) return;
        const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        el.focus({ preventScroll: true });
        el.scrollIntoView({ block: 'start', behavior: reduce ? 'auto' : 'smooth' });
        return;
      }
      if (/^[1-5]$/.test(key)) {
        const row = (document.activeElement as HTMLElement | null)?.closest<HTMLElement>('article[data-row]');
        if (!row) return;
        const ids = orderOf(active, MODELS, blind);
        const pick = key === '5' ? TIE : ids[Number(key) - 1];
        const btn = row.querySelector<HTMLButtonElement>(`[data-pick="${pick}"]`);
        if (!btn || btn.disabled) return;
        e.preventDefault();
        btn.click();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [active, blind, clearOpen, go, isOverview, nextId, prevId, setShowEn, toggleBlind]);

  const tallyNode = (compact: boolean) => <TallyR3 counts={tally} models={MODELS} section={active} blind={blind} compact={compact} />;

  return (
    <TooltipProvider delayDuration={200} skipDelayDuration={300}>
      <div className={cn('min-h-dvh bg-background text-foreground', isPhone && 'pb-16')}>
        <a
          href="#content"
          className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-[100] focus:rounded-md focus:bg-card focus:px-3 focus:py-2 focus:shadow-lg focus:ring-2 focus:ring-ring"
        >
          跳到正文
        </a>
        <RoundSwitch round={3} onSelect={(r) => (window.location.hash = buildRoundHash(r, currentId))} />
        <header className="mx-auto w-full max-w-[88rem] px-4 pb-6 pt-6 sm:px-6 sm:pt-8">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs font-medium tracking-[0.16em] text-muted-foreground">
            <span>第 2 章</span>
            <span aria-hidden="true">·</span>
            <span>第三輪：同一份英文，四個模型並排比較</span>
          </div>
          <motion.h1
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
            className="mt-3 max-w-[50rem] text-balance text-2xl font-semibold leading-snug tracking-tight sm:text-3xl"
          >
            {blind ? TITLE_R3_BLIND : TITLE_R3}
          </motion.h1>
          <div className="mt-5 max-w-[60rem] space-y-3 text-[0.95rem] leading-[1.8] text-muted-foreground">
            <p data-testid="hero-r3">
              {data.meta.how}
              <span className="mx-2" aria-hidden="true">·</span>
              <a href={data.meta.enSource.url} target="_blank" rel="noopener noreferrer" className="rounded-sm underline underline-offset-4 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                英文原文（{data.meta.enSource.sha.slice(0, 7)}）
              </a>
              <span className="mx-2" aria-hidden="true">·</span>
              {data.meta.run ? (
                <a href={data.meta.run.url} target="_blank" rel="noopener noreferrer" className="rounded-sm underline underline-offset-4 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                  執行資料夾（{data.meta.run.sha.slice(0, 7)}）
                </a>
              ) : (
                <span>執行資料夾尚未抓取</span>
              )}
            </p>
            <ul className="list-disc space-y-1 pl-5 text-sm leading-relaxed">
              <li>每列以英文段落為準對齊；四個模型各自與英文對齊，一個模型的結構差異不會打亂其他欄。</li>
              <li>每列下方選出最好的譯本（或「差不多」）；盲測時模型名稱改為譯本 A–D，每檔以固定種子打亂順序。</li>
              <li>最右的「已發布」欄是報告目前的繁中版，只供參考，不參與評判。</li>
              <li>尚未收到的檔案或模型顯示為「尚未翻譯」。</li>
            </ul>
          </div>
          <div className="mt-6 flex flex-wrap items-center gap-2">
            <ThemeToggle mode={theme.mode} onCycle={theme.cycle} />
            <InfoTip content="顯示或隱藏每列上方的英文原文。快捷鍵：e">
              <Toggle data-testid="toggle-en" pressed={showEn} onClick={() => setShowEn((v) => !v)} className="text-xs">
                顯示英文原文
              </Toggle>
            </InfoTip>
            <InfoTip content={blind ? '揭曉模型名稱（評判會保留）。快捷鍵：b' : '隱藏模型名稱，改以譯本 A–D 呈現，每檔順序固定打亂。快捷鍵：b'}>
              <Button data-testid="toggle-blind-r3" variant={blind ? 'default' : 'outline'} size="sm" onClick={toggleBlind} aria-pressed={blind} className="h-8 text-xs">
                {blind ? <Eye aria-hidden="true" /> : <EyeOff aria-hidden="true" />}
                {blind ? '揭曉模型' : '盲測模式'}
              </Button>
            </InfoTip>
          </div>
        </header>
        <TopBar
          items={tabs}
          activeId={currentId}
          onSelect={go}
          isPhone={isPhone}
          getMarkdown={getMarkdown}
          onClear={() => setClearOpen(true)}
          {...UNUSED_R1}
          tallyNode={tallyNode(true)}
          shortcutsRound={3}
        />
        <main id="content" className="mx-auto w-full max-w-[88rem] scroll-mt-24 px-3 pb-12 pt-6 sm:px-6 sm:pb-16">
          {active ? (
            <SectionViewR3
              section={active}
              models={MODELS}
              publishedLabel={data.meta.publishedLabel}
              showEn={showEn}
              blind={blind}
              cols={blind ? colsBlind : cols}
              onCols={blind ? setColsBlind : setCols}
              isPhone={isPhone}
              rowN={rowN}
              store={store}
              epoch={epoch}
              prev={targetOf(prevId)}
              next={targetOf(nextId)}
              onSelect={go}
              onPick={setPick}
              onNote={setNote}
            />
          ) : (
            <OverviewViewR3 data={data} store={store} blind={blind} onReveal={() => setBlind(false)} />
          )}
        </main>
        <footer className="mx-auto w-full max-w-[88rem] border-t border-border px-4 py-8 text-sm leading-relaxed text-muted-foreground sm:px-6">
          <p>執行日期：{data.meta.runDate} · 資料產生時間：{data.generatedAt}</p>
          <p>
            英文 {data.meta.enSource.repo}@{data.meta.enSource.sha.slice(0, 7)}
            {data.meta.run ? ` · 執行資料夾 ${data.meta.run.repo}@${data.meta.run.sha.slice(0, 7)}（抓取於 ${data.meta.run.fetchedAt}）` : ''}
          </p>
        </footer>
        {isPhone && (
          <BottomBar getMarkdown={getMarkdown} onClear={() => setClearOpen(true)} {...UNUSED_R1} tallyNode={tallyNode(true)} />
        )}
        <ClearDialog
          open={clearOpen}
          onOpenChange={setClearOpen}
          description="第三輪的所有評判與備註都會從這個瀏覽器移除，無法復原。第一、二輪的評語不受影響。若還需要，請先複製評語。"
          onConfirm={() => {
            clearAll();
            toast('已清除第三輪評語');
          }}
        />
        <Toaster position="top-center" theme={theme.dark ? 'dark' : 'light'} closeButton />
      </div>
    </TooltipProvider>
  );
}
