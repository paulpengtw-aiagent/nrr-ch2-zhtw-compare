import { motion } from 'motion/react';
import type { R2Meta } from '@/types';
import type { ThemeMode } from '@/hooks/useTheme';
import { Toggle } from '@/components/ui/toggle';
import { TITLE_R2 } from '@/lib/ui/round';
import { InfoTip } from './InfoTip';
import { ThemeToggle } from './ThemeToggle';

interface HeaderR2Props {
  meta: R2Meta;
  themeMode: ThemeMode;
  onCycleTheme: () => void;
  showEn: boolean;
  onToggleEn: () => void;
}

/** Round-2 hero. Round 1 keeps its own Header (unchanged). */
export function HeaderR2({ meta, themeMode, onCycleTheme, showEn, onToggleEn }: HeaderR2Props) {
  return (
    <header className="mx-auto w-full max-w-[88rem] px-4 pb-6 pt-6 sm:px-6 sm:pt-8">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs font-medium tracking-[0.16em] text-muted-foreground">
        <span>第 2 章</span>
        <span aria-hidden="true">·</span>
        <span>第二輪：Fable 改寫英文 · 機器譯文逐段比較</span>
      </div>
      <motion.h1
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: 'easeOut' }}
        className="mt-3 max-w-[50rem] text-balance text-2xl font-semibold leading-snug tracking-tight sm:text-3xl"
      >
        {TITLE_R2}
      </motion.h1>

      <div className="mt-5 grid gap-6 md:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)] md:gap-8">
        <div className="min-w-0 space-y-3 text-[0.95rem] leading-[1.8] text-muted-foreground">
          <p data-testid="hero-r2">
            第二輪：英文先由 Fable 5.2 改寫得更白話，再用與第一輪相同的翻譯提示與設定（Gemini 3.6 Flash 網頁版，思考等級 High，每檔一個新對話）譯成繁中；詞彙表已加入新標籤。
            <span className="mx-2" aria-hidden="true">
              ·
            </span>
            <a
              href={meta.enSource.url}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-sm underline underline-offset-4 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              英文原文（report/ch2）
            </a>
            <span className="mx-2" aria-hidden="true">
              ·
            </span>
            <a
              href={meta.geminiRun.url}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-sm underline underline-offset-4 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              執行資料夾
            </a>
          </p>
          <ul className="list-disc space-y-1 pl-5 text-sm leading-relaxed">
            <li>本輪只有一個模型，因此沒有盲測；左欄為新英文，右欄為譯文，逐段對齊。</li>
            <li>每個檔案的譯文都是模型的原始輸出，未經人工編修；失敗而重試的情形記在總覽的耗時說明。</li>
            <li>列旁的標示是已知問題（例如連結被全形括號吞掉），依原樣顯示，未修正。</li>
          </ul>
          <p className="text-sm">執行日期：{meta.runDate}</p>
        </div>

        <dl className="grid gap-3">
          <div className="relative min-w-0 overflow-hidden rounded-xl border border-border bg-card p-4">
            <span aria-hidden="true" className="absolute inset-x-0 top-0 h-1" style={{ backgroundColor: 'var(--gemini)' }} />
            <dt className="text-sm font-semibold" style={{ color: 'var(--gemini)' }}>
              {meta.model.name}
            </dt>
            <dd className="mt-1 text-sm leading-relaxed text-foreground/90">{meta.model.how}</dd>
            <dd className="mt-1 text-xs leading-relaxed text-muted-foreground">{meta.model.runDetail}</dd>
          </div>
        </dl>
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-2">
        <ThemeToggle mode={themeMode} onCycle={onCycleTheme} />
        <InfoTip content="顯示或隱藏左側的英文原文欄。快捷鍵：e">
          <Toggle data-testid="toggle-en" pressed={showEn} onClick={onToggleEn} className="text-xs">
            顯示英文原文
          </Toggle>
        </InfoTip>
      </div>
    </header>
  );
}
