import { useEffect, useRef } from 'react';
import { ChevronLeft, ChevronRight, Info } from 'lucide-react';
import type { R2Section, Verdict2 } from '@/types';
import { Button } from '@/components/ui/button';
import type { Verdict2Entry, VerdictStore2 } from '@/lib/ui/verdicts2';
import { MODEL_COLOR } from '@/lib/ui/models';
import { InfoTip } from './InfoTip';
import type { NavTarget } from './SectionView';
import { RowViewR2 } from './RowViewR2';

const ALIGN_LABEL: Record<R2Section['alignMode'], string> = {
  index: '段落順序',
  section: '標題分節',
  single: '整節單段',
};

const ALIGN_TIP: Record<R2Section['alignMode'], string> = {
  index: '英文原文與譯文依段落順序逐段對齊。結構不一致的列會標示出來。',
  section: '英文原文與譯文依章節標題切分後，逐節對齊。結構不一致的列會標示出來。',
  single: '整節視為單一段落，不做逐段對齊。',
};

interface SectionViewR2Props {
  section: R2Section;
  showEn: boolean;
  rowN: number | null;
  store: VerdictStore2;
  epoch: number;
  prev: NavTarget | null;
  next: NavTarget | null;
  onSelect: (id: string) => void;
  onVerdict: (rowId: string, verdict: Verdict2) => void;
  onNote: (rowId: string, note: string) => void;
}

export function SectionViewR2({
  section,
  showEn,
  rowN,
  store,
  epoch,
  prev,
  next,
  onSelect,
  onVerdict,
  onNote,
}: SectionViewR2Props) {
  const topRef = useRef<HTMLDivElement>(null);
  const lastId = useRef<string | null>(null);

  // Same deep-link behaviour as round 1: scroll to and flash #r<n>; a section change returns to the top.
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

  const perK = section.han > 0 ? ((section.lint.total / section.han) * 1000).toFixed(2) : '—';

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

      <div
        data-testid="summary-r2"
        className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-1.5 rounded-xl border border-border bg-card px-4 py-2.5 text-xs tabular-nums sm:text-sm"
      >
        <span className="font-semibold" style={{ color: MODEL_COLOR.gemini }}>
          Gemini 3.6 Flash
        </span>
        <span>耗時 {section.seconds == null ? '待補' : `${section.seconds} 秒`}</span>
        <span aria-hidden="true" className="text-muted-foreground">
          ·
        </span>
        <span>
          Lint {section.lint.total} 項（翻譯腔 {section.lint.translationese} ／ 大陸用語 {section.lint.mainland} ／ 其他{' '}
          {section.lint.other}）
        </span>
        <span aria-hidden="true" className="text-muted-foreground">
          ·
        </span>
        <span>每千漢字 {perK}</span>
        {section.attemptNote && <span className="w-full text-muted-foreground">{section.attemptNote}</span>}
      </div>

      <div className="mt-5 flex flex-col gap-2">
        {section.rows.length === 0 && (
          <p className="py-10 text-center text-sm text-muted-foreground">本節尚無對齊的段落。</p>
        )}
        {section.rows.map((row, i) => (
          <RowViewR2
            key={`${row.id}-${epoch}`}
            sectionId={section.id}
            row={row}
            isFirst={i === 0}
            showEn={showEn}
            entry={store[row.id] as Verdict2Entry | undefined}
            onVerdict={onVerdict}
            onNote={onNote}
          />
        ))}
      </div>

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
