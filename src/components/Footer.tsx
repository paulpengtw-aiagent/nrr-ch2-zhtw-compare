import type { Meta } from '@/types';
import { MODEL_NAME } from '@/lib/ui/models';

interface FooterProps {
  meta: Meta;
  generatedAt: string;
  blind: boolean;
}

export function Footer({ meta, generatedAt, blind }: FooterProps) {
  return (
    <footer className="mx-auto w-full max-w-[88rem] border-t border-border px-4 py-8 text-sm leading-relaxed text-muted-foreground sm:px-6">
      <p>執行日期：{meta.runDate}</p>
      <p>比較對象：{blind ? '譯本 A × 譯本 B' : `${MODEL_NAME.kimi} × ${MODEL_NAME.gemini}`}</p>
      <p>
        <a
          href={meta.sourceUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="rounded-sm underline underline-offset-4 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          英文原文報告
        </a>
        <span className="mx-2" aria-hidden="true">
          ·
        </span>
        資料產生時間：{generatedAt}
      </p>
    </footer>
  );
}
