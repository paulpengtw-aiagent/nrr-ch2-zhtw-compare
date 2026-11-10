import { forwardRef, type ButtonHTMLAttributes } from 'react';
import { cn } from '@/lib/ui/utils';

export interface ToggleProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  pressed: boolean;
}

/** Two-state button exposing aria-pressed. Pressed look is driven by the aria-pressed variant. */
export const Toggle = forwardRef<HTMLButtonElement, ToggleProps>(function Toggle(
  { pressed, className, ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      type="button"
      aria-pressed={pressed}
      className={cn(
        'inline-flex h-8 cursor-pointer select-none items-center justify-center gap-1.5 whitespace-nowrap rounded-md border border-border bg-card px-3 text-sm font-medium text-foreground outline-none transition-[background-color,color,border-color,box-shadow,transform] duration-200 ease-out hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background active:scale-[0.97] disabled:pointer-events-none disabled:opacity-50 aria-pressed:border-foreground aria-pressed:bg-foreground aria-pressed:text-background [&_svg]:size-4 [&_svg]:shrink-0',
        className,
      )}
      {...props}
    />
  );
});
