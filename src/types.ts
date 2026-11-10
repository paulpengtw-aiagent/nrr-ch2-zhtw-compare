export type ModelId = 'kimi' | 'gemini';

export interface Block {
  type: string;
  depth?: number;
  md: string;
}

export interface StructStats {
  blocks: number;
  headings: number;
  tables: number;
  links: number;
  lists: number;
}

export interface Row {
  n: number;
  id: string;
  kind: 'aligned' | 'mismatch';
  en: Block | null;
  kimi: Block | null;
  gemini: Block | null;
  chars: { en: number | null; kimi: number | null; gemini: number | null }; // visible chars of the block after stripping markdown syntax & whitespace
  lengthFlag: { ratio: number } | null; // set when both kimi & gemini present and CJK-char count of one < 60% or > 170% of the other (ratio = kimiCjk/geminiCjk, 2 decimals); only when the smaller has >= 8 CJK chars
}

export interface ModelSection {
  available: boolean;
  structure: StructStats | null;
  glossaryNotes: string[];
  part2: boolean;
  sentinel: boolean;
}

export interface Section {
  id: string;
  file: string;
  title: string; // EN title as before
  titleZh: string;
  titleEn: string;
  enStructure: StructStats;
  models: Record<ModelId, ModelSection>;
  alignMode: 'index' | 'section' | 'single';
  rows: Row[];
}

export interface Tokens {
  prompt: number;
  completion: number;
  reasoning: number | null;
}

export interface Lint {
  total: number;
  translationese: number | null;
  mainland: number | null;
  other: number | null;
}

export interface FileMeta {
  seconds: number | null;
  secondsNote: string | null;
  costUsd: number | null;
  costNote: string | null;
  tokens: Tokens | null;
  structureDiffs: number | null;
  lint: Lint | null;
  glossaryNotes: string[];
  topFindings: string[];
  notes: string;
  source: 'run-json' | 'manual' | 'none';
}

export interface ModelMeta {
  name: string;
  shortName: string;
  how: string;
  runDetail: string;
  priceNote: string | null;
  files: Record<string, FileMeta>;
}

export interface Meta {
  runDate: string;
  sameInstructions: string;
  sourceUrl: string;
  lintTool: string;
  structureCheckDesc: string;
  models: Record<ModelId, ModelMeta>;
}

export interface CompareData {
  generatedAt: string;
  meta: Meta;
  sections: Section[];
}
