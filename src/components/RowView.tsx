import { memo, useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Check, ChevronDown, Info, Link2 } from 'lucide-react';
import { toast } from 'sonner';
import type { Block, ModelId, Row } from '@/types';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Input } from '@/components/ui/input';
import { copyText } from '@/lib/ui/clipboard';
import { buildHash, shareUrl } from '@/lib/ui/links';
import { sideColor, sideLabel, type Pair, type Side } from '@/lib/ui/models';
import { PENDING } from '@/lib/ui/stats';
import type { Verdict, Winner } from '@/lib/ui/verdicts';
import { cn } from '@/lib/ui/utils';
import { InfoTip } from './InfoTip';
import { MarkdownBlock } from './MarkdownBlock';
import { ModelChip } from './ModelChip';

const LENGTH_TIP =
  '兩譯本的中文字數相差懸殊（一方不到另一方的 60% 或超過 170%），可能有漏譯句子，或逐段對齊配錯了列。';

interface RowViewProps {
  sectionId: string;
  row: Row;
  isFirst: boolean;
  pair: Pair;
  blind: boolean;
  showEn: boolean;
  leftAvailable: boolean;
  rightAvailable: boolean;
  names: Record<ModelId, string>;
  verdict: Verdict | undefined;
  onWinner: (rowId: string, winner: Winner) => void;
  onNote: (rowId: string, note: string) => void;
}

export const RowView = memo(function RowView({
  sectionId,
  row,
  isFirst,
  pair,
  blind,
  showEn,
  leftAvailable,
  rightAvailable,
  names,
  verdict,
  onWinner,
  onNote,
}: RowViewProps) {
  const [enOpen, setEnOpen] = useState(true);
  const hash = buildHash(sectionId, row.n);
  const leftBlock = row[pair.left];
  const rightBlock = row[pair.right];
  const flag = row.lengthFlag;

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
        <span className="inline-flex h-7 min-w-7 items-center justify-center rounded-md bg-muted px-2 font-mono text-xs font-semibold tabular-nums text-muted-foreground">
          {row.n}
        </span>
        {row.kind === 'mismatch' && (
          <InfoTip content="這一段在譯文與英文原文之間的結構（標題、表格、連結或清單數量）不一致，對照時請留意。">
            <span
              tabIndex={0}
              data-testid="mismatch-badge"
              className="inline-flex cursor-help items-center gap-1 rounded-full border border-warn bg-warn-soft px-2.5 py-0.5 text-xs font-medium text-warn-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <Info className="size-3.5" aria-hidden="true" />
              結構不一致
            </span>
          </InfoTip>
        )}
        {flag && <LengthFlagBadge ratio={flag.ratio} />}
        <div className="ml-auto">
          <CopyLinkButton hash={hash} />
        </div>
      </div>

      {showEn && row.en && (
        <Collapsible open={enOpen} onOpenChange={setEnOpen} className="mb-3 min-[1200px]:hidden">
          <CollapsibleTrigger className="group flex w-full cursor-pointer items-center gap-2 rounded-md px-1 py-1 text-left text-xs font-medium text-muted-foreground outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring">
            <ChevronDown aria-hidden="true" className="size-4 transition-transform duration-200 group-data-[state=open]:rotate-180" />
            英文原文
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="mt-2 border-l-2 border-border pl-3 text-muted-foreground">
              <div className="prose-zh text-[0.95rem]">
                <MarkdownBlock md={row.en.md} />
              </div>
            </div>
          </CollapsibleContent>
        </Collapsible>
      )}

      <div
        className={cn(
          'grid gap-x-6 gap-y-4 min-[641px]:grid-cols-2',
          showEn && 'min-[1200px]:grid-cols-[minmax(0,0.8fr)_minmax(0,1fr)_minmax(0,1fr)]',
        )}
      >
        {showEn && (
          <section aria-label="英文原文" className="hidden min-w-0 text-muted-foreground min-[1200px]:block">
            <p className="mb-2 text-xs font-medium">英文原文</p>
            {row.en ? (
              <div className="prose-zh text-[0.95rem] opacity-90">
                <MarkdownBlock md={row.en.md} />
              </div>
            ) : (
              <EmptyCell />
            )}
          </section>
        )}
        <TranslationColumn
          side="left"
          model={pair.left}
          block={leftBlock}
          unavailable={!leftAvailable}
          isFirst={isFirst}
          blind={blind}
          chars={row.chars?.[pair.left] ?? null}
        />
        <TranslationColumn
          side="right"
          model={pair.right}
          block={rightBlock}
          unavailable={!rightAvailable}
          isFirst={isFirst}
          blind={blind}
          chars={row.chars?.[pair.right] ?? null}
        />
      </div>

      <VerdictBar
        rowId={row.id}
        pair={pair}
        blind={blind}
        names={names}
        verdict={verdict}
        onWinner={onWinner}
        onNote={onNote}
      />
    </article>
  );
});

