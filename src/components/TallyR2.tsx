import type { Tally2 } from '@/lib/ui/verdicts2';
import { cn } from '@/lib/ui/utils';

const ITEMS: { key: keyof Tally2; label: string; testId: string; color: string }[] = [
  { key: 'good', label: '通順', testId: 'tally2-good', color: 'var(--kimi)' },
  { key: 'ok', label: '尚可', testId: 'tally2-ok', color: 'var(--neutral-b)' },
  { key: 'fix', label: '需修', testId: 'tally2-fix', color: 'var(--warn)' },
];

/** Round-2 counts 通順 / 尚可 / 需修 (current section, or all sections on 總覽). */
export function TallyNumbersR2({ counts, compact = false }: { counts: Tally2; compact?: boolean }) {
  const labelClass = cn('truncate text-muted-foreground', compact && 'hidden min-[1100px]:inline');
  return (
    <div className="flex min-w-0 items-center gap-3 text-xs tabular-nums sm:text-sm">
      {ITEMS.map((it) => (
        <span key={it.key} className="inline-flex min-w-0 items-center gap-1.5">
          <span aria-hidden="true" className="size-2 shrink-0 rounded-full" style={{ backgroundColor: it.color }} />
          <span className={labelClass}>{it.label}</span>
          <strong data-testid={it.testId} className="font-semibold text-foreground">
            {counts[it.key]}
          </strong>
        </span>
      ))}
    </div>
  );
}

/** Slim segmented bar in the same style as TallyMeter. */
export function TallyMeterR2({ counts, className }: { counts: Tally2; className?: string }) {
  const total = counts.good + counts.ok + counts.fix;
  const pct = (n: number) => (total ? (n / total) * 100 : 0);
  return (
    <div
      role="img"
      aria-label={`本節評判分布：通順 ${counts.good}，尚可 ${counts.ok}，需修 ${counts.fix}`}
      className={cn('flex h-1.5 w-full min-w-16 overflow-hidden rounded-full bg-muted', className)}
    >
      {ITEMS.map((it) => (
        <span
          key={it.key}
          className="h-full transition-[width] duration-500 ease-out"
          style={{ width: `${pct(counts[it.key])}%`, backgroundColor: it.color }}
        />
      ))}
    </div>
  );
}
