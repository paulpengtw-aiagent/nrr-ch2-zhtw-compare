#!/usr/bin/env node
// Reads data/ (no network), aligns EN / Kimi / Gemini per chapter file and writes
// src/generated/compare.json (CompareData). Missing model files are allowed.
// Run JSON (data/run/<model>-run.json, shape not final) overrides manual meta field by field when present.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { alignFile, firstHeadingText } from '../src/lib/align/align.mjs';
import { cleanNotes, readRunJson } from './run-json.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const DATA = join(ROOT, 'data');
const OUT = join(ROOT, 'src', 'generated', 'compare.json');

const FILES = [
  '2.0-disruption-ladder.md',
  '2.1-50-percent-degradation.md',
  '2.2-global-cutoff.md',
  '2.3-island-partition.md',
  '2.4-interfaces.md',
];

const MODELS = ['kimi', 'gemini'];

// Chinese section titles (the UI adds the id).
const TITLE_ZH = {
  '2.0': '中斷階梯',
  '2.1': '50% 降載',
  '2.2': '全球斷線',
  '2.3': '島內分割',
  '2.4': '介面',
};

const EMPTY_STATS = { blocks: 0, headings: 0, tables: 0, links: 0, lists: 0 };

const EMPTY_FILE_META = {
  seconds: null,
  secondsNote: null,
  costUsd: null,
  costNote: null,
  tokens: null,
  tokensNote: null,
  retries: null,
  failedAttempts: [],
  structureDiffs: null,
  lint: null,
  glossaryNotes: [],
  topFindings: [],
  notes: '',
  source: 'none',
};

function readOptional(path) {
  return existsSync(path) ? readFileSync(path, 'utf8') : null;
}

function readGlossary(path) {
  const text = readOptional(path);
  return text === null ? [] : cleanNotes(text.split('\n'));
}

// "2.0 The disruption ladder" -> "The disruption ladder"
function titleEnOf(title) {
  return title.replace(/^\s*\d+(?:\.\d+)*[.:、)]?\s*/, '').trim();
}

// Tokens always carry `cached` and `reasoning` (null when the source does not report them).
function normaliseTokens(t) {
  if (!t) return null;
  return { prompt: t.prompt, completion: t.completion, reasoning: t.reasoning ?? null, cached: t.cached ?? null };
}

// Manual values are the base. Run-JSON fields (when present) override them field by field.
// source: 'run-json' when any run-JSON field applied, else the manual source (or 'none').
function buildFileMeta(manual, runFields, glossaryFromFiles) {
  const base = { ...EMPTY_FILE_META, ...manual };
  const merged = { ...base, ...(runFields ?? {}) };
  const applied = Object.keys(runFields ?? {});
  return {
    seconds: merged.seconds ?? null,
    secondsNote: merged.secondsNote ?? null,
    costUsd: merged.costUsd ?? null,
    costNote: merged.costNote ?? null,
    tokens: normaliseTokens(merged.tokens),
    tokensNote: merged.tokensNote ?? null,
    retries: merged.retries ?? null,
    failedAttempts: merged.failedAttempts ?? [],
    structureDiffs: merged.structureDiffs ?? null,
    lint: merged.lint ?? null,
    glossaryNotes: cleanNotes(runFields?.glossaryNotes ?? glossaryFromFiles),
    topFindings: merged.topFindings ?? [],
    notes: merged.notes ?? '',
    source: applied.length ? 'run-json' : (manual.source ?? 'none'),
    applied,
  };
}

const meta = JSON.parse(readFileSync(join(DATA, 'meta.json'), 'utf8'));
const manifestText = readOptional(join(DATA, 'fetch-manifest.json'));
const manifest = manifestText ? JSON.parse(manifestText) : null;

// Run JSON per model (optional). A parse failure or unknown shape is a WARNING, never a crash.
const runByModel = {};
const runMetaByModel = {};
for (const model of MODELS) {
  const text = readOptional(join(DATA, 'run', `${model}-run.json`));
  if (text === null) {
    runByModel[model] = null;
    runMetaByModel[model] = null;
    console.log(`run JSON ${model}: absent`);
    continue;
  }
  let json;
  try {
    json = JSON.parse(text);
  } catch (err) {
    console.warn(`WARNING: ${model} run JSON is not valid JSON (${err.message}); using manual values`);
    runByModel[model] = null;
    runMetaByModel[model] = null;
    continue;
  }
  const result = readRunJson(json, FILES);
  for (const w of result.warnings) console.warn(`WARNING: ${model} run JSON: ${w}`);
  console.log(
    `run JSON ${model}: present (shape=${result.shape}, files with values=${Object.keys(result.byFile).length}, totals=${result.totals ? 'yes' : 'no'})`,
  );
  runByModel[model] = result.byFile;
  runMetaByModel[model] = { totals: result.totals, priceNote: result.priceNote };
}

