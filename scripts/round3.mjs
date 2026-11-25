// Round 3: four Gemini models via Antigravity (2026-11-26), same English (pinned SHA), side by side,
// plus the published zh-TW copy (#277, Gemini 4 Hydrogen High) as a read-only reference column.
//
// fetchRound3() is called by scripts/fetch-data.mjs when it is given the run-repo SHA (`npm run fetch <sha>`).
// buildRound3() is called by scripts/build-data.mjs; it reads data/r3 only (no network).
// Anything not in the run folder yet (a model, a file) becomes a "not translated yet" placeholder.
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { alignFile, cjkCount, firstHeadingText } from '../src/lib/align/align.mjs';

export const R3_FILES = ['2.0-disruption-ladder.md', '2.3-island-partition.md', '2.4-interfaces.md'];

export const R3_MODELS = [
  { id: 'gemini-4-neon-high', label: 'Gemini 4 Neon (High)', short: 'Neon' },
  { id: 'gemini-4-carbon-high', label: 'Gemini 4 Carbon (High)', short: 'Carbon' },
  { id: 'gemini-4-argon-high', label: 'Gemini 4 Argon (High)', short: 'Argon' },
  { id: 'gemini-3.8-flash-high', label: 'Gemini 3.8 Flash (High)', short: '3.8 Flash' },
];
export const PUBLISHED_LABEL = 'Published (Gemini 4 Hydrogen High, #277)';

const REPORT_REPO = 'paulpengtw/network-resilience-report';
const EN_REF = '594b91aeb7b9b6726830ad504d8c48483d6487d6';
const RUN_REPO = 'paulpengtw-aiagent/gemini-web-runs';
const RUN_DIR = '2026-11-26-nrr-zhtw-agy-compare';
const BLIND_SEED = 'nrr-r3-2026-11-26';

// Length badge: the longest and shortest of the present model translations (CJK count, each >= 8) differ by
// more than this factor (same 60% / 170% band as round 1, applied to max/min).
const MIN_CJK_FOR_FLAG = 8;
const LENGTH_SPREAD = 1.7;

function writeText(path, text) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, text);
}
const readOptional = (p) => (existsSync(p) ? readFileSync(p, 'utf8') : null);
const readJson = (p, fallback) => {
  const t = readOptional(p);
  if (t === null) return fallback;
  try {
    return JSON.parse(t);
  } catch {
    console.warn(`WARNING: round 3: ${p} is not valid JSON`);
    return fallback;
  }
};

function ghJson(endpoint) {
  try {
    const text = execFileSync('gh', ['api', endpoint], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024, stdio: ['ignore', 'pipe', 'pipe'] });
    return { status: 'ok', json: JSON.parse(text) };
  } catch (err) {
    const msg = String(err.stderr || err.message || '').trim();
    if (/HTTP 404|Not Found/i.test(msg)) return { status: 'missing' };
    return { status: 'error', message: msg.split('\n')[0] || 'unknown error' };
  }
}

/** Accepts a full or abbreviated commit SHA of the run repo; returns the full SHA (never a branch). */
export function resolveRunSha(arg) {
  if (!/^[0-9a-f]{7,40}$/i.test(arg ?? '')) throw new Error(`round 3: expected a commit SHA of ${RUN_REPO}, got "${arg}"`);
  const r = ghJson(`repos/${RUN_REPO}/commits/${arg}`);
  if (r.status !== 'ok') throw new Error(`round 3: commit ${arg} not found in ${RUN_REPO} (${r.message ?? r.status})`);
  return r.json.sha;
}

/**
 * Fetches round-3 inputs into data/r3/ (replacing what was there) and writes data/r3/fetch-manifest.json.
 * Every request is pinned: English and the published copy at EN_REF, the run folder at `runSha`.
 */
