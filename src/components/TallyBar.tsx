import { motion, useReducedMotion } from 'motion/react';
import type { ModelId } from '@/types';
import { sideColor, type Pair } from '@/lib/ui/models';
import type { Tally } from '@/lib/ui/stats';
import { cn } from '@/lib/ui/utils';

interface TallyNumbersProps {
  tally: Tally;
  pair: Pair;
  blind: boolean;
  names: Record<ModelId, string>;
  /** Compact (desktop top bar): hide the column names below 1100px to save room. */
  compact?: boolean;
}

/** Left / 平手 / right counts in column order. Blind mode labels the columns 譯本 A and 譯本 B. */
export function TallyNumbers({ tally, pair, blind, names, compact = false }: TallyNumbersProps) {
  const leftLabel = blind ? '譯本 A' : names[pair.left];
  const rightLabel = blind ? '譯本 B' : names[pair.right];
  const labelClass = cn('truncate text-muted-foreground', compact && 'hidden min-[1100px]:inline');
  return (
    <div className="flex min-w-0 items-center gap-3 text-xs tabular-nums sm:text-sm">
      <span className="inline-flex min-w-0 items-center gap-1.5">
        <span
          aria-hidden="true"
          className="size-2 shrink-0 rounded-full"
          style={{ backgroundColor: sideColor('left', pair.left, blind) }}
        />
        <span className={labelClass}>{leftLabel}</span>
        <strong data-testid="tally-left" className="font-semibold text-foreground">
          {tally[pair.left]}
        </strong>
      </span>
      <span className="inline-flex items-center gap-1.5">
        <span className="text-muted-foreground">平手</span>
        <strong data-testid="tally-tie" className="font-semibold text-foreground">
          {tally.tie}
        </strong>
      </span>
      <span className="inline-flex min-w-0 items-center gap-1.5">
        <span
          aria-hidden="true"
          className="size-2 shrink-0 rounded-full"
          style={{ backgroundColor: sideColor('right', pair.right, blind) }}
        />
        <span className={labelClass}>{rightLabel}</span>
        <strong data-testid="tally-right" className="font-semibold text-foreground">
          {tally[pair.right]}
        </strong>
      </span>
    </div>
  );
}

interface TallyMeterProps {
  tally: Tally;
  pair: Pair;
  blind: boolean;
  className?: string;
}

/** Slim segmented bar: left colour, tie neutral, right colour. Widths animate; reduced motion skips the tween. */
export function TallyMeter({ tally, pair, blind, className }: TallyMeterProps) {
  const reduce = useReducedMotion();
  const total = tally.kimi + tally.gemini + tally.tie;
  const pct = (n: number) => (total ? (n / total) * 100 : 0);
  const left = tally[pair.left];
  const right = tally[pair.right];
  const transition = { duration: reduce ? 0 : 0.5, ease: 'easeOut' as const };
  return (
    <div
      role="img"
      aria-label={`本節評判分布：左 ${left}，平手 ${tally.tie}，右 ${right}`}
      className={cn('flex h-1.5 w-full min-w-16 overflow-hidden rounded-full bg-muted', className)}
    >
      <motion.span
        className="h-full"
        style={{ backgroundColor: sideColor('left', pair.left, blind) }}
        animate={{ width: `${pct(left)}%` }}
        transition={transition}
      />
      <motion.span className="h-full bg-border" animate={{ width: `${pct(tally.tie)}%` }} transition={transition} />
      <motion.span
        className="h-full"
        style={{ backgroundColor: sideColor('right', pair.right, blind) }}
        animate={{ width: `${pct(right)}%` }}
        transition={transition}
      />
    </div>
  );
}
