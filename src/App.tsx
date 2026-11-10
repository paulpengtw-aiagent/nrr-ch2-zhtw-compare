import { useEffect, useMemo } from 'react';
import { Toaster } from 'sonner';
import rawData from '@/generated/compare.json';
import type { CompareData, Section } from '@/types';
import { TooltipProvider } from '@/components/ui/tooltip';
import { Footer } from '@/components/Footer';
import { Header } from '@/components/Header';
import { SectionTabs } from '@/components/SectionTabs';
import { SectionView } from '@/components/SectionView';
import { TallyBar } from '@/components/TallyBar';
import { useBlind } from '@/hooks/useBlind';
import { useHashRoute } from '@/hooks/useHashRoute';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { useTheme } from '@/hooks/useTheme';
import { useVerdicts } from '@/hooks/useVerdicts';
import { buildHash } from '@/lib/ui/links';
import { TITLE_BLIND, TITLE_NAMED } from '@/lib/ui/models';

const data = rawData as unknown as CompareData;

export default function App() {
  const sections = data.sections;
  const sectionIds = useMemo(() => sections.map((s) => s.id), [sections]);
  const { route } = useHashRoute();
  const active: Section | undefined = sections.find((s) => s.id === route.sectionId) ?? sections[0];
  const theme = useTheme();
  const { blind, setBlind, reveal, pairFor } = useBlind(sectionIds);
  const [showEn, setShowEn] = useLocalStorage<boolean>('nrr-show-en', false);
  const { store, setWinner, setNote, clearAll, epoch } = useVerdicts();

  useEffect(() => {
    document.title = blind ? TITLE_BLIND : TITLE_NAMED;
  }, [blind]);

  if (!active) {
    return <p className="p-8 text-center text-sm text-muted-foreground">尚無資料</p>;
  }

  const pair = pairFor(active.id);
  const rowN = route.sectionId === active.id ? route.rowN : null;
  const selectSection = (id: string) => {
    window.location.hash = buildHash(id);
  };

  return (
    <TooltipProvider delayDuration={200} skipDelayDuration={300}>
      <div className="min-h-dvh bg-background text-foreground">
        <a
          href="#content"
          className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-[100] focus:rounded-md focus:bg-card focus:px-3 focus:py-2 focus:shadow-lg focus:ring-2 focus:ring-ring"
        >
          跳到正文
        </a>
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
        <SectionTabs sections={sections} activeId={active.id} onSelect={selectSection} />
        <main id="content" className="mx-auto w-full max-w-[88rem] px-3 pb-40 pt-6 sm:px-6 sm:pb-32">
          <SectionView
            section={active}
            meta={data.meta}
            blind={blind}
            showEn={showEn}
            pair={pair}
            rowN={rowN}
            store={store}
            epoch={epoch}
            onWinner={setWinner}
            onNote={setNote}
          />
        </main>
        <Footer meta={data.meta} generatedAt={data.generatedAt} blind={blind} />
        <TallyBar
          data={data}
          section={active}
          store={store}
          pair={pair}
          blind={blind}
          onClear={clearAll}
        />
        <Toaster position="top-center" theme={theme.dark ? 'dark' : 'light'} closeButton />
      </div>
    </TooltipProvider>
  );
}
