import type { CompareData, ModelId } from '@/types';
import { MODEL_NAME } from './models';

export type Winner = ModelId | 'tie';

export interface Verdict {
  winner?: Winner | undefined;
  note?: string | undefined;
}

/** Keyed by Row.id. Winners are real model ids, so they survive blind toggles and re-randomising. */
export type VerdictStore = Record<string, Verdict>;

/** First 20 characters of a block, newlines turned into spaces, pipes escaped for a Markdown table cell. */
export function firstChars(md: string | null | undefined, n = 20): string {
  if (!md) return '';
  return md.replace(/\r?\n/g, ' ').slice(0, n).replace(/\|/g, '\\|');
}

function cleanNote(note: string): string {
  return note.replace(/\r?\n/g, ' ').replace(/\|/g, '\\|').trim();
}

export function verdictLabel(w: Winner): string {
  return w === 'tie' ? '差不多' : `${MODEL_NAME[w]} 較好`;
}

export function compareSectionId(a: string, b: string): number {
  return a.localeCompare(b, 'en', { numeric: true });
}

/** Markdown export of every row that has a verdict, ordered by section then row number. */
export function buildVerdictMarkdown(data: CompareData, store: VerdictStore): string {
  const lines: string[] = [
    '# 第 2 章翻譯評語',
    '',
    '| 章節 | 列 | 原文開頭 | 評判 | 備註 |',
    '|---|---|---|---|---|',
  ];
  const sections = [...data.sections].sort((a, b) => compareSectionId(a.id, b.id));
  for (const section of sections) {
    const rows = [...section.rows].sort((a, b) => a.n - b.n);
    for (const row of rows) {
      const verdict = store[row.id];
      if (!verdict?.winner) continue;
      lines.push(
        `| ${section.id} | ${row.n} | ${firstChars(row.en?.md)} | ${verdictLabel(verdict.winner)} | ${cleanNote(verdict.note ?? '')} |`,
      );
    }
  }
  return lines.join('\n') + '\n';
}
