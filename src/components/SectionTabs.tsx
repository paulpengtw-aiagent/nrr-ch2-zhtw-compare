import { useRef, type KeyboardEvent } from 'react';
import { motion } from 'motion/react';
import { cn } from '@/lib/ui/utils';
import { InfoTip } from './InfoTip';

export interface TabItem {
  id: string;
  /** Section id shown in front of the label (empty for the overview tab). */
  num: string;
  label: string;
  /** Tooltip text: the English section title, or a description for the overview tab. */
  tip: string;
}

interface SectionTabsProps {
  items: TabItem[];
  activeId: string;
  onSelect: (id: string) => void;
  className?: string;
}

/** Horizontal tablist. Scrolls inside its own container so the page never overflows. */
export function SectionTabs({ items, activeId, onSelect, className }: SectionTabsProps) {
  const buttons = useRef<(HTMLButtonElement | null)[]>([]);

  const onKeyDown = (e: KeyboardEvent<HTMLButtonElement>, index: number) => {
    const n = items.length;
    let target: number | null = null;
    if (e.key === 'ArrowRight') target = (index + 1) % n;
    else if (e.key === 'ArrowLeft') target = (index - 1 + n) % n;
    else if (e.key === 'Home') target = 0;
    else if (e.key === 'End') target = n - 1;
    if (target === null) return;
    e.preventDefault();
    const next = items[target];
    if (!next) return;
    buttons.current[target]?.focus();
    onSelect(next.id);
  };

  return (
    <div
      role="tablist"
      aria-label="章節"
      className={cn('flex items-center gap-1 overflow-x-auto overscroll-x-contain py-1', className)}
    >
      {items.map((it, i) => {
        const active = it.id === activeId;
        return (
          <InfoTip key={it.id} content={it.tip}>
            <button
              ref={(el) => {
                buttons.current[i] = el;
              }}
              id={`tab-${it.id}`}
              type="button"
              role="tab"
              data-testid={`tab-${it.id}`}
              aria-selected={active}
              aria-controls="section-panel"
              tabIndex={active ? 0 : -1}
              onClick={() => onSelect(it.id)}
              onKeyDown={(e) => onKeyDown(e, i)}
              className={cn(
                'relative flex shrink-0 cursor-pointer items-center gap-1.5 whitespace-nowrap rounded-lg px-3 py-1.5 text-sm outline-none transition-colors duration-200 focus-visible:ring-2 focus-visible:ring-ring',
                active ? 'text-foreground' : 'text-muted-foreground hover:text-foreground',
              )}
            >
              {active && (
                <motion.span
                  layoutId="section-tab-indicator"
                  className="absolute inset-0 rounded-lg bg-card shadow-sm ring-1 ring-border"
                  transition={{ type: 'spring', stiffness: 420, damping: 34 }}
                />
              )}
              {it.num && <span className="relative font-mono text-xs opacity-70">{it.num}</span>}
              <span className="relative">{it.label}</span>
            </button>
          </InfoTip>
        );
      })}
    </div>
  );
}
