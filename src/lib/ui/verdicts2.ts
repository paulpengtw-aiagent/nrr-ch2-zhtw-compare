import type { R2Data, R2Section, Verdict2 } from '@/types';
import { cleanNote, compareSectionId, openingChars } from './verdicts';

export interface Verdict2Entry {
  verdict?: Verdict2 | undefined;
  note?: string | undefined;
}

/** Keyed by R2Row.id; stored in localStorage under `nrr-verdicts-r2`. */
export type VerdictStore2 = Record<string, Verdict2Entry>;

export type Tally2 = Record<Verdict2, number>;

export function verdictLabel2(v: Verdict2): string {
  return v === 'good' ? '通順' : v === 'ok' ? '尚可' : '需修';
}

export function tallyOf2(section: R2Section, store: VerdictStore2): Tally2 {
  const t: Tally2 = { good: 0, ok: 0, fix: 0 };
  for (const row of section.rows) {
    const v = store[row.id]?.verdict;
    if (v) t[v] += 1;
  }
  return t;
}

export function tally2All(sections: R2Section[], store: VerdictStore2): Tally2 {
  const t: Tally2 = { good: 0, ok: 0, fix: 0 };
  for (const s of sections) {
    const x = tallyOf2(s, store);
    t.good += x.good;
    t.ok += x.ok;
    t.fix += x.fix;
  }
  return t;
}

/** Markdown export for round 2; same table shape as round 1 with a round-2 heading and verdict labels. */
export function buildVerdictMarkdownR2(data: R2Data, store: VerdictStore2): string {
  const lines: string[] = [
    '# 第二輪翻譯評語（Fable 改寫英文 · Gemini 3.6 Flash）',
    '',
    '| 章節 | 列 | 原文開頭 | 評判 | 備註 |',
    '|---|---|---|---|---|',
  ];
  const sections = [...data.sections].sort((a, b) => compareSectionId(a.id, b.id));
  for (const section of sections) {
    const rows = [...section.rows].sort((a, b) => a.n - b.n);
    for (const row of rows) {
      const entry = store[row.id];
      if (!entry?.verdict) continue;
      lines.push(
        `| ${section.id} | ${row.n} | ${openingChars(row.en?.md)} | ${verdictLabel2(entry.verdict)} | ${cleanNote(entry.note ?? '')} |`,
      );
    }
  }
  return lines.join('\n') + '\n';
}
