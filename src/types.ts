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
  cached: number | null; // prompt tokens served from the provider cache (run JSON only)
}

export interface Lint {
  total: number;
  translationese: number | null;
  mainland: number | null;
  other: number | null;
}

/** One attempt that did not produce the accepted translation (run JSON only). */
export interface FailedAttempt {
  attempt: number; // 1-based position in the file's attempts
  seconds: number | null;
  costUsd: number | null; // full-rate cost of this attempt
  kind: string;
  detail: string;
  rawOutput: string | null;
}

export interface FileMeta {
  seconds: number | null; // accepted attempt only
  secondsNote: string | null;
  costUsd: number | null; // full-rate upper bound; includes failed attempts
  costNote: string | null;
  tokens: Tokens | null; // includes failed attempts
  tokensNote: string | null; // flat-rate runs: stands in for the tokens when they are null
  retries: number | null; // null when the source has no retry count (Gemini, manual)
  failedAttempts: FailedAttempt[];
  structureDiffs: number | null;
  lint: Lint | null;
  glossaryNotes: string[];
  topFindings: string[];
  notes: string;
  source: 'run-json' | 'manual' | 'none';
}

/** Run-wide totals from the run JSON; wall clock and cost include failed attempts. */
export interface ModelTotals {
  seconds: number | null;
  costUsd: number | null; // full-rate upper bound
  costCachedUsd: number | null;
  requests: number | null;
  failedRequests: number | null;
  lint: number | null;
  tokens: Tokens | null; // run-wide counts, failed attempts included
}

export interface ModelMeta {
  name: string;
  shortName: string;
  how: string;
  runDetail: string;
  priceNote: string | null;
  totals: ModelTotals | null;
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

// ---------------------------------------------------------------------------
// Round 2: Fable-rewritten English vs Gemini 3.6 Flash zh-TW (one model, no blind mode).
// Written by scripts/build-data.mjs (round-2 part) to src/generated/compare-r2.json.
// ---------------------------------------------------------------------------

/** Round-2 verdict; stored per row in localStorage key `nrr-verdicts-r2`. */
export type Verdict2 = 'good' | 'ok' | 'fix';

export interface R2Row {
  n: number;
  id: string; // same pattern as round 1, e.g. '2.0-1'
  kind: 'aligned' | 'mismatch';
  en: Block | null;
  gemini: Block | null;
  chars: { en: number | null; gemini: number | null }; // visible chars (no whitespace), as in round 1
  /** Set when the Gemini CJK count, relative to the English visible-char count (normalised by the round median), falls outside 0.60..1.70. */
  lengthFlag: { ratio: number } | null;
  /** Known-problem notes attached by build-data from data/r2/meta.json `rowNotes`. */
  notes: string[];
}

export interface R2Section {
  id: string; // '2.0'
  file: string; // '2.0-disruption-ladder.md'
  titleZh: string;
  titleEn: string;
  enStructure: StructStats;
  geminiStructure: StructStats | null;
  alignMode: 'index' | 'section' | 'single';
  rows: R2Row[];
  /** New run: data/r2/check/lint-new.txt. */
  lint: Lint;
  /** CJK ideographs in the new Gemini translation (data/r2/gemini). */
  han: number;
  /** Old English run: data/r2/check/lint-old.txt. */
  oldLint: Lint;
  /** CJK ideographs in the round-1 Gemini translation (the old English run). */
  oldHan: number;
  /** Hand-written timing from data/r2/meta.json (run-log.md). */
  seconds: number | null;
  attemptNote: string;
}

export interface R2Meta {
  runDate: string;
  enSource: { repo: string; sha: string; url: string };
  geminiRun: { repo: string; sha: string; url: string };
  model: { name: string; shortName: string; how: string; runDetail: string };
  timingNote: string;
  lintCaveat: string;
  lintTool: string;
}

export interface R2Data {
  generatedAt: string;
  meta: R2Meta;
  /** Raw data/r2/check/check-output.txt (the --check run). */
  checkOutput: string;
  /** Parsed from the summary line "N warning(s)" in checkOutput. */
  checkWarnings: number;
  sections: R2Section[];
}
