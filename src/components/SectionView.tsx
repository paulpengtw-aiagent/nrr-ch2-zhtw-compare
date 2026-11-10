import { useEffect, useRef } from 'react';
import { ChevronLeft, ChevronRight, Info } from 'lucide-react';
import type { Meta, ModelId, Section } from '@/types';
import { Button } from '@/components/ui/button';
import type { Pair } from '@/lib/ui/models';
import type { VerdictStore, Winner } from '@/lib/ui/verdicts';
import { InfoTip } from './InfoTip';
import { RowView } from './RowView';
import { SectionStats, SummaryStrip } from './StatsPanel';

const ALIGN_LABEL: Record<Section['alignMode'], string> = {
  index: '段落順序',
  section: '標題分節',
  single: '整節單段',
};

const ALIGN_TIP: Record<Section['alignMode'], string> = {
  index: '英文原文與譯文依段落順序逐段對齊。結構不一致的列會標示出來。',
  section: '英文原文與譯文依章節標題切分後，逐節對齊。結構不一致的列會標示出來。',
  single: '整節視為單一段落，不做逐段對齊。',
};

export interface NavTarget {
  id: string;
  text: string;
  tip: string;
}

interface SectionViewProps {
  section: Section;
  meta: Meta;
  names: Record<ModelId, string>;
  blind: boolean;
  showEn: boolean;
  pair: Pair;
  rowN: number | null;
  store: VerdictStore;
  epoch: number;
  prev: NavTarget | null;
  next: NavTarget | null;
  onSelect: (id: string) => void;
  onWinner: (rowId: string, winner: Winner) => void;
  onNote: (rowId: string, note: string) => void;
}

export function SectionView({
  section,
  meta,
  names,
  blind,
  showEn,
  pair,
  rowN,
  store,
  epoch,
  prev,
  next,
  onSelect,
  onWinner,
  onNote,
}: SectionViewProps) {
  const topRef = useRef<HTMLDivElement>(null);
  const lastId = useRef<string | null>(null);
  const leftAvailable = section.models[pair.left].available;
  const rightAvailable = section.models[pair.right].available;

  // Deep links scroll to and flash a row; section changes scroll back to the top of the panel.
  useEffect(() => {
    const isFirst = lastId.current === null;
    const changed = lastId.current !== section.id;
    lastId.current = section.id;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const behavior: ScrollBehavior = reduce ? 'auto' : 'smooth';
    let timer: number | undefined;

    if (rowN !== null) {
      const el = document.getElementById(`r${rowN}`);
      if (el) {
        el.scrollIntoView({ block: 'start', behavior });
        el.focus({ preventScroll: true });
        el.classList.remove('row-flash');
        void el.offsetWidth;
        el.classList.add('row-flash');
        timer = window.setTimeout(() => el.classList.remove('row-flash'), 1700);
      }
    } else if (changed && !isFirst) {
      topRef.current?.scrollIntoView({ block: 'start', behavior });
    }
    return () => window.clearTimeout(timer);
  }, [section.id, rowN]);

  return (
    <section
      id="section-panel"
      role="tabpanel"
      aria-labelledby={`tab-${section.id}`}
      tabIndex={-1}
      className="min-w-0 focus:outline-none"
    >
      <div ref={topRef} className="scroll-mt-24" />
      <header className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3 border-b border-border pb-4">
        <div className="min-w-0">
          <p className="font-mono text-xs text-muted-foreground">第 {section.id} 節</p>
          <h2 className="mt-1 text-balance text-xl font-semibold tracking-tight sm:text-2xl">{section.titleZh}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{section.titleEn}</p>
        </div>
        <InfoTip content={ALIGN_TIP[section.alignMode]}>
          <span
            tabIndex={0}
            className="inline-flex cursor-help items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1 text-xs text-muted-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <Info className="size-3.5" aria-hidden="true" />
            對齊方式：{ALIGN_LABEL[section.alignMode]}
          </span>
        </InfoTip>
      </header>

      {blind ? (
        <p
          data-testid="blind-note"
          className="mt-5 rounded-lg border border-dashed border-border bg-muted/40 px-4 py-3 text-sm text-muted-foreground"
        >
          盲測中：統計、結構對照與詞彙備註已暫時隱藏，按「揭曉」後即可查看。
        </p>
      ) : (
        <SummaryStrip section={section} meta={meta} names={names} />
      )}

      <div className="mt-5 flex flex-col gap-2">
        {section.rows.length === 0 && (
          <p className="py-10 text-center text-sm text-muted-foreground">本節尚無對齊的段落。</p>
        )}
        {section.rows.map((row, i) => (
          <RowView
            key={`${row.id}-${epoch}`}
            sectionId={section.id}
            row={row}
            isFirst={i === 0}
            pair={pair}
            blind={blind}
            showEn={showEn}
            leftAvailable={leftAvailable}
            rightAvailable={rightAvailable}
            names={names}
            verdict={store[row.id]}
            onWinner={onWinner}
            onNote={onNote}
          />
        ))}
      </div>

      {!blind && <SectionStats section={section} meta={meta} names={names} />}

      <nav aria-label="上一節與下一節" className="mt-10 flex items-stretch justify-between gap-3 border-t border-border pt-5">
        {prev ? (
          <InfoTip content={prev.tip}>
            <Button
              data-testid="nav-prev"
              variant="outline"
              onClick={() => onSelect(prev.id)}
              className="h-auto min-h-9 max-w-[48%] whitespace-normal py-2 text-left"
            >
              <ChevronLeft aria-hidden="true" className="shrink-0" />
              <span className="min-w-0 break-words">上一節：{prev.text}</span>
            </Button>
          </InfoTip>
        ) : (
          <span />
        )}
        {next ? (
          <InfoTip content={next.tip}>
            <Button
              data-testid="nav-next"
              variant="outline"
              onClick={() => onSelect(next.id)}
              className="ml-auto h-auto min-h-9 max-w-[48%] whitespace-normal py-2 text-right"
            >
              <span className="min-w-0 break-words">下一節：{next.text}</span>
              <ChevronRight aria-hidden="true" className="shrink-0" />
            </Button>
          </InfoTip>
        ) : (
          <span />
        )}
      </nav>
    </section>
  );
}
