import type { ModelId } from '@/types';

/** Left/right assignment of the two models for one section. */
export interface Pair {
  left: ModelId;
  right: ModelId;
}

export type Side = 'left' | 'right';

export const DEFAULT_PAIR: Pair = { left: 'kimi', right: 'gemini' };

export const MODEL_NAME: Record<ModelId, string> = {
  kimi: 'Kimi K3.1 Pro',
  gemini: 'Gemini 3.6 Flash',
};

/** Fallback short names; the live value comes from meta.models[m].shortName. */
export const MODEL_SHORT: Record<ModelId, string> = {
  kimi: 'Kimi',
  gemini: 'Gemini',
};

/** CSS custom properties are defined in src/index.css. */
export const MODEL_COLOR: Record<ModelId, string> = {
  kimi: 'var(--kimi)',
  gemini: 'var(--gemini)',
};

export const TITLE_NAMED = '第 2 章繁中翻譯比較：Kimi K3.1 Pro × Gemini 3.6 Flash';
export const TITLE_BLIND = '第 2 章繁中翻譯比較：譯本 A × 譯本 B';

/** Label shown for a column. Blind mode never reveals the model. */
export function sideLabel(side: Side, model: ModelId, blind: boolean): string {
  if (blind) return side === 'left' ? '譯本 A' : '譯本 B';
  return MODEL_NAME[model];
}

/** Colour for a column. Blind mode uses two neutral greys. */
export function sideColor(side: Side, model: ModelId, blind: boolean): string {
  if (blind) return side === 'left' ? 'var(--neutral-a)' : 'var(--neutral-b)';
  return MODEL_COLOR[model];
}
