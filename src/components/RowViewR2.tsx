import { memo } from 'react';
import { Info } from 'lucide-react';
import type { Block, R2Row, Verdict2 } from '@/types';
import { InfoTip } from './InfoTip';
import { MarkdownBlock } from './MarkdownBlock';
import { ModelChip } from './ModelChip';
import { CopyLinkButton, EmptyCell, LengthFlagBadge, NoteField, VerdictButton } from './RowView';
import { buildRoundHash } from '@/lib/ui/round';
import type { Verdict2Entry } from '@/lib/ui/verdicts2';
import { cn } from '@/lib/ui/utils';

const LENGTH_TIP_R2 =
  '中文字數與英文字數的比例偏離本輪中位數（不到 60% 或超過 170%），可能有漏譯句子，或逐段對齊配錯了列。';
const EN_COLOR = 'var(--neutral-a)';
const GEMINI_COLOR = 'var(--gemini)';

interface RowViewR2Props {
  sectionId: string;
  row: R2Row;
  isFirst: boolean;
  showEn: boolean;
  entry: Verdict2Entry | undefined;
  onVerdict: (rowId: string, verdict: Verdict2) => void;
  onNote: (rowId: string, note: string) => void;
}

/** One aligned row of round 2: new English (left) and Gemini zh-TW (right), verdict bar underneath. */
export const RowViewR2 = memo(function RowViewR2({
  sectionId,
  row,
  isFirst,
  showEn,
  entry,
  onVerdict,
  onNote,
}: RowViewR2Props) {
  const hash = buildRoundHash(2, sectionId, row.n);
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
        {flag && <LengthFlagBadge ratio={flag.ratio} tip={LENGTH_TIP_R2} />}
        <div className="ml-auto">
          <CopyLinkButton hash={hash} />
        </div>
      </div>

      {row.notes.map((text) => (
        <div
          key={text}
          data-testid="row-note"
          className="mb-3 flex items-start gap-2 rounded-lg border border-warn bg-warn-soft px-3 py-2 text-sm leading-relaxed text-warn-foreground"
        >
          <Info className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          <span className="min-w-0 break-words">{text}</span>
        </div>
      ))}

      <div className={cn('grid gap-x-6 gap-y-4', showEn && 'min-[641px]:grid-cols-2')}>
        {showEn && (
          <Column side="en" label="英文原文（Fable 改寫）" color={EN_COLOR} block={row.en} chars={row.chars.en} isFirst={isFirst} />
        )}
        <Column side="gemini" label="Gemini 3.6 Flash" color={GEMINI_COLOR} block={row.gemini} chars={row.chars.gemini} isFirst={isFirst} />
      </div>

      <VerdictBar2 rowId={row.id} entry={entry} onVerdict={onVerdict} onNote={onNote} />
    </article>
  );
});

function Column({
  side,
  label,
  color,
  block,
  chars,
}: {
  side: 'en' | 'gemini';
  label: string;
  color: string;
  block: Block | null;
  chars: number | null;
  isFirst: boolean;
}) {
  const isEn = side === 'en';
  return (
    <section
      data-col={side}
      aria-label={isEn ? '英文原文' : '譯文（Gemini 3.6 Flash）'}
      className={cn('min-w-0', isEn && 'text-muted-foreground')}
    >
      <div className="mb-2">
        <ModelChip label={label} color={color} />
      </div>
      {block ? (
        <div className={cn('prose-zh', isEn && 'text-[0.95rem] opacity-90')}>
          <MarkdownBlock md={block.md} />
        </div>
      ) : (
        <EmptyCell />
      )}
      {block && chars != null && <p className="mt-2 text-xs tabular-nums text-muted-foreground">{chars} 字</p>}
    </section>
  );
}

function VerdictBar2({
  rowId,
  entry,
  onVerdict,
  onNote,
}: {
  rowId: string;
  entry: Verdict2Entry | undefined;
  onVerdict: (rowId: string, verdict: Verdict2) => void;
  onNote: (rowId: string, note: string) => void;
}) {
  const v = entry?.verdict;
  return (
    <div role="group" aria-label="評判" className="mt-4 flex flex-wrap items-center gap-2 border-t border-border/70 pt-3">
      <VerdictButton
        testId="verdict2-good"
        keyHint="1"
        pressed={v === 'good'}
        tip="譯文通順，可直接採用。再按一次可取消，備註會保留。"
        onClick={() => onVerdict(rowId, 'good')}
      >
        通順
      </VerdictButton>
      <VerdictButton
        testId="verdict2-ok"
        keyHint="2"
        pressed={v === 'ok'}
        tie
        tip="可以讀，但有小瑕疵或用語生硬。再按一次可取消，備註會保留。"
        onClick={() => onVerdict(rowId, 'ok')}
      >
        尚可
      </VerdictButton>
      <VerdictButton
        testId="verdict2-fix"
        keyHint="3"
        pressed={v === 'fix'}
        fill="var(--warn-foreground)"
        tip="有錯譯、漏譯或讀不懂，需要修改。再按一次可取消，備註會保留。"
        onClick={() => onVerdict(rowId, 'fix')}
      >
        需修
      </VerdictButton>
      <NoteField rowId={rowId} note={entry?.note ?? ''} onNote={onNote} />
    </div>
  );
}

