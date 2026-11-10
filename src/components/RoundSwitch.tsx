import type { Round } from '@/lib/ui/round';
import { cn } from '@/lib/ui/utils';

const OPTIONS: { round: Round; short: string; long: string }[] = [
  { round: 1, short: '第一輪', long: '第一輪：原英文 · Kimi vs Gemini' },
  { round: 2, short: '第二輪', long: '第二輪：Fable 改寫英文 · Gemini' },
];

/**
 * Segmented control for the comparison round. Short labels on phones. While round-1 blind mode is on,
 * the long labels (which name the models) are never shown, at any width.
 */
export function RoundSwitch({
  round,
  blind = false,
  onSelect,
}: {
  round: Round;
  blind?: boolean;
  onSelect: (round: Round) => void;
}) {
  return (
    <div className="mx-auto w-full max-w-[88rem] px-3 pt-4 sm:px-6 sm:pt-6">
      <div
        role="group"
        aria-label="比較輪次"
        className="inline-flex w-full rounded-xl border border-border bg-muted/60 p-1 sm:w-auto"
      >
        {OPTIONS.map((o) => {
          const on = o.round === round;
          return (
            <button
              key={o.round}
              type="button"
              data-testid={`round-${o.round}`}
              aria-pressed={on}
              onClick={() => onSelect(o.round)}
              className={cn(
                'inline-flex min-h-9 min-w-0 flex-1 cursor-pointer items-center justify-center whitespace-nowrap rounded-lg px-3 py-1.5 text-sm outline-none transition-colors duration-200 focus-visible:ring-2 focus-visible:ring-ring sm:flex-none sm:px-4',
                on
                  ? 'bg-card font-semibold text-foreground shadow-sm ring-1 ring-border'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              {blind ? (
                <span>{o.short}</span>
              ) : (
                <>
                  <span className="sm:hidden">{o.short}</span>
                  <span className="hidden sm:inline">{o.long}</span>
                </>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
