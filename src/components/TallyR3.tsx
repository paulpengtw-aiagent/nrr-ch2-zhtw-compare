import { AnimatePresence, motion } from 'motion/react';
import type { R3Model, R3Section } from '@/types';
import { BLIND_COLOR, LETTERS, R3_COLORS, TIE, type Tally3 } from '@/lib/ui/verdicts3';
import { cn } from '@/lib/ui/utils';
import { InfoTip } from './InfoTip';

/**
 * Round-3 counts in the top bar (never over the text): wins per model and 差不多. In blind mode on a section the
 * models are shown as 譯本 A–D; on 總覽 in blind mode only the number of judged rows is shown.
 */
export function TallyR3({
  counts,
  models,
  section,
  blind,
  compact = false,
}: {
  counts: Tally3;
  models: R3Model[];
  section: R3Section | undefined;
  blind: boolean;
  compact?: boolean;
}) {
  const total = Object.values(counts).reduce((a, b) => a + b, 0);
  if (blind && !section) {
    return (
      <span data-testid="tally3-total" className="text-xs tabular-nums text-muted-foreground sm:text-sm">
        已評 <strong className="text-foreground">{total}</strong> 列
      </span>
    );
  }
  const ids = blind && section ? section.blindOrder : models.map((m) => m.id);
  const items = [
    ...ids.map((id, i) => ({
      key: id,
      label: blind ? `譯本 ${LETTERS[i]}` : (models.find((m) => m.id === id)?.short ?? id),
      color: blind ? BLIND_COLOR : (R3_COLORS[id] ?? BLIND_COLOR),
      testId: blind ? `tally3-${LETTERS[i]}` : `tally3-${id}`,
    })),
    { key: TIE, label: '差不多', color: 'var(--neutral-b)', testId: 'tally3-tie' },
  ];
  return (
    <InfoTip content={section ? '本節各譯本被選為較好的列數' : '全部章節各模型被選為較好的列數'}>
      <div data-testid="tally3" tabIndex={0} className="flex min-w-0 items-center gap-2.5 rounded-md text-xs tabular-nums outline-none focus-visible:ring-2 focus-visible:ring-ring sm:text-sm">
        {items.map((it) => (
          <span key={it.key} className="inline-flex min-w-0 items-center gap-1">
            <span aria-hidden="true" className="size-2 shrink-0 rounded-full" style={{ backgroundColor: it.color }} />
            <span className={cn('truncate text-muted-foreground', compact && 'hidden min-[1180px]:inline')}>{it.label}</span>
            <span data-testid={it.testId} className="relative inline-flex font-semibold text-foreground">
            <AnimatePresence mode="popLayout" initial={false}>
              <motion.strong
                key={counts[it.key] ?? 0}
                initial={{ y: -8, opacity: 0, scale: 1.4 }}
                animate={{ y: 0, opacity: 1, scale: 1 }}
                exit={{ y: 8, opacity: 0 }}
                transition={{ type: 'spring', stiffness: 500, damping: 26 }}
                className="inline-block font-semibold text-foreground"
              >
                {counts[it.key] ?? 0}
              </motion.strong>
            </AnimatePresence>
            </span>
          </span>
        ))}
      </div>
    </InfoTip>
  );
}
