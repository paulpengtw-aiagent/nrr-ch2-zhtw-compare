import { forwardRef, type ComponentPropsWithoutRef, type ComponentRef } from 'react';
import * as PopoverPrimitive from '@radix-ui/react-popover';
import { cn } from '@/lib/ui/utils';

export const Popover = PopoverPrimitive.Root;
export const PopoverTrigger = PopoverPrimitive.Trigger;

export const PopoverContent = forwardRef<
  ComponentRef<typeof PopoverPrimitive.Content>,
  ComponentPropsWithoutRef<typeof PopoverPrimitive.Content>
>(function PopoverContent({ className, align = 'center', sideOffset = 8, collisionPadding = 8, ...props }, ref) {
  return (
    <PopoverPrimitive.Portal>
      <PopoverPrimitive.Content
        ref={ref}
        align={align}
        sideOffset={sideOffset}
        collisionPadding={collisionPadding}
        className={cn(
          'z-[70] max-w-[min(22rem,calc(100vw_-_1.5rem))] rounded-xl border border-border bg-card p-3 text-sm text-card-foreground shadow-xl outline-none data-[state=open]:animate-tip-in',
          className,
        )}
        {...props}
      />
    </PopoverPrimitive.Portal>
  );
});
