import { memo, useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Check, ChevronLeft, ChevronRight, Columns3, Info } from 'lucide-react';
import { toast } from 'sonner';
import type { Block, R3Model, R3Row, R3Section } from '@/types';
import { Button } from '@/components/ui/button';
import { buildRoundHash } from '@/lib/ui/round';
import {
  BLIND_COLOR,
  LETTERS,
  PUBLISHED_COLOR,
  R3_COLORS,
  TIE,
  labelOf,
  orderOf,
  type Verdict3Entry,
  type VerdictStore3,
} from '@/lib/ui/verdicts3';
import { cn } from '@/lib/ui/utils';
import { InfoTip } from './InfoTip';
import { MarkdownBlock } from './MarkdownBlock';
import { ModelChip } from './ModelChip';
import { CopyLinkButton, LengthFlagBadge, NoteField } from './RowView';
import type { NavTarget } from './SectionView';

export const PUBLISHED = 'published';
const MIN_COLS = 2;
const MAX_COLS = 4;
const LENGTH_TIP_R3 = '四個譯本的中文字數相差很大（最長與最短之比超過 1.70），可能有漏譯、重複，或這一列的對齊有偏移。';
const GRID: Record<number, string> = {
  1: '',
  2: 'min-[641px]:grid-cols-2',
  3: 'min-[641px]:grid-cols-2 min-[1100px]:grid-cols-3',
  4: 'min-[641px]:grid-cols-2 min-[1200px]:grid-cols-4',
};
const PUBLISHED_STATE: Record<string, string> = {
  current: '與英文同步',
  stale: '已過期：英文在翻譯後有更新',
  missing: '此檔沒有已發布譯本',
  unknown: '無法判斷是否同步',
};

interface Col {
  key: string; // model id or 'published'
  slot: string; // stored key: model id / letter / 'published'
  label: string;
  color: string;
  present: boolean;
  status: string;
}

/** The visible columns, in display order, from the stored selection (model ids, or letters in blind mode). */
function resolveCols(section: R3Section, models: R3Model[], blind: boolean, publishedLabel: string, stored: string[]) {
  const all: Col[] = [
    ...orderOf(section, models, blind).map((id, i) => ({
      key: id,
      slot: blind ? LETTERS[i]! : id,
      label: labelOf(section, id, models, blind),
      color: blind ? BLIND_COLOR : (R3_COLORS[id] ?? BLIND_COLOR),
      present: section.models[id]?.present ?? false,
      status: section.models[id]?.present ? '' : '尚未翻譯',
    })),
    {
      key: PUBLISHED,
      slot: PUBLISHED,
      label: publishedLabel,
      color: PUBLISHED_COLOR,
      present: section.published.present,
      status: PUBLISHED_STATE[section.published.state] ?? '',
    },
  ];
  let chosen = all.filter((c) => stored.includes(c.slot));
  if (chosen.length < MIN_COLS || chosen.length > MAX_COLS) chosen = all.slice(0, MAX_COLS);
  return { all, chosen };
}

interface SectionViewR3Props {
  section: R3Section;
  models: R3Model[];
  publishedLabel: string;
  showEn: boolean;
  blind: boolean;
  cols: string[];
  onCols: (next: string[]) => void;
  isPhone: boolean;
  rowN: number | null;
  store: VerdictStore3;
  epoch: number;
  prev: NavTarget | null;
  next: NavTarget | null;
  onSelect: (id: string) => void;
  onPick: (rowId: string, pick: string) => void;
  onNote: (rowId: string, note: string) => void;
}

