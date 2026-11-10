import { motion } from 'motion/react';
import { Sparkles } from 'lucide-react';
import type { Meta, ModelId } from '@/types';
import { Button } from '@/components/ui/button';
import { Toggle } from '@/components/ui/toggle';
import type { ThemeMode } from '@/hooks/useTheme';
import { MODEL_COLOR, TITLE_BLIND, TITLE_NAMED } from '@/lib/ui/models';
import { shortName } from '@/lib/ui/stats';
import { InfoTip } from './InfoTip';
import { ThemeToggle } from './ThemeToggle';

const MODELS: ModelId[] = ['kimi', 'gemini'];

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

  return (
    <header className="mx-auto w-full max-w-[88rem] px-4 pb-6 pt-8 sm:px-6 sm:pt-12">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs font-medium tracking-[0.16em] text-muted-foreground">
        <span>第 2 章</span>
        <span aria-hidden="true">·</span>
        <span>{blind ? '盲測模式' : '機器譯文逐段比較'}</span>
      </div>
      <motion.h1
        key={title}
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: 'easeOut' }}
        className="mt-3 max-w-[50rem] text-balance text-2xl font-semibold leading-snug tracking-tight sm:text-3xl"
      >
        {title}
      </motion.h1>

      <div className="mt-5 grid gap-6 md:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)] md:gap-8">
        <div className="min-w-0 space-y-3 text-[0.95rem] leading-[1.8] text-muted-foreground">
          <p>
            {blind
              ? '本頁並排比較兩份繁體中文（台灣用語）譯文，譯文以段落為單位與英文原文逐段對齊。兩份譯文分別標示為譯本 A 與譯本 B，模型名稱於揭曉後顯示。'
              : `本頁並排比較同一份英文原文（第 2 章）的兩份繁體中文（台灣用語）機器譯文，分別由 ${shortName(meta, 'kimi')} 與 ${shortName(meta, 'gemini')} 翻譯。譯文以段落為單位與英文原文逐段對齊。`}
          </p>
          <ul className="list-disc space-y-1 pl-5 text-sm leading-relaxed">
            <li>兩個模型收到的指示逐字相同，原文也是同一份檔案的同一組位元組。</li>
            <li>每個檔案只送出一次請求。</li>
            <li>頁面顯示的是模型的原始輸出，未經人工編修；結構不一致的段落會特別標示。</li>
            <li>英文欄顯示的是當時送給模型翻譯的原文；報告 main 分支之後已把「folded variant」改寫（PR #211），因此與線上英文版略有不同。</li>
          </ul>
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

        {blind ? (
          <div className="rounded-xl border border-dashed border-border bg-muted/40 p-4 text-sm leading-relaxed text-muted-foreground">
            <p className="font-medium text-foreground">盲測中</p>
            <p className="mt-1">
              兩份譯文以譯本 A、譯本 B 呈現，左右順序每節隨機。模型資訊、耗時、費用與統計於揭曉後顯示。
            </p>
          </div>
        ) : (
          <dl className="grid gap-3 sm:grid-cols-2 md:grid-cols-1 lg:grid-cols-2">
            {MODELS.map((m) => {
              const mm = meta.models[m];
              return (
                <div key={m} className="relative min-w-0 overflow-hidden rounded-xl border border-border bg-card p-4">
                  <span aria-hidden="true" className="absolute inset-x-0 top-0 h-1" style={{ backgroundColor: MODEL_COLOR[m] }} />
                  <dt className="text-sm font-semibold" style={{ color: MODEL_COLOR[m] }}>
                    {mm?.name}
                  </dt>
                  <dd className="mt-1 text-sm leading-relaxed text-foreground/90">{mm?.how}</dd>
                  {mm?.runDetail && <dd className="mt-1 text-xs leading-relaxed text-muted-foreground">{mm.runDetail}</dd>}
                  {mm?.priceNote && <dd className="mt-1 text-xs leading-relaxed text-muted-foreground">{mm.priceNote}</dd>}
                </div>
              );
            })}
          </dl>
        )}
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-2">
        <ThemeToggle mode={themeMode} onCycle={onCycleTheme} />
        <InfoTip content="在 1200px 以上的寬螢幕，英文原文會顯示為最左側的欄位；較窄時以可收合的條帶顯示在譯文上方。快捷鍵：e">
          <Toggle data-testid="toggle-en" pressed={showEn} onClick={onToggleEn} className="text-xs">
            顯示英文原文
          </Toggle>
        </InfoTip>
        <InfoTip content="隱藏模型名稱與顏色，欄位改為譯本 A、譯本 B，左右順序每節隨機。適合先憑譯文品質判斷，再揭曉。快捷鍵：b">
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
