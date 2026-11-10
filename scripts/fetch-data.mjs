#!/usr/bin/env node
// Re-runnable fetch of chapter-2 sources (EN), Kimi translations and Gemini replies via `gh api`.
// A missing remote file (HTTP 404) is recorded as missing and its local copy is removed.
// Other errors keep the local copy and are listed in manifest.errors.
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { processGemini } from './gemini-process.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const DATA = join(ROOT, 'data');

const FILES = [
  '2.0-disruption-ladder.md',
  '2.1-50-percent-degradation.md',
  '2.2-global-cutoff.md',
  '2.3-island-partition.md',
  '2.4-interfaces.md',
];

const EN_REPO = 'paulpengtw/network-resilience-report';
const EN_REF = 'main';
const KIMI_REPO = 'paulpengtw/network-resilience-report';
const KIMI_REF = 'zhtw-compare-ch2';
const GEMINI_REPO = 'paulpengtw-aiagent/gemini-web-runs';
const GEMINI_DIR = '2026-11-10-nrr-ch2-zhtw/output/gemini-3.6-flash';

function ghRaw(repo, path, ref) {
  const endpoint = ref ? `repos/${repo}/contents/${path}?ref=${ref}` : `repos/${repo}/contents/${path}`;
  try {
    const text = execFileSync('gh', ['api', endpoint, '-H', 'Accept: application/vnd.github.raw'], {
      encoding: 'utf8',
      maxBuffer: 64 * 1024 * 1024,
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    return { status: 'ok', text };
  } catch (err) {
    if (err.code === 'ENOENT') throw new Error('gh CLI not found on PATH');
    const msg = String(err.stderr || err.message || '').trim();
    if (/HTTP 404|Not Found/i.test(msg)) return { status: 'missing' };
    return { status: 'error', message: msg.split('\n')[0] || 'unknown error' };
  }
}

function writeText(path, text) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, text);
}

function removeIfExists(path) {
  if (existsSync(path)) rmSync(path);
}

const errors = [];
const manifest = {
  fetchedAt: new Date().toISOString(),
  files: { en: {}, kimi: {}, gemini: {} },
  errors,
};

// Simple one-file fetch (EN / Kimi). Returns true when the remote file is present.
function storeSimple(result, localPath, label) {
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
}

for (const file of FILES) {
  // EN source
  const enResult = ghRaw(EN_REPO, `report/ch2/${file}`, EN_REF);
  manifest.files.en[file] = storeSimple(enResult, join(DATA, 'en', file), `en/${file}`);

  // Kimi translation (no glossary sentinel expected; stored as-is)
  const kimiResult = ghRaw(KIMI_REPO, `i18n/zh-TW/report/ch2/${file}`, KIMI_REF);
  manifest.files.kimi[file] = storeSimple(kimiResult, join(DATA, 'kimi', file), `kimi/${file}`);

  // Gemini: part 1 and optional part 2, numbered 01..05 in FILES order.
  const idx = FILES.indexOf(file) + 1;
  const base = file.replace(/\.md$/, '');
  const gDir = join(DATA, 'gemini');
  const rawDir = join(gDir, 'raw');
  const p1Local = join(gDir, file);
  const p1RawLocal = join(rawDir, file);
  const p2RawLocal = join(rawDir, `${base}.part2.md`);
  const glossaryLocal = join(gDir, `${base}.glossary.txt`);

  const g1 = ghRaw(GEMINI_REPO, `${GEMINI_DIR}/0${idx}-${file}`, null);
  const g2 = ghRaw(GEMINI_REPO, `${GEMINI_DIR}/0${idx}-${base}.part2.md`, null);

  if (g1.status === 'missing') {
    for (const p of [p1Local, p1RawLocal, p2RawLocal, glossaryLocal]) removeIfExists(p);
    if (g2.status === 'ok') errors.push(`gemini/${file}: part2 exists without part1 (ignored)`);
    manifest.files.gemini[file] = { present: false, part2: false, sentinel: false, fenceStripped: false };
    continue;
  }
  if (g1.status === 'error') {
    errors.push(`gemini/${file}: ${g1.message} (kept local copy)`);
    manifest.files.gemini[file] = { present: false, part2: false, sentinel: false, fenceStripped: false };
    continue;
  }

  writeText(p1RawLocal, g1.text);
  const part1 = processGemini(g1.text);
  let translation = part1.translation;
  let notes = [...part1.notes];
  let sentinel = part1.sentinel;
  let fenceStripped = part1.fenceStripped;

  let part2Text = null;
  if (g2.status === 'ok') {
    writeText(p2RawLocal, g2.text);
    part2Text = g2.text;
  } else if (g2.status === 'missing') {
    removeIfExists(p2RawLocal);
  } else {
    errors.push(`gemini/${base}.part2.md: ${g2.message} (using local raw copy if present)`);
    if (existsSync(p2RawLocal)) part2Text = readFileSync(p2RawLocal, 'utf8');
  }

  if (part2Text !== null) {
    const part2 = processGemini(part2Text);
    translation = `${translation}\n${part2.translation}`;
    notes = notes.concat(part2.notes);
    sentinel = sentinel && part2.sentinel;
    fenceStripped = fenceStripped && part2.fenceStripped;
  }

  writeText(p1Local, translation);
  writeText(glossaryLocal, notes.length ? `${notes.join('\n')}\n` : '');
  manifest.files.gemini[file] = {
    present: true,
    part2: part2Text !== null,
    sentinel,
    fenceStripped,
  };
}

mkdirSync(join(DATA), { recursive: true });
writeFileSync(join(DATA, 'fetch-manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);

// Summary table
const yn = (v) => (v ? 'yes' : 'no');
const header = ['file', 'EN', 'Kimi', 'Gemini', 'part2', 'sentinel', 'fence'];
const body = FILES.map((f) => {
  const g = manifest.files.gemini[f];
  return [
    f,
    yn(manifest.files.en[f]),
    yn(manifest.files.kimi[f]),
    yn(g.present),
    g.present ? yn(g.part2) : '-',
    g.present ? yn(g.sentinel) : '-',
    g.present ? yn(g.fenceStripped) : '-',
  ];
});
const widths = header.map((h, i) => Math.max(h.length, ...body.map((r) => r[i].length)));
const fmt = (cells) => cells.map((c, i) => c.padEnd(widths[i])).join('  ').trimEnd();
console.log(`fetchedAt: ${manifest.fetchedAt}`);
console.log(fmt(header));
for (const row of body) console.log(fmt(row));
if (errors.length) {
  console.log('errors:');
  for (const e of errors) console.log(`  - ${e}`);
}
console.log('wrote data/fetch-manifest.json');