export function SectionViewR3(props: SectionViewR3Props) {
  const { section, models, publishedLabel, showEn, blind, cols, onCols, rowN, store, epoch, prev, next, onSelect, onPick, onNote } = props;
  const topRef = useRef<HTMLDivElement>(null);
  const lastId = useRef<string | null>(null);

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

  const { all, chosen } = resolveCols(section, models, blind, publishedLabel, cols);
  const presentCount = models.filter((m) => section.models[m.id]?.present).length;

  const toggleCol = (slot: string) => {
    const current = chosen.map((c) => c.slot);
    if (current.includes(slot)) {
      if (current.length <= MIN_COLS) return void toast(`至少要顯示 ${MIN_COLS} 欄`);
      onCols(current.filter((s) => s !== slot));
    } else {
      if (current.length >= MAX_COLS) return void toast(`最多並排 ${MAX_COLS} 欄，請先取消一欄`);
      onCols(all.map((c) => c.slot).filter((s) => s === slot || current.includes(s)));
    }
  };

  return (
    <section id="section-panel" role="tabpanel" aria-labelledby={`tab-${section.id}`} tabIndex={-1} className="min-w-0 focus:outline-none">
      <div ref={topRef} className="scroll-mt-24" />
      <header className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3 border-b border-border pb-4">
        <div className="min-w-0">
          <p className="font-mono text-xs text-muted-foreground">第 {section.id} 節</p>
          <h2 className="mt-1 text-balance text-xl font-semibold tracking-tight sm:text-2xl">{section.titleZh}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{section.titleEn}</p>
        </div>
        <span data-testid="r3-present" className="rounded-full border border-border bg-card px-3 py-1 text-xs text-muted-foreground">
          已收到 {presentCount} / {models.length} 個模型的譯文
        </span>
      </header>

      {/* Column picker: two to four columns side by side, remembered per browser. */}
      <div data-testid="col-picker" role="group" aria-label="並排欄位" className="mt-5 flex flex-wrap items-center gap-2 rounded-xl border border-border bg-card px-3 py-2.5">
        <InfoTip content={`選擇要並排的欄（${MIN_COLS}–${MAX_COLS} 欄），這個瀏覽器會記住。手機上各欄會上下堆疊。`}>
          <span tabIndex={0} className="inline-flex cursor-help items-center gap-1.5 rounded-md text-xs font-medium text-muted-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring">
            <Columns3 className="size-4" aria-hidden="true" />
            並排欄位
          </span>
        </InfoTip>
        {all.map((c) => {
          const on = chosen.some((x) => x.slot === c.slot);
          return (
            <InfoTip key={c.slot} content={c.status ? `${c.label}：${c.status}` : c.label}>
              <motion.button
                type="button"
                data-testid={`col-${c.slot}`}
                aria-pressed={on}
                onClick={() => toggleCol(c.slot)}
                whileTap={{ scale: 0.94 }}
                className={cn(
                  'inline-flex h-8 max-w-full cursor-pointer items-center gap-1.5 rounded-full border px-3 text-xs outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring',
                  on ? 'border-foreground/40 bg-muted font-semibold text-foreground' : 'border-border text-muted-foreground hover:text-foreground',
                )}
              >
                <span aria-hidden="true" className="size-2 shrink-0 rounded-full" style={{ backgroundColor: c.color }} />
                <span className="truncate">{c.key === PUBLISHED ? '已發布' : c.label}</span>
                {c.status && c.key !== PUBLISHED && <span className="text-[0.7rem] font-normal text-warn-foreground">· {c.status}</span>}
                {c.key === PUBLISHED && section.published.state !== 'current' && (
                  <span className="text-[0.7rem] font-normal text-warn-foreground">· {c.status}</span>
                )}
              </motion.button>
            </InfoTip>
          );
        })}
      </div>

      <SectionStatsR3 section={section} models={models} blind={blind} />

      <div className="mt-5 flex flex-col gap-2">
        {section.rows.length === 0 && <p className="py-10 text-center text-sm text-muted-foreground">本節尚無英文段落（請先執行 npm run fetch）。</p>}
        {section.rows.map((row) => (
          <RowViewR3
            key={`${row.id}-${epoch}-${blind ? 'b' : 'n'}`}
            section={section}
            row={row}
            models={models}
            blind={blind}
            cols={chosen}
            showEn={showEn}
            publishedDetail={section.published.detail}
            entry={store[row.id]}
            onPick={onPick}
            onNote={onNote}
          />
        ))}
      </div>

      <nav aria-label="上一節與下一節" className="mt-10 flex items-stretch justify-between gap-3 border-t border-border pt-5">
        {prev ? (
          <InfoTip content={prev.tip}>
            <Button data-testid="nav-prev" variant="outline" onClick={() => onSelect(prev.id)} className="h-auto min-h-9 max-w-[48%] whitespace-normal py-2 text-left">
              <ChevronLeft aria-hidden="true" className="shrink-0" />
              <span className="min-w-0 break-words">上一節：{prev.text}</span>
            </Button>
          </InfoTip>
        ) : (
          <span />
        )}
        {next ? (
          <InfoTip content={next.tip}>
            <Button data-testid="nav-next" variant="outline" onClick={() => onSelect(next.id)} className="ml-auto h-auto min-h-9 max-w-[48%] whitespace-normal py-2 text-right">
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

function SectionStatsR3({ section, models, blind }: { section: R3Section; models: R3Model[]; blind: boolean }) {
  return (
    <div data-testid="summary-r3" className="mt-3 grid gap-2 text-xs tabular-nums sm:grid-cols-2 xl:grid-cols-4">
      {orderOf(section, models, blind).map((id) => {
        const s = section.models[id];
        const c = s?.check;
        return (
          <div key={id} className="min-w-0 rounded-lg border border-border bg-card px-3 py-2">
            <p className="truncate font-semibold" style={{ color: blind ? undefined : R3_COLORS[id] }}>
              {labelOf(section, id, models, blind)}
            </p>
            {s?.present ? (
              <p className="mt-0.5 text-muted-foreground">
                {s.seconds != null ? `${s.seconds} 秒` : '耗時待補'} · {s.tokens != null ? `${s.tokens.toLocaleString()} tokens` : 'tokens 待補'}
                {c && ` · 還原 ${c.restoredCount} · 骨架 ${c.skeleton.length} · 連結 ${c.links.length}`}
              </p>
            ) : (
              <p className="mt-0.5 text-warn-foreground">尚未翻譯（not translated yet）</p>
            )}
          </div>
        );
      })}
    </div>
  );
}

interface RowViewR3Props {
  section: R3Section;
  row: R3Row;
  models: R3Model[];
  blind: boolean;
  cols: Col[];
  showEn: boolean;
  publishedDetail: string;
  entry: Verdict3Entry | undefined;
  onPick: (rowId: string, pick: string) => void;
  onNote: (rowId: string, note: string) => void;
}

const RowViewR3 = memo(function RowViewR3({ section, row, models, blind, cols, showEn, publishedDetail, entry, onPick, onNote }: RowViewR3Props) {
  const hash = buildRoundHash(3, section.id, row.n);
  return (
    <article
      id={`r${row.n}`}
      data-testid={`row-${row.id}`}
      data-row=""
      tabIndex={0}
      aria-label={`第 ${row.n} 列`}
      className="group/row scroll-mt-24 rounded-xl border border-transparent px-3 py-4 outline-none transition-colors duration-200 hover:border-border hover:bg-card/70 focus-within:border-border focus-within:bg-card focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50 sm:px-5"
    >
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <span className="inline-flex h-7 min-w-7 items-center justify-center rounded-md bg-muted px-2 font-mono text-xs font-semibold tabular-nums text-muted-foreground">{row.n}</span>
        {row.lengthFlag && <LengthFlagBadge ratio={row.lengthFlag.ratio} tip={LENGTH_TIP_R3} />}
        <div className="ml-auto">
          <CopyLinkButton hash={hash} />
        </div>
      </div>

      {row.notes.map((n) => (
        <div key={`${n.model}-${n.text}`} data-testid="row-note" className="mb-3 flex items-start gap-2 rounded-lg border border-warn bg-warn-soft px-3 py-2 text-sm leading-relaxed text-warn-foreground">
          <Info className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          <span className="min-w-0 break-words">
            <strong className="font-semibold">{labelOf(section, n.model, models, blind)}</strong>：{n.text}
          </span>
        </div>
      ))}

      {showEn && (
        <section data-col="en" aria-label="英文原文" className="mb-4 min-w-0 rounded-lg bg-muted/50 px-3 py-2 text-muted-foreground">
          <div className="mb-1.5">
            <ModelChip label="英文原文" color="var(--neutral-b)" />
          </div>
          {row.en ? (
            <div className="prose-zh text-[0.95rem] opacity-90">
              <MarkdownBlock md={row.en.md} />
            </div>
          ) : null}
        </section>
      )}

      <div data-testid="r3-grid" className={cn('grid gap-x-5 gap-y-4', GRID[cols.length])}>
        {cols.map((c) => (
          <Cell
            key={c.key}
            col={c}
            block={c.key === PUBLISHED ? row.published : (row.models[c.key] ?? null)}
            cjk={c.key === PUBLISHED ? null : (row.cjk[c.key] ?? null)}
            drift={row.drift.includes(c.key)}
            detail={c.key === PUBLISHED ? publishedDetail : ''}
          />
        ))}
      </div>

      <div role="group" aria-label="評判：哪個譯本較好" className="mt-4 flex flex-wrap items-center gap-2 border-t border-border/70 pt-3">
        {orderOf(section, models, blind).map((id, i) => {
          const present = section.models[id]?.present ?? false;
          const label = labelOf(section, id, models, blind);
          return (
            <PickButton
              key={id}
              testId={`pick-${i + 1}`}
              pick={id}
              keyHint={String(i + 1)}
              pressed={entry?.pick === id}
              disabled={!present}
              color={blind ? undefined : R3_COLORS[id]}
              tip={present ? `${label} 這一列最好。再按一次可取消，備註會保留。快捷鍵：${i + 1}` : `${label} 尚未翻譯此檔，無法選擇`}
              onClick={() => onPick(row.id, id)}
            >
              {label}
            </PickButton>
          );
        })}
        <PickButton testId="pick-tie" pick={TIE} keyHint="5" pressed={entry?.pick === TIE} tip="幾個譯本品質相近。再按一次可取消。快捷鍵：5" onClick={() => onPick(row.id, TIE)}>
          差不多
        </PickButton>
        <NoteField rowId={row.id} note={entry?.note ?? ''} onNote={onNote} />
      </div>
    </article>
  );
});

function Cell({ col, block, cjk, drift, detail }: { col: Col; block: Block | null; cjk: number | null; drift: boolean; detail: string }) {
  const isPub = col.key === PUBLISHED;
  return (
    <section data-col={col.key} aria-label={col.label} className={cn('min-w-0', isPub && 'rounded-lg border border-dashed border-border px-3 py-2')}>
      <div className="mb-2 flex flex-wrap items-center gap-1.5">
        <ModelChip label={col.label} color={col.color} />
        {isPub && (
          <InfoTip content={detail || col.status}>
            <span
              tabIndex={0}
              data-testid="published-state"
              className={cn(
                'cursor-help rounded-full px-2 py-0.5 text-[0.7rem] outline-none focus-visible:ring-2 focus-visible:ring-ring',
                col.status === PUBLISHED_STATE.current ? 'bg-muted text-muted-foreground' : 'bg-warn-soft text-warn-foreground',
              )}
            >
              參考 · {col.status}
            </span>
          </InfoTip>
        )}
        {drift && (
          <InfoTip content="這一欄在此處與英文段落沒有一對一對上（多出或缺少段落），多出的段落併在這一格。">
            <span tabIndex={0} data-testid="drift-badge" className="cursor-help rounded-full bg-warn-soft px-2 py-0.5 text-[0.7rem] text-warn-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring">
              結構不一致
            </span>
          </InfoTip>
        )}
      </div>
      {!col.present ? (
        <div data-testid="r3-placeholder" className="flex min-h-16 items-center justify-center rounded-lg border border-dashed border-border/80 px-3 py-4 text-center text-sm text-muted-foreground">
          {isPub ? '此檔沒有已發布譯本' : '尚未翻譯（not translated yet）'}
        </div>
      ) : block ? (
        <>
          <div className="prose-zh">
            <MarkdownBlock md={block.md} />
          </div>
          {cjk != null && <p className="mt-2 text-xs tabular-nums text-muted-foreground">{cjk} 字</p>}
        </>
      ) : (
        <div className="min-h-16 rounded-lg border border-dashed border-border/60 px-3 py-4 text-center text-xs text-muted-foreground opacity-80">此段無對應譯文</div>
      )}
    </section>
  );
}

/** Verdict toggle with a spring check and a ring pulse on each click. */
function PickButton({
  testId,
  pick,
  keyHint,
  pressed,
  disabled = false,
  color,
  tip,
  onClick,
  children,
}: {
  testId: string;
  pick: string;
  keyHint: string;
  pressed: boolean;
  disabled?: boolean;
  color?: string | undefined;
  tip: string;
  onClick: () => void;
  children: string;
}) {
  const [pulse, setPulse] = useState(0);
  const style = pressed && color ? { backgroundColor: color, borderColor: color } : undefined;
  return (
    <InfoTip content={tip}>
      <motion.button
        type="button"
        data-testid={testId}
        data-pick={pick}
        aria-pressed={pressed}
        aria-keyshortcuts={keyHint}
        aria-disabled={disabled}
        disabled={disabled}
        onClick={() => {
          setPulse((p) => p + 1);
          onClick();
        }}
        whileTap={disabled ? undefined : { scale: 0.93 }}
        style={style}
        className={cn(
          'relative inline-flex h-9 cursor-pointer select-none items-center gap-1.5 whitespace-nowrap rounded-lg border px-3 text-sm font-medium outline-none transition-[background-color,border-color,color] duration-200 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-45 [&_svg]:size-4 [&_svg]:shrink-0',
          pressed
            ? color
              ? 'font-semibold text-white shadow-sm'
              : 'border-foreground bg-foreground font-semibold text-background'
            : 'border-border bg-card text-foreground hover:bg-muted',
        )}
      >
        <AnimatePresence initial={false}>
          {pressed && (
            <motion.span key="on" className="inline-flex" initial={{ scale: 0.3, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.3, opacity: 0 }} transition={{ type: 'spring', stiffness: 520, damping: 22 }}>
              <Check aria-hidden="true" />
            </motion.span>
          )}
        </AnimatePresence>
        {children}
        <AnimatePresence>
          {pulse > 0 && (
            <motion.span
              key={pulse}
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 rounded-lg ring-2"
              style={{ ['--tw-ring-color' as string]: color ?? 'var(--foreground)' }}
              initial={{ opacity: 0.7, scale: 1 }}
              animate={{ opacity: 0, scale: 1.18 }}
              transition={{ duration: 0.45, ease: 'easeOut' }}
            />
          )}
        </AnimatePresence>
      </motion.button>
    </InfoTip>
  );
}
