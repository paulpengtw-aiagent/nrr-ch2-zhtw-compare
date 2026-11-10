// Round 2: Fable 5.2 rewrite of the English (pinned SHA) vs Gemini 3.6 Flash zh-TW (pinned SHA).
//
// fetchRound2() is called by scripts/fetch-data.mjs and uses that script's ghRaw helper (gh api).
// buildRound2() is called by scripts/build-data.mjs. It reads data/r2 and data/gemini only (no network)
// and returns the R2Data object that build-data.mjs writes to src/generated/compare-r2.json.
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { alignFile, cjkCount, firstHeadingText } from '../src/lib/align/align.mjs';

export const R2_FILES = [
  '2.0-disruption-ladder.md',
  '2.1-50-percent-degradation.md',
  '2.2-global-cutoff.md',
  '2.3-island-partition.md',
  '2.4-interfaces.md',
];

const EN_REPO = 'paulpengtw/network-resilience-report';
const EN_REF = '9b80936876b94bcdec36fd5a07b815d74fe7df8d';
const GEMINI_REPO = 'paulpengtw-aiagent/gemini-web-runs';
const GEMINI_REF = '6550aa39c459483478f3227d4a715fedc8241052';
const GEMINI_DIR = '2026-11-10-nrr-ch2-plain-zhtw';
const CHECK_FILES = ['README.md', 'check-output.txt', 'lint-new.txt', 'lint-old.txt'];

// Round-2 length flag. Round 1 compares Kimi CJK with Gemini CJK. Round 2 has no second translation, so
// the ratio is (Gemini CJK count / English visible-char count), divided by the median of that ratio over
// the whole round. A row is flagged when the normalised ratio is outside [LENGTH_LOW, LENGTH_HIGH].
const MIN_CJK_FOR_FLAG = 8;
const LENGTH_LOW = 0.6;
const LENGTH_HIGH = 1.7;

const EMPTY_STATS = { blocks: 0, headings: 0, tables: 0, links: 0, lists: 0 };
const EMPTY_LINT = { total: 0, translationese: 0, mainland: 0, other: 0 };

function writeText(path, text) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, text);
}

function removeIfExists(path) {
  if (existsSync(path)) rmSync(path);
}

function readOptional(path) {
  return existsSync(path) ? readFileSync(path, 'utf8') : null;
}

/**
 * Fetches the round-2 inputs at the pinned SHAs into data/r2/ and writes data/r2/fetch-manifest.json.
 * A 404 removes the local copy; any other error keeps it and is listed in manifest.errors (never throws).
 */
