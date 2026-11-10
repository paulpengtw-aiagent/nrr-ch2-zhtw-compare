import type { ModelId } from '@/types';
import type { Pair } from '@/lib/ui/models';
import type { Tally } from '@/lib/ui/stats';
import type { Tally2 } from '@/lib/ui/verdicts2';
import { SectionTabs, type TabItem } from './SectionTabs';
import { ShortcutsButton } from './ShortcutsButton';
import { TallyMeter, TallyNumbers } from './TallyBar';
import { TallyMeterR2, TallyNumbersR2 } from './TallyR2';
import { ClearVerdictsButton, CopyVerdictsButton } from './VerdictActions';

interface TopBarProps {
  items: TabItem[];
  activeId: string;
  onSelect: (id: string) => void;
  isPhone: boolean;
  tally: Tally;
  pair: Pair;
  blind: boolean;
  names: Record<ModelId, string>;
  getMarkdown: () => string;
  onClear: () => void;
  /** Round 2 only: when set, the round-2 counts (通順 / 尚可 / 需修) replace the round-1 tally. */
  tally2?: Tally2;
}

/**
 * Sticky top bar: section tabs on every width. On desktop (>=641px) it also carries the
 * tally, 複製評語, 清除 and 快捷鍵. On phones those move into the bottom bar.
 */
export function TopBar({
  items,
  activeId,
  onSelect,
  isPhone,
  tally,
  pair,
  blind,
  names,
  getMarkdown,
  onClear,
  tally2,
}: TopBarProps) {
  return (
    <nav
      aria-label="章節與評判工具"
      data-testid="topbar"
      className="sticky top-0 z-30 border-b border-border bg-background/90 backdrop-blur supports-[backdrop-filter]:bg-background/75"
    >
      <div className="mx-auto flex h-12 max-w-[88rem] items-center gap-2 px-3 sm:gap-3 sm:px-6">
        <SectionTabs items={items} activeId={activeId} onSelect={onSelect} className="min-w-0 flex-1" />
        {!isPhone && (
          <div className="flex shrink-0 items-center gap-3 border-l border-border pl-3">
            {tally2 ? (
              <>
                <TallyNumbersR2 counts={tally2} compact />
                <TallyMeterR2 counts={tally2} className="hidden w-20 min-[1100px]:flex" />
              </>
            ) : (
              <>
                <TallyNumbers tally={tally} pair={pair} blind={blind} names={names} compact />
                <TallyMeter tally={tally} pair={pair} blind={blind} className="hidden w-20 min-[1100px]:flex" />
              </>
            )}
            <CopyVerdictsButton getMarkdown={getMarkdown} />
            <ClearVerdictsButton onRequest={onClear} />
            <ShortcutsButton round2={tally2 !== undefined} />
          </div>
        )}
      </div>
    </nav>
  );
}