export function fetchRound3({ ghRaw, dataDir, runSha }) {
  const r3 = join(dataDir, 'r3');
  const errors = [];
  const manifest = {
    fetchedAt: new Date().toISOString(),
    runSha,
    pins: {
      en: { repo: REPORT_REPO, ref: EN_REF, path: 'report/ch2' },
      published: { repo: REPORT_REPO, ref: EN_REF, path: 'i18n/zh-TW/report/ch2' },
      run: { repo: RUN_REPO, ref: runSha, dir: RUN_DIR },
    },
    files: { en: {}, published: {}, run: {}, models: {} },
    errors,
  };
  const pending = new Map(); // local path -> text; written only after every request has been made

  const get = (repo, path, ref, local, label) => {
    const r = ghRaw(repo, path, ref);
    if (r.status === 'ok') {
      pending.set(local, r.text);
      return true;
    }
    if (r.status === 'error') errors.push(`${label}: ${r.message}`);
    return false;
  };
  const list = (path) => {
    const r = ghJson(`repos/${RUN_REPO}/contents/${path}?ref=${runSha}`);
    if (r.status === 'ok' && Array.isArray(r.json)) return r.json.filter((e) => e.type === 'file').map((e) => e.name);
    if (r.status === 'error') errors.push(`list ${path}: ${r.message}`);
    return [];
  };

  for (const file of R3_FILES) {
    manifest.files.en[file] = get(REPORT_REPO, `report/ch2/${file}`, EN_REF, join(r3, 'en', file), `en/${file}`);
    manifest.files.published[file] = get(REPORT_REPO, `i18n/zh-TW/report/ch2/${file}`, EN_REF, join(r3, 'published', file), `published/${file}`);
  }

  // Published copy freshness: i18n/zh-TW/stale.json `current[path]` is the English commit the copy was synced to.
  // The copy is stale when the English blob at that commit differs from the English blob at EN_REF.
  const staleJson = ghRaw(REPORT_REPO, 'i18n/zh-TW/stale.json', EN_REF);
  const status = {};
  let stale = null;
  if (staleJson.status === 'ok') {
    try {
      stale = JSON.parse(staleJson.text);
    } catch {
      errors.push('stale.json: not valid JSON');
    }
  }
  const blobAt = (path, ref) => {
    const r = ghJson(`repos/${REPORT_REPO}/contents/${path}?ref=${ref}`);
    return r.status === 'ok' ? r.json.sha : null;
  };
  const lastCommit = (path) => {
    const r = ghJson(`repos/${REPORT_REPO}/commits?sha=${EN_REF}&path=${encodeURIComponent(path)}&per_page=1`);
    return r.status === 'ok' && r.json[0] ? { sha: r.json[0].sha, date: r.json[0].commit.committer.date } : null;
  };
  for (const file of R3_FILES) {
    const src = `report/ch2/${file}`;
    if (!manifest.files.published[file]) {
      status[file] = { state: 'missing', detail: 'no published copy at the pinned SHA' };
      continue;
    }
    const syncedTo = stale?.current?.[src] ?? null;
    if (stale?.stale?.includes(src)) {
      status[file] = { state: 'stale', detail: 'listed in i18n/zh-TW/stale.json `stale`' };
    } else if (syncedTo) {
      const a = blobAt(src, EN_REF);
      const b = blobAt(src, syncedTo);
      status[file] =
        a && b && a === b
          ? { state: 'current', detail: `English unchanged since ${syncedTo.slice(0, 7)} (stale.json)` }
          : { state: 'stale', detail: `English changed after ${syncedTo.slice(0, 7)}, the commit the copy was synced to (stale.json)` };
    } else {
      const en = lastCommit(src);
      const zh = lastCommit(`i18n/zh-TW/${src}`);
      if (en && zh && Date.parse(zh.date) >= Date.parse(en.date)) {
        status[file] = { state: 'current', detail: `not in stale.json; copy (${zh.date.slice(0, 10)}) is newer than the English (${en.date.slice(0, 10)})` };
      } else {
        status[file] = { state: 'stale', detail: `not in stale.json; English (${en?.date?.slice(0, 10) ?? '?'}) is newer than the copy (${zh?.date?.slice(0, 10) ?? '?'})` };
      }
    }
  }
  pending.set(join(r3, 'published', 'status.json'), `${JSON.stringify(status, null, 2)}\n`);

  manifest.files.run['input/files.json'] = get(RUN_REPO, `${RUN_DIR}/input/files.json`, runSha, join(r3, 'run', 'files.json'), 'input/files.json');
  manifest.files.run['output/run-log.md'] = get(RUN_REPO, `${RUN_DIR}/output/run-log.md`, runSha, join(r3, 'run', 'run-log.md'), 'output/run-log.md');

  const wanted = (name) => /\.md$/.test(name) && R3_FILES.some((f) => name.endsWith(`-${f}`));
  for (const m of R3_MODELS) {
    const parsedNames = list(`${RUN_DIR}/check/${m.id}/parsed`).filter(wanted);
    const outputNames = list(`${RUN_DIR}/output/${m.id}`).filter(wanted);
    const entry = { parsed: [], output: [], summary: false };
    for (const name of parsedNames) {
      if (get(RUN_REPO, `${RUN_DIR}/check/${m.id}/parsed/${name}`, runSha, join(r3, 'parsed', m.id, name), `${m.id}/parsed/${name}`)) entry.parsed.push(name);
    }
    for (const name of outputNames) {
      if (get(RUN_REPO, `${RUN_DIR}/output/${m.id}/${name}`, runSha, join(r3, 'output', m.id, name), `${m.id}/output/${name}`)) entry.output.push(name);
    }
    entry.summary = get(RUN_REPO, `${RUN_DIR}/check/${m.id}/summary.json`, runSha, join(r3, 'check', m.id, 'summary.json'), `${m.id}/summary.json`);
    manifest.files.models[m.id] = entry;
  }

  // Replace data/r3 wholesale, except hand-written files, so nothing from an older run SHA survives.
  for (const sub of ['en', 'published', 'run', 'parsed', 'output', 'check']) rmSync(join(r3, sub), { recursive: true, force: true });
  for (const [p, t] of pending) writeText(p, t);
  writeText(join(r3, 'fetch-manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);

  console.log(`round 3: run ${RUN_REPO}@${runSha.slice(0, 7)}`);
  for (const m of R3_MODELS) {
    const e = manifest.files.models[m.id];
    console.log(`  ${m.id.padEnd(22)} parsed ${e.parsed.length}/${R3_FILES.length}  raw ${e.output.length}  summary ${e.summary ? 'yes' : 'no'}`);
  }
  for (const f of R3_FILES) console.log(`  published ${f}: ${status[f]?.state}`);
  for (const e of errors) console.log(`  - ${e}`);
  console.log('wrote data/r3/fetch-manifest.json');
  return manifest;
}

// ---------------------------------------------------------------------------------------------------------
// Build

/** Deterministic shuffle (mulberry32 seeded by a string hash). */
function seededShuffle(items, seedText) {
  let h = 1779033703 ^ seedText.length;
  for (let i = 0; i < seedText.length; i++) {
    h = Math.imul(h ^ seedText.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  let s = h >>> 0;
  const rand = () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/** The model's text for one source file: the whole-file reply, else its chunks (a, b, ...) joined in order. */
function modelText(dir, file) {
  if (!existsSync(dir)) return { text: null, from: [] };
  const names = readdirSync(dir).filter((n) => n.endsWith(`-${file}`)).sort();
  const whole = names.find((n) => /^\d+-/.test(n));
  if (whole) return { text: readFileSync(join(dir, whole), 'utf8'), from: [whole] };
  const chunks = names.filter((n) => /^\d+[a-z]-/.test(n));
  if (chunks.length) return { text: chunks.map((n) => readFileSync(join(dir, n), 'utf8').trim()).join('\n\n') + '\n', from: chunks };
  return { text: null, from: [] };
}

/**
 * English-spine alignment: one row per English block. Each translation is aligned against the English on its
 * own (round-1 align code), so one model's structural drift does not break the other columns. A translation
 * block with no English partner is appended to the previous row's cell for that column and the cell is marked.
 */
function alignToEnglish(en, texts) {
  const enRows = alignFile({ en }, {}).rows.map((r) => r.en);
  const cells = enRows.map(() => ({}));
  const drift = enRows.map(() => ({}));
  for (const [col, text] of Object.entries(texts)) {
    if (text === null) continue;
    const { rows } = alignFile({ en, gemini: text }, {});
    let k = -1;
    for (const r of rows) {
      if (r.en) {
        k += 1;
        if (k >= enRows.length) break;
        if (r.gemini) cells[k][col] = { ...r.gemini };
        else drift[k][col] = true;
      } else if (r.gemini) {
        const at = Math.max(0, k);
        if (!cells[at]) continue;
        const prev = cells[at][col];
        cells[at][col] = prev ? { ...prev, md: `${prev.md}\n\n${r.gemini.md}` } : { ...r.gemini };
        drift[at][col] = true;
      }
    }
  }
  return { enRows, cells, drift };
}

/** run-log.md: one line per call. Uses a header row when there is one, else the order time, file, model, status, seconds, tokens. */
function parseRunLog(text) {
  const calls = [];
  if (!text) return calls;
  let header = null;
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith('#') || /^\|?\s*:?-{3,}/.test(line)) continue;
    const cells = line.includes('|')
      ? line.replace(/^\||\|$/g, '').split('|').map((c) => c.trim())
      : line.split(/\t|\s{2,}|\s+·\s+|,\s*/).map((c) => c.trim()).filter(Boolean);
    const lower = cells.map((c) => c.toLowerCase());
    if (!header && lower.some((c) => /^(model|model id)$/.test(c)) && lower.some((c) => /file/.test(c))) {
      header = lower;
      continue;
    }
    const at = (re, fallback) => {
      const i = header ? header.findIndex((h) => re.test(h)) : -1;
      return cells[i >= 0 ? i : fallback];
    };
    const model = R3_MODELS.find((m) => cells.some((c) => c === m.id || c.includes(m.id)))?.id;
    const fileCell = at(/file|nn/, 1) ?? '';
    const file = R3_FILES.find((f) => fileCell.includes(f.replace(/\.md$/, '')) || fileCell.includes(f.slice(0, 3)));
    if (!model || !file) continue;
    const num = (s) => {
      const m = String(s ?? '').replace(/,/g, '').match(/(\d+(?:\.\d+)?)\s*(k)?/i);
      return m ? Number(m[1]) * (m[2] ? 1000 : 1) : null;
    };
    calls.push({
      time: at(/time|at|when/, 0) ?? '',
      model,
      file,
      nn: fileCell,
      status: at(/status|result/, 3) ?? '',
      seconds: num(at(/sec|time \(s\)|duration|elapsed/, 4)),
      tokens: num(at(/token/, 5)),
    });
  }
  return calls;
}

const asList = (v) => (Array.isArray(v) ? v : v == null || v === false || v === 0 || v === '' ? [] : typeof v === 'object' ? Object.entries(v).map(([k, x]) => `${k}: ${typeof x === 'string' ? x : JSON.stringify(x)}`) : [v]);
const countOf = (v) => (Array.isArray(v) ? v.length : typeof v === 'number' ? v : v && typeof v === 'object' ? Object.keys(v).length : 0);
const textOf = (item) => (typeof item === 'string' ? item : JSON.stringify(item));
const pick = (obj, re) => {
  const k = Object.keys(obj ?? {}).find((key) => re.test(key));
  return k === undefined ? undefined : obj[k];
};

/** summary.json per file, whatever its exact key names: object keyed by file name, or a list of objects with a file field. */
function normaliseSummary(json) {
  const out = {};
  if (!json) return out;
  const entries = Array.isArray(json)
    ? json.map((e) => [String(pick(e, /^(file|name|nn|path|source)$/i) ?? ''), e])
    : Object.entries(json.files ?? json);
  for (const [key, e] of entries) {
    const file = R3_FILES.find((f) => key.includes(f.replace(/\.md$/, '')));
    if (!file || typeof e !== 'object' || e === null) continue;
    const restoredList = pick(e, /restored.*(list|strings)$/i) ?? pick(e, /^restored/i);
    const restoredCount = pick(e, /restored.*count/i);
    const check = pick(e, /check/i);
    const skeleton = pick(e, /skeleton/i);
    const links = pick(e, /link/i);
    const cjk = pick(e, /cjk/i);
    const parsed = pick(e, /pars/i);
    const fence = pick(e, /fence/i);
    out[file] = {
      parseOk: parsed === undefined ? null : Boolean(typeof parsed === 'object' ? (pick(parsed, /ok/i) ?? true) : parsed),
      restored: asList(Array.isArray(restoredList) ? restoredList : undefined).map(textOf),
      restoredCount: typeof restoredCount === 'number' ? restoredCount : countOf(restoredList),
      check: check === undefined ? null : typeof check === 'string' ? check : JSON.stringify(check),
      skeleton: asList(skeleton).map(textOf),
      links: asList(links).map(textOf),
      fence: fence === undefined ? null : Boolean(fence),
      cjk: typeof cjk === 'number' ? cjk : null,
    };
  }
  return out;
}

/** Strings worth searching for in a row: quoted parts (「」, “”, "", ``) or the whole finding if short. */
function needles(finding) {
  const found = [];
  const re = /「([^」]{2,80})」|“([^”]{2,80})”|"([^"]{2,80})"|`([^`]{2,80})`|'([^']{3,80})'/g;
  for (const m of finding.matchAll(re)) found.push(m.slice(1).find(Boolean));
  if (found.length === 0 && finding.length <= 60) found.push(finding);
  return found.filter((s) => s && s.trim().length >= 3).map((s) => s.trim());
}

/** `dir` overrides data/r3 (the self-test and local fixture previews use tests/fixtures/r3). */
export function buildRound3({ root, titleZh, titleEnOf, dir = null }) {
  const r3 = dir ?? join(root, 'data', 'r3');
  const manifest = readJson(join(r3, 'fetch-manifest.json'), null);
  const meta = readJson(join(r3, 'meta.json'), {});
  const publishedStatus = readJson(join(r3, 'published', 'status.json'), {});
  const calls = parseRunLog(readOptional(join(r3, 'run', 'run-log.md')));
  const summaries = Object.fromEntries(R3_MODELS.map((m) => [m.id, normaliseSummary(readJson(join(r3, 'check', m.id, 'summary.json'), null))]));

  const sections = R3_FILES.map((file) => {
    const id = file.match(/^(\d+\.\d+)-/)[1];
    const en = readOptional(join(r3, 'en', file));
    if (en === null) console.warn(`WARNING: round 3 ${file}: English missing (run npm run fetch <run sha>)`);
    const texts = {};
    const sources = {};
    for (const m of R3_MODELS) {
      const { text, from } = modelText(join(r3, 'parsed', m.id), file);
      texts[m.id] = text;
      sources[m.id] = from;
    }
    const published = readOptional(join(r3, 'published', file));
    const { enRows, cells, drift } = alignToEnglish(en ?? '', { ...texts, published });
    const title = en ? firstHeadingText(alignFile({ en }, {}).parsed.en) : file;

    const rows = enRows.map((enBlock, i) => {
      const models = {};
      for (const m of R3_MODELS) models[m.id] = cells[i][m.id] ?? null;
      const cjk = Object.fromEntries(R3_MODELS.map((m) => [m.id, models[m.id] ? cjkCount(models[m.id].md) : null]));
      const counted = Object.values(cjk).filter((c) => c !== null && c >= MIN_CJK_FOR_FLAG);
      let lengthFlag = null;
      if (counted.length >= 2) {
        const ratio = Math.max(...counted) / Math.min(...counted);
        if (ratio > LENGTH_SPREAD) lengthFlag = { ratio: Number(ratio.toFixed(2)) };
      }
      return {
        n: i + 1,
        id: `${id}-${i + 1}`,
        en: enBlock,
        models,
        published: cells[i].published ?? null,
        cjk,
        drift: Object.keys(drift[i]).filter((k) => drift[i][k]),
        lengthFlag,
        notes: [],
      };
    });

    // Row notes from summary.json findings, matched on the model's raw text (or the English for restored strings).
    const unmatched = [];
    for (const m of R3_MODELS) {
      const s = summaries[m.id][file];
      if (!s) continue;
      const kinds = [
        ['restored', s.restored, '已還原英文字串'],
        ['links', s.links, '連結問題'],
        ['skeleton', s.skeleton, '骨架差異'],
      ];
      for (const [kind, items, label] of kinds) {
        for (const item of items) {
          const hits = needles(item);
          const row = rows.find((r) => hits.some((h) => r.models[m.id]?.md.includes(h) || (kind === 'restored' && r.en?.md.includes(h))));
          const note = { model: m.id, kind, text: `${label}：${item}` };
          if (row) row.notes.push(note);
          else unmatched.push(note);
        }
      }
    }

    const modelStats = Object.fromEntries(
      R3_MODELS.map((m) => {
        const mine = calls.filter((c) => c.model === m.id && c.file === file);
        const sum = (k) => (mine.some((c) => c[k] !== null) ? mine.reduce((n, c) => n + (c[k] ?? 0), 0) : null);
        return [
          m.id,
          {
            present: texts[m.id] !== null,
            from: sources[m.id],
            cjk: texts[m.id] === null ? null : cjkCount(texts[m.id]),
            calls: mine.length,
            seconds: sum('seconds'),
            tokens: sum('tokens'),
            statuses: mine.map((c) => c.status).filter(Boolean),
            check: summaries[m.id][file] ?? null,
          },
        ];
      }),
    );

    const blindOrder = seededShuffle(R3_MODELS.map((m) => m.id), `${BLIND_SEED}:${file}`);
    const pub = publishedStatus[file] ?? { state: published === null ? 'missing' : 'unknown', detail: '' };
    console.log(
      `round 3 ${id} rows=${rows.length} models=${R3_MODELS.filter((m) => texts[m.id] !== null).length}/4 ` +
        `lengthFlags=${rows.filter((r) => r.lengthFlag).length} notes=${rows.reduce((n, r) => n + r.notes.length, 0)} unmatched=${unmatched.length} published=${pub.state}`,
    );
    return {
      id,
      file,
      titleZh: titleZh[id] ?? '',
      titleEn: titleEnOf(title),
      rows,
      models: modelStats,
      published: { present: published !== null, state: pub.state, detail: pub.detail },
      blindOrder,
      unmatchedNotes: unmatched,
    };
  });

  const runSha = manifest?.runSha ?? null;
  return {
    generatedAt: new Date().toISOString(),
    meta: {
      runDate: meta.runDate ?? '2026-11-26',
      how: meta.how ?? '',
      models: R3_MODELS,
      publishedLabel: PUBLISHED_LABEL,
      enSource: { repo: REPORT_REPO, sha: EN_REF, url: `https://github.com/${REPORT_REPO}/tree/${EN_REF}/report/ch2` },
      run: runSha
        ? { repo: RUN_REPO, sha: runSha, dir: RUN_DIR, url: `https://github.com/${RUN_REPO}/tree/${runSha}/${RUN_DIR}`, fetchedAt: manifest.fetchedAt }
        : null,
      callsLogged: calls.length,
    },
    sections,
  };
}
