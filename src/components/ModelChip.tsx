import { motion } from 'motion/react';

interface ModelChipProps {
  label: string;
  color: string;
}

/** Model name (or 譯本 A/B in blind mode) with a colour dot. The label re-animates when it changes. */
export function ModelChip({ label, color }: ModelChipProps) {
  return (
    <span
      className="inline-flex max-w-full min-w-0 items-center gap-2 rounded-full px-2.5 py-1 text-xs font-medium transition-[color,background-color] duration-700"
      style={{ color, backgroundColor: `color-mix(in oklab, ${color} 14%, transparent)` }}
    >
      <span
        aria-hidden="true"
        className="size-2 shrink-0 rounded-full transition-colors duration-700"
        style={{ backgroundColor: color }}
      />
      <motion.span
        key={label}
        className="truncate"
        initial={{ opacity: 0, y: 4, filter: 'blur(3px)' }}
        animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
        transition={{ duration: 0.35, ease: 'easeOut' }}
      >
        {label}
      </motion.span>
    </span>
  );
}
