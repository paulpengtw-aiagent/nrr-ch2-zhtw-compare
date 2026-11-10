import { forwardRef, type ComponentPropsWithoutRef, type ComponentRef } from 'react';
import * as TooltipPrimitive from '@radix-ui/react-tooltip';
import { cn } from '@/lib/ui/utils';

export const TooltipProvider = TooltipPrimitive.Provider;
export const Tooltip = TooltipPrimitive.Root;
export const TooltipTrigger = TooltipPrimitive.Trigger;

export const TooltipContent = forwardRef<
  ComponentRef<typeof TooltipPrimitive.Content>,
  ComponentPropsWithoutRef<typeof TooltipPrimitive.Content>
>(function TooltipContent({ className, sideOffset = 6, collisionPadding = 8, ...props }, ref) {
  return (
    <TooltipPrimitive.Portal>
      <TooltipPrimitive.Content
        ref={ref}
        sideOffset={sideOffset}
        collisionPadding={collisionPadding}
        className={cn(
          'z-[70] max-w-[min(20rem,calc(100vw_-_1.5rem))] rounded-md bg-foreground px-3 py-2 text-xs leading-relaxed text-background shadow-lg data-[state=delayed-open]:animate-tip-in data-[state=instant-open]:animate-tip-in',
          className,
        )}
        {...props}
      />
    </TooltipPrimitive.Portal>
  );
});
