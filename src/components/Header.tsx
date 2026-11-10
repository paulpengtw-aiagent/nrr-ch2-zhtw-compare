import { motion } from 'motion/react';
import { Sparkles } from 'lucide-react';
import type { Meta, ModelId } from '@/types';
import { Button } from '@/components/ui/button';
import { Toggle } from '@/components/ui/toggle';
import type { ThemeMode } from '@/hooks/useTheme';
import { MODEL_COLOR, MODEL_NAME, TITLE_BLIND, TITLE_NAMED } from '@/lib/ui/models';
import { InfoTip } from './InfoTip';
import { ThemeToggle } from './ThemeToggle';

const MODELS: ModelId[] = ['kimi', 'gemini'];
const NAME_PATTERN = /kimi|gemini/i;

interface HeaderProps {
  meta: Meta;
  blind: boolean;
  showEn: boolean;
  themeMode: ThemeMode;
  onCycleTheme: () => void;
  onToggleEn: () => void;
  onToggleBlind: () => void;
  onReveal: () => void;
}

export function Header({
  meta,
  blind,
  showEn,
  themeMode,
  onCycleTheme,
  onToggleEn,
  onToggleBlind,
  onReveal,
}: HeaderProps) {
  const title = blind ? TITLE_BLIND : TITLE_NAMED;
  const instructions = (meta.sameInstructions ?? '').trim();
  // In blind mode, never print instructions that name a model.
  const shownInstructions = blind && NAME_PATTERN.test(instructions) ? '' : instructions;

  return (
    <header className="mx-auto w-full max-w-[88rem] px-4 pb-6 pt-8 sm:px-6 sm:pt-12">
      <p className="text-xs font-medium tracking-[0.16em] text-muted-foreground">
        {blind ? '盲測模式' : '機器譯文逐段比較'}
      </p>
      <motion.h1
        key={title}
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: 'easeOut' }}
        className="mt-2 max-w-[50rem] text-balance text-2xl font-semibold leading-snug tracking-tight sm:text-3xl"
      >
        {title}
      </motion.h1>

      <div className="mt-4 max-w-[46rem] space-y-3 text-[0.95rem] leading-[1.8] text-muted-foreground">
        <p>
          {blind
            ? '本頁並排比較兩個模型對同一份英文原文（第 2 章）產生的繁體中文（台灣用語）譯文。兩份譯文以段落為單位與英文原文逐段對齊，結構不一致的段落會特別標示。'
            : `本頁並排比較同一份英文原文（第 2 章）的兩份繁體中文（台灣用語）機器譯文，分別由 ${MODEL_NAME.kimi} 與 ${MODEL_NAME.gemini} 翻譯。兩份譯文以段落為單位與英文原文逐段對齊，結構不一致的段落會特別標示。`}
        </p>
        <p>
          兩個模型收到的指示逐字相同{shownInstructions ? '：' : '。'}
        </p>
        {shownInstructions && (
          <blockquote className="border-l-2 border-border pl-3 text-sm text-foreground/80">
            {shownInstructions}
          </blockquote>
        )}
        {!blind && (
          <dl className="grid gap-2 text-sm sm:grid-cols-[auto_minmax(0,1fr)] sm:gap-x-4">
            {MODELS.map((m) => (
              <div key={m} className="contents">
                <dt className="font-medium" style={{ color: MODEL_COLOR[m] }}>
                  {MODEL_NAME[m]}
                </dt>
                <dd className="min-w-0">{meta.models[m]?.how}</dd>
              </div>
            ))}
          </dl>
        )}
        <p className="text-sm">
          執行日期：{meta.runDate}
          <span className="mx-2" aria-hidden="true">
            ·
          </span>
          <a
            href={meta.sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-sm underline underline-offset-4 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            英文原文報告
          </a>
        </p>
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-2">
        <ThemeToggle mode={themeMode} onCycle={onCycleTheme} />
        <InfoTip content="在 1200px 以上的寬螢幕，英文原文會顯示為最左側的欄位；較窄時以可收合的條帶顯示在譯文上方。">
          <Toggle data-testid="toggle-en" pressed={showEn} onClick={onToggleEn} className="text-xs">
            顯示英文原文
          </Toggle>
        </InfoTip>
        <InfoTip content="隱藏模型名稱與顏色，欄位改為譯本 A、譯本 B，左右順序每節隨機。適合先憑譯文品質判斷，再揭曉。">
          <Toggle data-testid="toggle-blind" pressed={blind} onClick={onToggleBlind} className="text-xs">
            盲測模式
          </Toggle>
        </InfoTip>
        {blind && (
          <InfoTip content="結束盲測，顯示模型名稱、統計與詞彙備註。">
            <Button data-testid="reveal" size="sm" onClick={onReveal}>
              <Sparkles aria-hidden="true" />
              揭曉
            </Button>
          </InfoTip>
        )}
      </div>
    </header>
  );
}