function LengthFlagBadge({ ratio }: { ratio: number }) {
  return (
    <InfoTip content={LENGTH_TIP}>
      <span
        tabIndex={0}
        data-testid="length-flag"
        className="inline-flex cursor-help items-center gap-1 rounded-full border border-warn bg-warn-soft px-2.5 py-0.5 text-xs font-medium text-warn-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <Info className="size-3.5" aria-hidden="true" />
        長度差異大
        <span className="font-mono tabular-nums opacity-80">比值 {ratio.toFixed(2)}</span>
      </span>
    </InfoTip>
  );
}

const TranslationColumn = memo(function TranslationColumn({
  side,
  model,
  block,
  unavailable,
  isFirst,
  blind,
  chars,
}: {
  side: Side;
  model: ModelId;
  block: Block | null;
  unavailable: boolean;
  isFirst: boolean;
  blind: boolean;
  chars: number | null;
}) {
  const color = sideColor(side, model, blind);
  const label = sideLabel(side, model, blind);
  return (
    <section aria-label={label} className="min-w-0">
      <div className="mb-2">
        <ModelChip label={label} color={color} />
      </div>
      {unavailable && isFirst && <PendingCard />}
      {unavailable && !isFirst && <EmptyCell />}
      {!unavailable && block && (
        <div className="prose-zh">
          <MarkdownBlock md={block.md} />
        </div>
      )}
      {!unavailable && !block && <EmptyCell />}
      {!unavailable && block && (
        <p className="mt-2 text-xs tabular-nums text-muted-foreground">{chars == null ? PENDING : `${chars} 字`}</p>
      )}
    </section>
  );
});

function PendingCard() {
  return (
    <div
      data-testid="placeholder-missing"
      className="flex min-h-24 flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-border bg-muted/50 px-4 py-5 text-center"
    >
      <p className="text-sm font-medium text-foreground">尚未完成</p>
      <p className="text-xs leading-relaxed text-muted-foreground">
        此模型的譯文尚未產生，完成後重新抓取即會顯示。
      </p>
    </div>
  );
}

function EmptyCell() {
  return <div aria-hidden="true" className="min-h-16 rounded-lg border border-dashed border-border/60 opacity-50" />;
}

function VerdictBar({
  rowId,
  pair,
  blind,
  names,
  verdict,
  onWinner,
  onNote,
}: {
  rowId: string;
  pair: Pair;
  blind: boolean;
  names: Record<ModelId, string>;
  verdict: Verdict | undefined;
  onWinner: (rowId: string, winner: Winner) => void;
  onNote: (rowId: string, note: string) => void;
}) {
  const winner = verdict?.winner;
  const leftText = blind ? '譯本 A 較好' : `${names[pair.left]} 較好`;
  const rightText = blind ? '譯本 B 較好' : `${names[pair.right]} 較好`;
  return (
    <div role="group" aria-label="評判" className="mt-4 flex flex-wrap items-center gap-2 border-t border-border/70 pt-3">
      <VerdictButton
        testId="verdict-left"
        keyHint="1"
        pressed={winner === pair.left}
        fill={blind ? undefined : sideColor('left', pair.left, false)}
        tip="以左側譯本為準。再按一次可取消，備註會保留。"
        onClick={() => onWinner(rowId, pair.left)}
      >
        {leftText}
      </VerdictButton>
      <VerdictButton
        testId="verdict-tie"
        keyHint="2"
        pressed={winner === 'tie'}
        tie
        tip="兩份譯文品質相近。再按一次可取消，備註會保留。"
        onClick={() => onWinner(rowId, 'tie')}
      >
        差不多
      </VerdictButton>
      <VerdictButton
        testId="verdict-right"
        keyHint="3"
        pressed={winner === pair.right}
        fill={blind ? undefined : sideColor('right', pair.right, false)}
        tip="以右側譯本為準。再按一次可取消，備註會保留。"
        onClick={() => onWinner(rowId, pair.right)}
      >
        {rightText}
      </VerdictButton>
      <NoteField rowId={rowId} note={verdict?.note ?? ''} onNote={onNote} />
    </div>
  );
}

/**
 * Verdict toggle. Pressed state is a filled accent (model colour; neutral solid in blind mode;
 * outlined for 差不多) with a spring-in check. Pressing the pressed button again clears it.
 */