const outMeta = {
  runDate: meta.runDate ?? '',
  sameInstructions: meta.sameInstructions ?? '',
  sourceUrl: meta.sourceUrl ?? '',
  lintTool: meta.lintTool ?? '',
  structureCheckDesc: meta.structureCheckDesc ?? '',
  models: {},
};

for (const model of MODELS) {
  const mm = meta.models?.[model] ?? {};
  const files = {};
  for (const file of FILES) {
    const base = file.replace(/\.md$/, '');
    const glossaryFromFiles = model === 'gemini' ? readGlossary(join(DATA, 'gemini', `${base}.glossary.txt`)) : [];
    const runFields = runByModel[model]?.[file] ?? null;
    const fm = buildFileMeta(mm.files?.[file] ?? {}, runFields, glossaryFromFiles);
    const { applied, ...fileMeta } = fm;
    files[file] = fileMeta;
    const from = fm.source === 'run-json' ? `run-json (fields: ${applied.join(', ')})` : fm.source;
    console.log(`meta ${model} ${file}: source=${from}`);
  }
  outMeta.models[model] = {
    name: mm.name ?? model,
    shortName: mm.shortName ?? mm.name ?? model,
    how: mm.how ?? '',
    runDetail: mm.runDetail ?? '',
    priceNote: runMetaByModel[model]?.priceNote ?? mm.priceNote ?? null,
    totals: runMetaByModel[model]?.totals ?? null,
    files,
  };
}

const sections = FILES.map((file) => {
  const id = file.match(/^(\d+\.\d+)-/)[1];
  const base = file.replace(/\.md$/, '');
  const texts = {
    en: readOptional(join(DATA, 'en', file)),
    kimi: readOptional(join(DATA, 'kimi', file)),
    gemini: readOptional(join(DATA, 'gemini', file)),
  };

  const { mode, rows, parsed } = alignFile(texts, { idPrefix: id });

  const title =
    firstHeadingText(parsed.en) || firstHeadingText(parsed.kimi) || firstHeadingText(parsed.gemini);
  if (!TITLE_ZH[id]) console.warn(`WARNING: no titleZh for section ${id}`);

  const gFlags = manifest?.files?.gemini?.[file] ?? {};
  const rawGemini = readOptional(join(DATA, 'gemini', 'raw', file));
  const part2 =
    typeof gFlags.part2 === 'boolean'
      ? gFlags.part2
      : existsSync(join(DATA, 'gemini', 'raw', `${base}.part2.md`));
  const sentinel =
    typeof gFlags.sentinel === 'boolean'
      ? gFlags.sentinel
      : rawGemini !== null && /^\s*<<<GLOSSARY-NOTES>>>\s*$/m.test(rawGemini);

  return {
    id,
    file,
    title,
    titleZh: TITLE_ZH[id] ?? '',
    titleEn: titleEnOf(title),
    enStructure: parsed.en?.stats ?? EMPTY_STATS,
    models: {
      kimi: {
        available: texts.kimi !== null,
        structure: parsed.kimi?.stats ?? null,
        glossaryNotes: outMeta.models.kimi.files[file].glossaryNotes,
        part2: false,
        sentinel: false,
      },
      gemini: {
        available: texts.gemini !== null,
        structure: parsed.gemini?.stats ?? null,
        glossaryNotes: outMeta.models.gemini.files[file].glossaryNotes,
        part2,
        sentinel,
      },
    },
    alignMode: mode,
    rows,
  };
});

const data = {
  generatedAt: new Date().toISOString(),
  meta: outMeta,
  sections,
};

mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, `${JSON.stringify(data, null, 2)}\n`);

for (const s of sections) {
  const mismatches = s.rows.filter((r) => r.kind === 'mismatch').length;
  const lengthFlags = s.rows.filter((r) => r.lengthFlag !== null).length;
  const present = ['kimi', 'gemini'].filter((m) => s.models[m].available).join('+') || 'EN only';
  console.log(
    `${s.id} mode=${s.alignMode} rows=${s.rows.length} mismatch=${mismatches} lengthFlags=${lengthFlags} models=${present}`,
  );
}
console.log(`wrote ${OUT.slice(ROOT.length + 1)}`);
