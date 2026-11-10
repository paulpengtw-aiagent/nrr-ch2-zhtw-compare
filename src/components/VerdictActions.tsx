import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Check, ClipboardCopy, Eraser } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { copyText } from '@/lib/ui/clipboard';
import { InfoTip } from './InfoTip';

interface CopyVerdictsButtonProps {
  /** Evaluated on click so the table always reflects the current verdicts. */
  getMarkdown: () => string;
  className?: string;
}

export function CopyVerdictsButton({ getMarkdown, className }: CopyVerdictsButtonProps) {
  const [copied, setCopied] = useState(false);
  const timer = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearTimeout(timer.current), []);

  const onCopy = async () => {
    const ok = await copyText(getMarkdown());
    if (!ok) {
      toast.error('無法寫入剪貼簿，請稍後再試');
      return;
    }
    setCopied(true);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setCopied(false), 1800);
  };

  return (
    <InfoTip content="以 Markdown 表格複製所有已評判的列（章節、列號、原文開頭、評判與備註）。">
      <Button
        data-testid="copy-verdicts"
        variant="outline"
        size="sm"
        onClick={onCopy}
        className={className ?? 'h-8 shrink-0'}
      >
        <AnimatePresence mode="wait" initial={false}>
          {copied ? (
            <motion.span
              key="copied"
              className="inline-flex items-center gap-1.5"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{ duration: 0.18 }}
            >
              <Check aria-hidden="true" />
              已複製
            </motion.span>
          ) : (
            <motion.span
              key="copy"
              className="inline-flex items-center gap-1.5"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
            >
              <ClipboardCopy aria-hidden="true" />
              複製評語
            </motion.span>
          )}
        </AnimatePresence>
      </Button>
    </InfoTip>
  );
}

interface ClearVerdictsButtonProps {
  onRequest: () => void;
  className?: string;
}

/** Opens the confirmation dialog; the dialog itself is rendered once by the app shell. */
export function ClearVerdictsButton({ onRequest, className }: ClearVerdictsButtonProps) {
  return (
    <InfoTip content="清除所有章節的評判與備註。會先要求確認，且無法復原。">
      <Button data-testid="clear-verdicts" variant="ghost" size="sm" onClick={onRequest} className={className ?? 'h-8 shrink-0'}>
        <Eraser aria-hidden="true" />
        清除
      </Button>
    </InfoTip>
  );
}

interface ClearDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
}

export function ClearDialog({ open, onOpenChange, onConfirm }: ClearDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogTitle>確定清除全部評語？</AlertDialogTitle>
        <AlertDialogDescription>
          所有章節的評判與備註都會從這個瀏覽器移除，無法復原。若還需要，請先複製評語。
        </AlertDialogDescription>
        <div className="flex justify-end gap-2 pt-2">
          <InfoTip content="關閉此確認視窗，保留所有評語。">
            <AlertDialogCancel>取消</AlertDialogCancel>
          </InfoTip>
          <InfoTip content="移除全部章節的評判與備註，無法復原。">
            <AlertDialogAction onClick={onConfirm}>清除全部</AlertDialogAction>
          </InfoTip>
        </div>
      </AlertDialogContent>
    </AlertDialog>
  );
}
