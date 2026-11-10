import { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Check, ClipboardCopy, Eraser } from 'lucide-react';
import { toast } from 'sonner';
import type { CompareData, Section } from '@/types';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { copyText } from '@/lib/ui/clipboard';
import { sideColor, sideLabel, type Pair } from '@/lib/ui/models';
import { buildVerdictMarkdown, type VerdictStore } from '@/lib/ui/verdicts';
import { InfoTip } from './InfoTip';

interface TallyBarProps {
  data: CompareData;
  section: Section;
  store: VerdictStore;
  pair: Pair;
  blind: boolean;
  onClear: () => void;
}

/** Per-section tally of verdicts, a proportional bar, copy-as-Markdown and clear. */
export function TallyBar({ data, section, store, pair, blind, onClear }: TallyBarProps) {
  const counts = useMemo(() => {
    let left = 0;
    let tie = 0;
    let right = 0;
    for (const row of section.rows) {
      const winner = store[row.id]?.winner;
      if (winner === undefined) continue;
      if (winner === 'tie') tie += 1;
      else if (winner === pair.left) left += 1;
      else if (winner === pair.right) right += 1;
    }
    return { left, tie, right, total: left + tie + right };
  }, [section, store, pair]);

  const [copied, setCopied] = useState(false);
  const timer = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearTimeout(timer.current), []);

  const leftLabel = sideLabel('left', pair.left, blind);
  const rightLabel = sideLabel('right', pair.right, blind);
  const leftColor = sideColor('left', pair.left, blind);
  const rightColor = sideColor('right', pair.right, blind);
  const pct = (n: number) => (counts.total ? (n / counts.total) * 100 : 0);

  const onCopy = async () => {
    const ok = await copyText(buildVerdictMarkdown(data, store));
    if (!ok) {
      toast.error('無法寫入剪貼簿，請稍後再試');
      return;
    }
    setCopied(true);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setCopied(false), 1800);
  };

  return (
    <motion.section
      aria-label="本節評判統計"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-card/95 px-3 pt-3 pb-4 shadow-[0_-8px_24px_-12px_rgba(0,0,0,0.25)] backdrop-blur-md sm:inset-x-auto sm:bottom-4 sm:right-4 sm:w-[30rem] sm:max-w-[calc(100vw_-_2rem)] sm:rounded-xl sm:border sm:px-4 sm:pt-4"
    >
      <div className="mx-auto flex flex-col gap-2.5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex min-w-0 flex-wrap items-center gap-x-4 gap-y-1 text-sm tabular-nums">
            <span className="inline-flex min-w-0 items-center gap-1.5">
              <span aria-hidden="true" className="size-2 shrink-0 rounded-full" style={{ backgroundColor: leftColor }} />
              <span className="truncate">{leftLabel}</span>
              <strong data-testid="tally-left" className="font-semibold">
                {counts.left}
              </strong>
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="text-muted-foreground">平手</span>
              <strong data-testid="tally-tie" className="font-semibold">
                {counts.tie}
              </strong>
            </span>
            <span className="inline-flex min-w-0 items-center gap-1.5">
              <span aria-hidden="true" className="size-2 shrink-0 rounded-full" style={{ backgroundColor: rightColor }} />
              <span className="truncate">{rightLabel}</span>
              <strong data-testid="tally-right" className="font-semibold">
                {counts.right}
              </strong>
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <InfoTip content="以 Markdown 表格複製所有已評判的列（章節、列號、原文開頭、評判與備註）。">
              <Button
                data-testid="copy-verdicts"
                variant="outline"
                size="sm"
                onClick={onCopy}
                className="h-8 min-w-[8.5rem]"
              >
                <AnimatePresence mode="wait" initial={false}>
                  {copied ? (
                    <motion.span
                      key="copied"
                      className="inline-flex items-center gap-1.5"
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
                      key="copy"
                      className="inline-flex items-center gap-1.5"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.15 }}
                    >
                      <ClipboardCopy aria-hidden="true" />
                      複製評語
                    </motion.span>
                  )}
                </AnimatePresence>
              </Button>
            </InfoTip>

            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button data-testid="clear-verdicts" variant="ghost" size="sm" className="h-8">
                  <Eraser aria-hidden="true" />
                  清除
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogTitle>確定清除全部評語？</AlertDialogTitle>
                <AlertDialogDescription>
                  所有章節的評判與備註都會從這個瀏覽器移除，無法復原。若還需要，請先複製評語。
                </AlertDialogDescription>
                <div className="flex justify-end gap-2 pt-2">
                  <AlertDialogCancel>取消</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => {
                      onClear();
                      toast('已清除');
                    }}
                  >
                    清除全部
                  </AlertDialogAction>
                </div>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>

        <div
          role="img"
          aria-label={`本節評判：${leftLabel} ${counts.left}，平手 ${counts.tie}，${rightLabel} ${counts.right}`}
          className="flex h-2 w-full overflow-hidden rounded-full bg-muted"
        >
          <motion.span
            className="h-full"
            style={{ backgroundColor: leftColor }}
            animate={{ width: `${pct(counts.left)}%` }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
          />
          <motion.span
            className="h-full bg-border"
            animate={{ width: `${pct(counts.tie)}%` }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
          />
          <motion.span
            className="h-full"
            style={{ backgroundColor: rightColor }}
            animate={{ width: `${pct(counts.right)}%` }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
          />
        </div>
      </div>
    </motion.section>
  );
}
