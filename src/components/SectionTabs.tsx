import { useRef, type KeyboardEvent } from 'react';
import { motion } from 'motion/react';
import type { Section } from '@/types';
import { cn } from '@/lib/ui/utils';

interface SectionTabsProps {
  sections: Section[];
  activeId: string;
  onSelect: (id: string) => void;
}

export function SectionTabs({ sections, activeId, onSelect }: SectionTabsProps) {
  const buttons = useRef<(HTMLButtonElement | null)[]>([]);

  const onKeyDown = (e: KeyboardEvent<HTMLButtonElement>, index: number) => {
    const n = sections.length;
    let target: number | null = null;
    if (e.key === 'ArrowRight') target = (index + 1) % n;
    else if (e.key === 'ArrowLeft') target = (index - 1 + n) % n;
    else if (e.key === 'Home') target = 0;
    else if (e.key === 'End') target = n - 1;
    if (target === null) return;
    e.preventDefault();
    const next = sections[target];
    if (!next) return;
    buttons.current[target]?.focus();
    onSelect(next.id);
  };

  return (
    <nav
      aria-label="章節"
      className="sticky top-0 z-30 border-b border-border bg-background/85 backdrop-blur supports-[backdrop-filter]:bg-background/70"
    >
      <div
        role="tablist"
        aria-label="章節"
        className="mx-auto flex max-w-[88rem] gap-1 overflow-x-auto px-3 py-2 sm:px-6"
      >
        {sections.map((s, i) => {
          const active = s.id === activeId;
          return (
            <button
              key={s.id}
              ref={(el) => {
                buttons.current[i] = el;
              }}
              id={`tab-${s.id}`}
              type="button"
              role="tab"
              data-testid={`tab-${s.id}`}
              aria-selected={active}
              aria-controls="section-panel"
              tabIndex={active ? 0 : -1}
              onClick={() => onSelect(s.id)}
              onKeyDown={(e) => onKeyDown(e, i)}
              className={cn(
                'relative flex shrink-0 cursor-pointer items-center gap-2 rounded-lg px-3 py-1.5 text-left text-sm outline-none transition-colors duration-200 focus-visible:ring-2 focus-visible:ring-ring',
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
              <span className="relative font-mono text-xs opacity-70">{s.id}</span>
              <span className="relative max-w-[14rem] truncate sm:max-w-[22rem]">{s.title}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
