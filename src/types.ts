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
  title: string;
  enStructure: StructStats;
  models: Record<ModelId, ModelSection>;
  alignMode: 'index' | 'section' | 'single';
  rows: Row[];
}

export interface FileMeta {
  seconds: number | null;
  costUsd: number | null;
  tokens: number | { input: number; output: number } | null;
  structureCheck: string | null;
  lintFindings: number | null;
  notes: string;
}

export interface ModelMeta {
  name: string;
  how: string;
  files: Record<string, FileMeta>;
}

export interface Meta {
  runDate: string;
  sameInstructions: string;
  sourceUrl: string;
  models: Record<ModelId, ModelMeta>;
}

export interface CompareData {
  generatedAt: string;
  meta: Meta;
  sections: Section[];
}
