import type { R3Data, R3Model, R3Section } from '@/types';
import { cleanNote, compareSectionId, openingChars } from './verdicts';

/** Round-3 pick for a row: the model id judged best, or 'tie'. */
export type Pick3 = string;

export interface Verdict3Entry {
  pick?: Pick3 | undefined;
  note?: string | undefined;
}

/** Keyed by R3Row.id; stored in localStorage under `nrr-verdicts-r3`. */
export type VerdictStore3 = Record<string, Verdict3Entry>;

export type Tally3 = Record<string, number>; // model id -> wins, plus 'tie'

export const TIE = 'tie';
export const LETTERS = ['A', 'B', 'C', 'D'];

/** Distinct, mid-lightness hues that read on both themes. Blind mode uses neutral tones instead. */
export const R3_COLORS: Record<string, string> = {
  'gemini-4-neon-high': 'oklch(0.6 0.14 250)',
  'gemini-4-carbon-high': 'oklch(0.58 0.12 155)',
  'gemini-4-argon-high': 'oklch(0.62 0.15 45)',
  'gemini-3.8-flash-high': 'oklch(0.58 0.15 320)',
};
export const PUBLISHED_COLOR = 'var(--neutral-a)';
export const BLIND_COLOR = 'var(--neutral-a)';

export function emptyTally(models: R3Model[]): Tally3 {
  const t: Tally3 = { [TIE]: 0 };
  for (const m of models) t[m.id] = 0;
  return t;
}

export function tallyOf3(section: R3Section, store: VerdictStore3, models: R3Model[]): Tally3 {
  const t = emptyTally(models);
  for (const row of section.rows) {
    const p = store[row.id]?.pick;
    if (p && p in t) t[p] += 1;
  }
  return t;
}

export function tally3All(sections: R3Section[], store: VerdictStore3, models: R3Model[]): Tally3 {
  const t = emptyTally(models);
  for (const s of sections) {
    const x = tallyOf3(s, store, models);
    for (const k of Object.keys(t)) t[k] += x[k] ?? 0;
  }
  return t;
}

/** Display label of a model in a section: its short name, or 譯本 A–D in blind mode. */
export function labelOf(section: R3Section | undefined, modelId: string, models: R3Model[], blind: boolean): string {
  if (modelId === '*') return '四個模型';
  if (blind && section) {
    const i = section.blindOrder.indexOf(modelId);
    return `譯本 ${LETTERS[i] ?? '?'}`;
  }
  return models.find((m) => m.id === modelId)?.label ?? modelId;
}

/** Model ids in display order: data order, or blind letter order. */
export function orderOf(section: R3Section | undefined, models: R3Model[], blind: boolean): string[] {
  return blind && section ? section.blindOrder : models.map((m) => m.id);
}

/** Markdown export (always with real model names, so it is useful after the blind pass). */
export function buildVerdictMarkdownR3(data: R3Data, store: VerdictStore3): string {
  const name = (id: string) => (id === TIE ? '差不多' : (data.meta.models.find((m) => m.id === id)?.label ?? id));
  const lines = ['# 第三輪翻譯評語（四個 Gemini 模型 · Antigravity）', '', '| 章節 | 列 | 原文開頭 | 較好 | 備註 |', '|---|---|---|---|---|'];
  const sections = [...data.sections].sort((a, b) => compareSectionId(a.id, b.id));
  for (const s of sections) {
    for (const row of s.rows) {
      const e = store[row.id];
      if (!e?.pick && !e?.note) continue;
      lines.push(`| ${s.id} | ${row.n} | ${openingChars(row.en?.md)} | ${e.pick ? name(e.pick) : ''} | ${cleanNote(e.note ?? '')} |`);
    }
  }
  return lines.join('\n') + '\n';
}
