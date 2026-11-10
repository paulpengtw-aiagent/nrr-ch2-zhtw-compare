import { useRef, useState, type ReactElement, type ReactNode } from 'react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

interface InfoTipProps {
  content: ReactNode;
  children: ReactElement;
  side?: 'top' | 'bottom' | 'left' | 'right';
}

/**
 * Tooltip that also works on touch. Radix closes tooltips on pointerdown and click, which
 * would swallow a tap. For touch and pen pointers we ignore those close requests and toggle
 * the tooltip on click instead.
 */
export function InfoTip({ content, children, side = 'top' }: InfoTipProps) {
  const [open, setOpen] = useState(false);
  const touch = useRef(false);

  return (
    <Tooltip
      open={open}
      onOpenChange={(next) => {
        if (!next && touch.current) return;
        setOpen(next);
      }}
    >
      <TooltipTrigger
        asChild
        onPointerDown={(e) => {
          touch.current = e.pointerType !== 'mouse';
        }}
        onClick={() => {
          if (!touch.current) return;
          setOpen((o) => !o);
          window.setTimeout(() => {
            touch.current = false;
          }, 0);
        }}
      >
        {children}
      </TooltipTrigger>
      <TooltipContent side={side}>{content}</TooltipContent>
    </Tooltip>
  );
}
