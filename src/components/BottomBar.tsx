import { useState } from 'react';
import { Ellipsis } from 'lucide-react';
import type { ModelId } from '@/types';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import type { Pair } from '@/lib/ui/models';
import type { Tally } from '@/lib/ui/stats';
import { InfoTip } from './InfoTip';
import { TallyMeter, TallyNumbers } from './TallyBar';
import { ClearVerdictsButton, CopyVerdictsButton } from './VerdictActions';

interface BottomBarProps {
  tally: Tally;
  pair: Pair;
  blind: boolean;
  names: Record<ModelId, string>;
  getMarkdown: () => string;
  onClear: () => void;
}

/** Phone-only fixed bar, 48px tall: the counts and one overflow menu holding 複製評語 and 清除. */
export function BottomBar({ tally, pair, blind, names, getMarkdown, onClear }: BottomBarProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  return (
    <div
      data-testid="bottombar"
      className="fixed inset-x-0 bottom-0 z-40 flex h-12 items-center justify-between gap-2 border-t border-border bg-card/95 px-3 shadow-[0_-8px_24px_-12px_rgba(0,0,0,0.25)] backdrop-blur-md"
    >
      <TallyMeter tally={tally} pair={pair} blind={blind} className="absolute inset-x-0 -top-px h-[3px] rounded-none" />
      <TallyNumbers tally={tally} pair={pair} blind={blind} names={names} />
      <Popover open={menuOpen} onOpenChange={setMenuOpen}>
        <InfoTip content="更多：複製評語、清除全部評判">
          <PopoverTrigger asChild>
            <Button data-testid="tally-menu" variant="outline" size="sm" className="h-8 w-10 shrink-0 px-0" aria-label="評語操作">
              <Ellipsis aria-hidden="true" />
            </Button>
          </PopoverTrigger>
        </InfoTip>
        <PopoverContent side="top" align="end" className="flex w-56 flex-col gap-2 p-2">
          <CopyVerdictsButton getMarkdown={getMarkdown} className="h-9 w-full justify-start" />
          <ClearVerdictsButton
            className="h-9 w-full justify-start"
            onRequest={() => {
              setMenuOpen(false);
              onClear();
            }}
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}