export function fetchRound2({ ghRaw, dataDir }) {
  const r2Dir = join(dataDir, 'r2');
  const errors = [];
  const manifest = {
    fetchedAt: new Date().toISOString(),
    pins: {
      en: { repo: EN_REPO, ref: EN_REF, path: 'report/ch2' },
      gemini: { repo: GEMINI_REPO, ref: GEMINI_REF, dir: GEMINI_DIR },
    },
    files: { en: {}, gemini: {}, run: {}, check: {} },
    errors,
  };

  const store = (result, localPath, label) => {
    if (result.status === 'ok') {
      writeText(localPath, result.text);
      return true;
    }
    if (result.status === 'missing') {
      removeIfExists(localPath);
      return false;
    }
    errors.push(`${label}: ${result.message} (kept local copy)`);
    return false;
  };

  for (const file of R2_FILES) {
    manifest.files.en[file] = store(
      ghRaw(EN_REPO, `report/ch2/${file}`, EN_REF),
      join(r2Dir, 'en', file),
      `r2 en/${file}`,
    );
    manifest.files.gemini[file] = store(
      ghRaw(GEMINI_REPO, `${GEMINI_DIR}/check/parsed/${file}`, GEMINI_REF),
      join(r2Dir, 'gemini', file),
      `r2 gemini/${file}`,
    );
  }
  manifest.files.run['run-log.md'] = store(
    ghRaw(GEMINI_REPO, `${GEMINI_DIR}/output/gemini-3.6-flash/run-log.md`, GEMINI_REF),
    join(r2Dir, 'run', 'run-log.md'),
    'r2 run/run-log.md',
  );
  for (const name of CHECK_FILES) {
    manifest.files.check[name] = store(
      ghRaw(GEMINI_REPO, `${GEMINI_DIR}/check/${name}`, GEMINI_REF),
      join(r2Dir, 'check', name),
      `r2 check/${name}`,
    );
  }

  mkdirSync(r2Dir, { recursive: true });
  writeFileSync(join(r2Dir, 'fetch-manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);

  const okCount = (o) => Object.values(o).filter(Boolean).length;
  console.log(
    `round 2: en ${okCount(manifest.files.en)}/${R2_FILES.length}, gemini ${okCount(manifest.files.gemini)}/${R2_FILES.length}, ` +
      `run-log ${okCount(manifest.files.run)}/1, check ${okCount(manifest.files.check)}/${CHECK_FILES.length}, errors ${errors.length}`,
  );
  for (const e of errors) console.log(`  - ${e}`);
  console.log('wrote data/r2/fetch-manifest.json');
  return manifest;
}

/** Lint lines: `file:line:col:W|I:category:message`. translationese -> translationese, cross_strait -> mainland, else other. */
function parseLint(text, label) {
  const byFile = new Map();
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trimEnd();
    if (line === '') continue;
    const parts = line.split(':');
    if (parts.length < 5) {
      console.warn(`WARNING: ${label}: unparsed lint line: ${line.slice(0, 80)}`);
      continue;
    }
    const file = parts[0];
    const category = parts[4];
    const bucket = byFile.get(file) ?? { total: 0, translationese: 0, mainland: 0, other: 0 };
    bucket.total += 1;
    if (category === 'translationese') bucket.translationese += 1;
    else if (category === 'cross_strait') bucket.mainland += 1;
    else bucket.other += 1;
    byFile.set(file, bucket);
  }
  return byFile;
}

/**
 * Builds the R2Data object from data/r2 (inputs fetched by fetchRound2) and data/gemini (round-1 Gemini,
 * i.e. the old English run, used for the old-vs-new Han counts). `titleZh` maps section id -> Chinese title and
 * `titleEnOf` is build-data's English-title helper, so round 2 titles follow the same rules as round 1.
 */
export function buildRound2({ root, files, titleZh, titleEnOf }) {
  const dataDir = join(root, 'data');
  const r2Dir = join(dataDir, 'r2');
  const meta = JSON.parse(readFileSync(join(r2Dir, 'meta.json'), 'utf8'));
  const checkOutput = readOptional(join(r2Dir, 'check', 'check-output.txt')) ?? '';
  const lintNewText = readOptional(join(r2Dir, 'check', 'lint-new.txt')) ?? '';
  const lintOldText = readOptional(join(r2Dir, 'check', 'lint-old.txt')) ?? '';
  // A file with no lint lines (2.4 has 0 findings) is normal; only an empty lint file is a problem.
  if (lintNewText.trim() === '') console.warn('WARNING: round 2 lint-new.txt missing or empty (lint counts will be 0)');
  if (lintOldText.trim() === '') console.warn('WARNING: round 2 lint-old.txt missing or empty (old lint counts will be 0)');
  const lintNew = parseLint(lintNewText, 'lint-new.txt');
  const lintOld = parseLint(lintOldText, 'lint-old.txt');

  const drafts = files.map((file) => {
    const id = file.match(/^(\d+\.\d+)-/)[1];
    const en = readOptional(join(r2Dir, 'en', file));
    const gemini = readOptional(join(r2Dir, 'gemini', file));
    if (en === null || gemini === null) {
      console.warn(`WARNING: round 2 ${file}: missing ${[en === null && 'en', gemini === null && 'gemini'].filter(Boolean).join(',')}`);
    }
    // Same align code as round 1; kimi is absent, so the column list is [en, gemini].
    const { mode, rows, parsed } = alignFile({ en, gemini }, { idPrefix: id });
    const title = firstHeadingText(parsed.en) || firstHeadingText(parsed.gemini);
    if (!titleZh[id]) console.warn(`WARNING: no titleZh for section ${id}`);

    const fileMeta = meta.files?.[file] ?? {};
    const oldGemini = readOptional(join(dataDir, 'gemini', file));
    if (oldGemini === null) console.warn(`WARNING: round 2 ${file}: round-1 Gemini file missing (oldHan = 0)`);
    const lint = lintNew.get(file);
    const oldLint = lintOld.get(file);

    return {
      id,
      file,
      mode,
      rows,
      titleZh: titleZh[id] ?? '',
      titleEn: titleEnOf(title),
      enStructure: parsed.en?.stats ?? EMPTY_STATS,
      geminiStructure: parsed.gemini?.stats ?? null,
      lint: lint ?? { ...EMPTY_LINT },
      han: cjkCount(gemini ?? ''),
      oldLint: oldLint ?? { ...EMPTY_LINT },
      oldHan: cjkCount(oldGemini ?? ''),
      seconds: fileMeta.seconds ?? null,
      attemptNote: fileMeta.attemptNote ?? '',
    };
  });

  // Ratio of Gemini CJK to English visible chars, per aligned row with both blocks present.
  const rawOf = (row) => {
    if (!row.en || !row.gemini) return null;
    const enChars = row.chars.en ?? 0;
    const cjk = cjkCount(row.gemini.md);
    if (enChars <= 0 || cjk < MIN_CJK_FOR_FLAG) return null;
    return cjk / enChars;
  };
  const raws = [];
  for (const d of drafts) {
    for (const row of d.rows) {
      const raw = rawOf(row);
      if (raw !== null) raws.push(raw);
    }
  }
  raws.sort((a, b) => a - b);
  const mid = Math.floor(raws.length / 2);
  const median = raws.length === 0 ? null : raws.length % 2 ? raws[mid] : (raws[mid - 1] + raws[mid]) / 2;
  if (median === null) console.warn('WARNING: round 2 length flags: no comparable rows, no flags set');
  else console.log(`round 2 length flags: median Gemini-CJK / EN-chars ratio ${median.toFixed(4)} over ${raws.length} rows`);

  const sections = drafts.map((d) => ({
    id: d.id,
    file: d.file,
    titleZh: d.titleZh,
    titleEn: d.titleEn,
    enStructure: d.enStructure,
    geminiStructure: d.geminiStructure,
    alignMode: d.mode,
    rows: d.rows.map((row) => {
      const raw = rawOf(row);
      let lengthFlag = null;
      if (raw !== null && median !== null) {
        const ratio = raw / median;
        if (ratio < LENGTH_LOW || ratio > LENGTH_HIGH) lengthFlag = { ratio: Number(ratio.toFixed(2)) };
      }
      return {
        n: row.n,
        id: row.id,
        kind: row.kind,
        en: row.en,
        gemini: row.gemini,
        chars: { en: row.chars.en, gemini: row.chars.gemini },
        lengthFlag,
        notes: [],
      };
    }),
    lint: d.lint,
    han: d.han,
    oldLint: d.oldLint,
    oldHan: d.oldHan,
    seconds: d.seconds,
    attemptNote: d.attemptNote,
  }));

  // Known-problem notes: each rule attaches its text once to every row of its section whose field contains a substring.
  for (const rule of meta.rowNotes ?? []) {
    let hits = 0;
    for (const s of sections) {
      if (s.id !== rule.section) continue;
      for (const row of s.rows) {
        const hay = rule.field === 'en' ? row.en?.md : row.gemini?.md;
        if (!hay || !rule.contains.some((c) => hay.includes(c))) continue;
        hits += 1;
        if (!row.notes.includes(rule.text)) row.notes.push(rule.text);
      }
    }
    if (hits === 0) {
      console.warn(`WARNING: round 2 row note matched no row (section ${rule.section}, field ${rule.field}): ${rule.contains.join(' | ')}`);
    }
  }

  for (const s of sections) {
    const mismatch = s.rows.filter((r) => r.kind === 'mismatch').length;
    const flags = s.rows.filter((r) => r.lengthFlag).length;
    const notes = s.rows.reduce((n, r) => n + r.notes.length, 0);
    console.log(
      `round 2 ${s.id} mode=${s.alignMode} rows=${s.rows.length} mismatch=${mismatch} lengthFlags=${flags} notes=${notes} ` +
        `han=${s.han} lint=${s.lint.total}`,
    );
  }

  const summary = checkOutput.match(/(\d+)\s+warning\(s\)/);
  const checkWarnings = summary
    ? Number(summary[1])
    : checkOutput.split(/\r?\n/).filter((l) => l.startsWith('WARN ')).length;

  return {
    generatedAt: new Date().toISOString(),
    meta: {
      runDate: meta.runDate ?? '',
      enSource: meta.enSource,
      geminiRun: meta.geminiRun,
      model: meta.model,
      timingNote: meta.timingNote ?? '',
      lintCaveat: meta.lintCaveat ?? '',
      lintTool: meta.lintTool ?? '',
    },
    checkOutput,
    checkWarnings,
    sections,
  };
}
