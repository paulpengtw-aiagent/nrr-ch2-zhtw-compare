import { Keyboard } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { InfoTip } from './InfoTip';

const SHORTCUTS: { keys: string[]; text: string }[] = [
  { keys: ['['], text: '上一節' },
  { keys: [']'], text: '下一節（最後一節之後是總覽）' },
  { keys: ['j'], text: '焦點移到下一列' },
  { keys: ['k'], text: '焦點移到上一列' },
  { keys: ['1'], text: '焦點所在列：左側譯本較好（再按取消）' },
  { keys: ['2'], text: '焦點所在列：差不多' },
  { keys: ['3'], text: '焦點所在列：右側譯本較好' },
  { keys: ['e'], text: '顯示或隱藏英文原文' },
  { keys: ['b'], text: '開啟或關閉盲測模式' },
];

/** Round 2 has no blind mode; 1/2/3 are the round-2 verdicts. */
const SHORTCUTS_R2: { keys: string[]; text: string }[] = [
  { keys: ['['], text: '上一節' },
  { keys: [']'], text: '下一節（最後一節之後是總覽）' },
  { keys: ['j'], text: '焦點移到下一列' },
  { keys: ['k'], text: '焦點移到上一列' },
  { keys: ['1'], text: '焦點所在列：通順' },
  { keys: ['2'], text: '焦點所在列：尚可' },
  { keys: ['3'], text: '焦點所在列：需修' },
  { keys: ['e'], text: '顯示或隱藏英文原文欄' },
];

export function ShortcutsButton({ round2 = false }: { round2?: boolean }) {
  const list = round2 ? SHORTCUTS_R2 : SHORTCUTS;
  return (
    <Popover>
      <InfoTip content="鍵盤快捷鍵一覽。在文字輸入框內不會觸發。">
        <PopoverTrigger asChild>
          <Button data-testid="shortcuts" variant="ghost" size="sm" className="h-8 shrink-0" aria-label="快捷鍵">
            <Keyboard aria-hidden="true" />
            快捷鍵
          </Button>
        </PopoverTrigger>
      </InfoTip>
      <PopoverContent align="end" className="w-[min(22rem,calc(100vw_-_1.5rem))]">
        <p className="mb-2 text-sm font-semibold">鍵盤快捷鍵</p>
        <dl className="grid gap-2 text-sm">
          {list.map((s) => (
            <div key={s.text} className="grid grid-cols-[5.5rem_minmax(0,1fr)] items-start gap-x-3">
              <dt className="flex flex-wrap gap-1">
                {s.keys.map((k) => (
                  <kbd key={k} className="rounded border border-border bg-muted px-1.5 font-mono text-xs">
                    {k}
                  </kbd>
                ))}
              </dt>
              <dd className="text-muted-foreground">{s.text}</dd>
            </div>
          ))}
        </dl>
      </PopoverContent>
    </Popover>
  );
}
