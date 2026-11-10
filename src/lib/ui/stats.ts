import type { FileMeta, Lint, Meta, ModelId, Section, Tokens } from '@/types';
import { MODEL_SHORT } from './models';
import type { VerdictStore } from './verdicts';

export const PENDING = '待補';
export const SUBSCRIPTION = '訂閱方案';
export const MODEL_IDS: ModelId[] = ['kimi', 'gemini'];

export type Tally = Record<ModelId | 'tie', number>;

export function fileMeta(meta: Meta, model: ModelId, file: string): FileMeta | undefined {
  return meta.models[model]?.files?.[file];
}

export function shortName(meta: Meta, model: ModelId): string {
  return meta.models[model]?.shortName || MODEL_SHORT[model];
}

/** Flat-rate plans (for example a web subscription) have no per-request cost. */
export function isSubscription(meta: Meta, model: ModelId): boolean {
  const m = meta.models[model];
  return /訂閱|subscription|plus\s*方案/i.test(`${m?.how ?? ''} ${m?.priceNote ?? ''}`);
}

export function fmtSeconds(v: number | null | undefined): string {
  return v == null ? PENDING : `${v.toFixed(1)} 秒`;
}

export function fmtCost(meta: Meta, model: ModelId, v: number | null | undefined): string {
  if (v != null) return `US$ ${v.toFixed(3)}`;
  return isSubscription(meta, model) ? SUBSCRIPTION : PENDING;
}

export function structureMark(diffs: number | null | undefined): string {
  if (diffs == null) return PENDING;
  return diffs === 0 ? '✓' : `✗ ${diffs}`;
}

export function fmtCount(v: number | null | undefined): string {
  return v == null ? PENDING : v.toLocaleString('zh-TW');
}

export function fmtTokens(t: Tokens | null | undefined): string {
  if (!t) return PENDING;
  const parts = [`輸入 ${fmtCount(t.prompt)}`, `輸出 ${fmtCount(t.completion)}`];
  if (t.reasoning != null) parts.push(`推理 ${fmtCount(t.reasoning)}`);
  return parts.join(' ／ ');
}

export function fmtLint(l: Lint | null | undefined): string {
  return l ? `${l.total} 項` : PENDING;
}

/** Verdict counts keyed by model id (winners are model ids, so pairing does not matter). */
export function tallyOf(section: Section, store: VerdictStore): Tally {
  const t: Tally = { kimi: 0, gemini: 0, tie: 0 };
  for (const row of section.rows) {
    const w = store[row.id]?.winner;
    if (w) t[w] += 1;
  }
  return t;
}

export function sumKnown(values: (number | null | undefined)[]): { sum: number; known: number } {
  let sum = 0;
  let known = 0;
  for (const v of values) {
    if (v != null) {
      sum += v;
      known += 1;
    }
  }
  return { sum, known };
}

/** Strips list bullets and placeholder entries such as "- none". */
export function cleanNotes(notes: string[] | null | undefined): string[] {
  return (notes ?? [])
    .map((n) => n.replace(/^\s*[-*]\s*/, '').trim())
    .filter((n) => n.length > 0 && !/^(none|無|n\/a)$/i.test(n));
}