function VerdictButton({
  testId,
  keyHint,
  pressed,
  fill,
  tie = false,
  tip,
  onClick,
  children,
}: {
  testId: string;
  keyHint: string;
  pressed: boolean;
  fill?: string;
  tie?: boolean;
  tip: string;
  onClick: () => void;
  children: string;
}) {
  const pressedStyle = pressed && fill ? { backgroundColor: fill, borderColor: fill } : undefined;
  const pressedClass = fill
    ? 'font-semibold text-background shadow-sm'
    : tie
      ? 'border-foreground bg-foreground/10 font-semibold text-foreground'
      : 'border-foreground bg-foreground font-semibold text-background';
  return (
    <InfoTip content={tip}>
      <button
        type="button"
        data-testid={testId}
        aria-pressed={pressed}
        aria-keyshortcuts={keyHint}
        onClick={onClick}
        style={pressedStyle}
        className={cn(
          'inline-flex h-9 cursor-pointer select-none items-center gap-1.5 whitespace-nowrap rounded-lg border px-3 text-sm font-medium outline-none transition-[background-color,border-color,color,box-shadow,transform] duration-200 ease-out hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background active:scale-[0.97] [&_svg]:size-4 [&_svg]:shrink-0',
          pressed ? pressedClass : 'border-border bg-card text-foreground',
        )}
      >
        <AnimatePresence initial={false}>
          {pressed && (
            <motion.span
              key="on"
              className="inline-flex"
              initial={{ scale: 0.3, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.3, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 520, damping: 22 }}
            >
              <Check aria-hidden="true" />
            </motion.span>
          )}
        </AnimatePresence>
        {children}
      </button>
    </InfoTip>
  );
}

/** Saves 600 ms after typing stops, and on blur. Shows a 已儲存 tick after each save. */
function NoteField({
  rowId,
  note,
  onNote,
}: {
  rowId: string;
  note: string;
  onNote: (rowId: string, note: string) => void;
}) {
  const [draft, setDraft] = useState(note);
  const [saved, setSaved] = useState(false);
  const latest = useRef(note);
  const debounce = useRef<number | undefined>(undefined);
  const hide = useRef<number | undefined>(undefined);

  useEffect(
    () => () => {
      window.clearTimeout(debounce.current);
      window.clearTimeout(hide.current);
    },
    [],
  );

  const commit = (value: string) => {
    if (value === latest.current) return;
    latest.current = value;
    onNote(rowId, value);
    setSaved(true);
    window.clearTimeout(hide.current);
    hide.current = window.setTimeout(() => setSaved(false), 1500);
  };

  return (
    <div className="relative min-w-[12rem] flex-1">
      <InfoTip content="備註會在停止輸入約 0.6 秒後自動儲存，離開欄位時也會儲存。">
        <Input
          data-testid="verdict-note"
          aria-label="評語備註"
          placeholder="備註（選填）"
          value={draft}
          className="pr-20"
          onChange={(e) => {
            const value = e.target.value;
            setDraft(value);
            window.clearTimeout(debounce.current);
            debounce.current = window.setTimeout(() => commit(value), 600);
          }}
          onBlur={() => {
            window.clearTimeout(debounce.current);
            commit(draft);
          }}
        />
      </InfoTip>
      <AnimatePresence>
        {saved && (
          <motion.span
            key="saved"
            initial={{ opacity: 0, y: 3 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="pointer-events-none absolute right-2.5 top-1/2 inline-flex -translate-y-1/2 items-center gap-1 text-xs text-muted-foreground"
          >
            <Check className="size-3.5" aria-hidden="true" />
            已儲存
          </motion.span>
        )}
      </AnimatePresence>
    </div>
  );
}

function CopyLinkButton({ hash }: { hash: string }) {
  const [copied, setCopied] = useState(false);
  const timer = useRef<number | undefined>(undefined);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  const onCopy = async () => {
    const ok = await copyText(shareUrl(hash));
    if (!ok) {
      toast.error('無法寫入剪貼簿，請手動複製網址列');
      return;
    }
    setCopied(true);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setCopied(false), 1800);
  };

  return (
    <InfoTip content="複製此列的完整網址（含章節與列號）。貼給別人，對方開啟後會直接跳到這一列。">
      <Button variant="ghost" size="sm" onClick={onCopy} data-testid="copy-link" className="h-8 min-w-[7.5rem]">
        <AnimatePresence mode="wait" initial={false}>
          {copied ? (
            <motion.span
              key="done"
              className="inline-flex items-center gap-1.5 text-foreground"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{ duration: 0.18 }}
            >
              <Check aria-hidden="true" />
              已複製
            </motion.span>
          ) : (
            <motion.span
              key="idle"
              className="inline-flex items-center gap-1.5"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
            >
              <Link2 aria-hidden="true" />
              複製連結
            </motion.span>
          )}
        </AnimatePresence>
      </Button>
    </InfoTip>
  );
}
