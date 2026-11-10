import { AnimatePresence, motion } from 'motion/react';
import { Monitor, Moon, Sun } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { ThemeMode } from '@/hooks/useTheme';
import { InfoTip } from './InfoTip';

const META: Record<ThemeMode, { label: string; Icon: typeof Sun }> = {
  system: { label: '系統', Icon: Monitor },
  light: { label: '淺色', Icon: Sun },
  dark: { label: '深色', Icon: Moon },
};

interface ThemeToggleProps {
  mode: ThemeMode;
  onCycle: () => void;
}

export function ThemeToggle({ mode, onCycle }: ThemeToggleProps) {
  const { label, Icon } = META[mode];
  return (
    <InfoTip content="外觀設定：依序切換 系統、淺色、深色。會記住你的選擇。">
      <Button
        variant="outline"
        size="sm"
        onClick={onCycle}
        data-testid="toggle-theme"
        aria-label={`外觀：${label}，點擊切換`}
      >
        <AnimatePresence mode="wait" initial={false}>
          <motion.span
            key={mode}
            className="inline-flex"
            initial={{ rotate: -90, opacity: 0 }}
            animate={{ rotate: 0, opacity: 1 }}
            exit={{ rotate: 90, opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <Icon aria-hidden="true" />
          </motion.span>
        </AnimatePresence>
        {label}
      </Button>
    </InfoTip>
  );
}
