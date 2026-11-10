#!/usr/bin/env node
// Reads data/ (no network), aligns EN / Kimi / Gemini per chapter file and writes
// src/generated/compare.json (CompareData). Missing model files are allowed.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { alignFile, firstHeadingText } from '../src/lib/align/align.mjs';

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

const EMPTY_STATS = { blocks: 0, headings: 0, tables: 0, links: 0, lists: 0 };

function readOptional(path) {
  return existsSync(path) ? readFileSync(path, 'utf8') : null;
}

function readNotes(path) {
  const text = readOptional(path);
  if (text === null) return [];
  return text.split('\n').filter((l) => l.trim() !== '');
}

const meta = JSON.parse(readFileSync(join(DATA, 'meta.json'), 'utf8'));
const manifestText = readOptional(join(DATA, 'fetch-manifest.json'));
const manifest = manifestText ? JSON.parse(manifestText) : null;

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
    enStructure: parsed.en?.stats ?? EMPTY_STATS,
    models: {
      kimi: {
        available: texts.kimi !== null,
        structure: parsed.kimi?.stats ?? null,
        glossaryNotes: [],
        part2: false,
        sentinel: false,
      },
      gemini: {
        available: texts.gemini !== null,
        structure: parsed.gemini?.stats ?? null,
        glossaryNotes: readNotes(join(DATA, 'gemini', `${base}.glossary.txt`)),
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
  meta,
  sections,
};

mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, `${JSON.stringify(data, null, 2)}\n`);

for (const s of sections) {
  const mismatches = s.rows.filter((r) => r.kind === 'mismatch').length;
  const present = ['kimi', 'gemini'].filter((m) => s.models[m].available).join('+') || 'EN only';
  console.log(
    `${s.id} mode=${s.alignMode} rows=${s.rows.length} mismatch=${mismatches} models=${present}`,
  );
}
console.log(`wrote ${OUT.slice(ROOT.length + 1)}`);
