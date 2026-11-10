// Defensive reader for data/run/<model>-run.json. Two layouts are understood:
//  - the run-JSON merger layout (top-level `files` array with wall_clock_s_*, cost_usd_*_rate, attempts[], lint, ...)
//  - generic per-file objects (seconds / cost / tokens / lint / ...), as in earlier drafts.
// Unknown keys are ignored. An unrecognised shape becomes a warning and the caller keeps the manual values
// from data/meta.json. Never throws.

const NONE_LINE = /^(?:[-*]\s*)?\(?none\)?\.?$/i;

const isObj = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);

// Strips list bullets ("- x"), trailing spaces, blank lines and "none" placeholders.
export function cleanNotes(lines) {
  return lines
    .map((l) => String(l).replace(/^\s*[-*]\s+/, '').replace(/\s+$/, ''))
    .filter((l) => l.trim() !== '' && !NONE_LINE.test(l.trim()));
}

// First non-null value among dotted key paths ('structure.differences').
function pick(obj, keys) {
  if (!isObj(obj)) return undefined;
  for (const k of keys) {
    let cur = obj;
    for (const part of k.split('.')) cur = isObj(cur) ? cur[part] : undefined;
    if (cur !== undefined && cur !== null) return cur;
  }
  return undefined;
}

function num(v) {
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  if (typeof v === 'string' && v.trim() !== '' && Number.isFinite(Number(v))) return Number(v);
  return undefined;
}

// USD amounts are kept to four decimals.
const usd4 = (v) => (v === undefined ? undefined : Number(v.toFixed(4)));

// Maps a file name, a path, or an id such as "2.0" onto one of the chapter file names.
function findFile(name, files) {
  if (typeof name !== 'string') return null;
  const base = name.split(/[\\/]/).pop().replace(/\.md$/, '');
  const exact = files.find((f) => f.replace(/\.md$/, '') === base);
  if (exact) return exact;
  const m = base.match(/(\d+\.\d+)/);
  return m ? (files.find((f) => f.startsWith(`${m[1]}-`)) ?? null) : null;
}

function findingText(f) {
  if (typeof f === 'string') return f.trim();
  if (!isObj(f)) return '';
  const rule = f.rule ?? f.id ?? f.code ?? f.category;
  const msg = f.message ?? f.text ?? f.detail ?? f.description;
  if (rule === undefined && msg === undefined) return JSON.stringify(f);
  return [rule, msg].filter((x) => x !== undefined && x !== '').map(String).join(': ');
}

// Attempts with accepted === false. `attempt` is the 1-based position in attempts[].
// The failure detail sits under `failure` (merger layout) or `note` (older drafts).
export function failedAttemptsOf(entry) {
  const list = pick(entry, ['attempts']);
  if (!Array.isArray(list)) return [];
  const out = [];
  list.forEach((a, i) => {
    if (!isObj(a) || a.accepted !== false) return;
    const failure = isObj(a.failure) ? a.failure : isObj(a.note) ? a.note : {};
    out.push({
      attempt: i + 1,
      seconds: num(a.wall_clock_s) ?? null,
      costUsd: usd4(num(a.cost_usd_full_rate)) ?? null,
      kind: typeof failure.kind === 'string' ? failure.kind : 'failed',
      detail: typeof failure.detail === 'string' ? failure.detail : '',
      rawOutput: typeof failure.raw_output === 'string' ? failure.raw_output : null,
    });
  });
  return out;
}

// Maps one per-file entry to the fields it provides. Only recognised, valid values are returned.
export function extractFileFields(entry) {
  const fields = {};
  const notes = [];

  // Retries and failed attempts (merger layout). Gemini and manual entries have neither.
  const attempts = pick(entry, ['attempts']);
  const failed = failedAttemptsOf(entry);
  let retries = num(pick(entry, ['retries']));
  if (retries === undefined && Array.isArray(attempts)) retries = Math.max(0, attempts.length - 1);
  if (retries !== undefined) fields.retries = retries;
  if (Array.isArray(attempts)) fields.failedAttempts = failed;

  // Seconds: the accepted attempt, then generic keys, then the total wall clock.
  const secondsTotal = num(pick(entry, ['wall_clock_s_total']));
  const seconds =
    num(pick(entry, ['seconds', 'elapsed_s', 'duration_s', 'elapsedSeconds', 'wall_clock_s_accepted'])) ?? secondsTotal;
  if (seconds !== undefined) fields.seconds = seconds;
  if (retries !== undefined) {
    fields.secondsNote = retries > 0 && secondsTotal !== undefined ? `含重試總耗時 ${secondsTotal} 秒` : null;
  }

  // Cost: full-rate (upper bound) amount; the note carries the cached-rate amount.
  const cost = pick(entry, ['cost_usd_full_rate', 'cost', 'cost_usd', 'costUsd']);
  const costUsd = usd4(num(cost) ?? num(pick(cost, ['usd'])));
  if (costUsd !== undefined) fields.costUsd = costUsd;
  const costCached = usd4(num(pick(entry, ['cost_usd_cached_rate'])));
  if (costCached !== undefined) {
    fields.costNote = `全價上限；計入快取後 US$${costCached.toFixed(4)}${failed.length > 0 ? '；含失敗重試' : ''}`;
  }

  const tokObj = pick(entry, ['tokens', 'usage']);
  const tok = (keys) => num(pick(entry, keys)) ?? num(pick(tokObj, keys));
  const prompt = tok(['prompt_tokens', 'input', 'prompt']);
  const completion = tok(['completion_tokens', 'output', 'completion']);
  const reasoning = tok(['reasoning_tokens', 'reasoning']);
  const cached = tok(['cached_prompt_tokens', 'cached']);
  if (prompt !== undefined && completion !== undefined) {
    fields.tokens = { prompt, completion, reasoning: reasoning ?? null, cached: cached ?? null };
  } else if (prompt !== undefined || completion !== undefined || reasoning !== undefined) {
    notes.push('tokens present but prompt/completion incomplete; tokens ignored');
  }

  // check_differences is a count at file level (an array of differences inside a failed attempt).
  const diffs = pick(entry, [
    'structure_diffs',
    'structureDiffs',
    'structure.differences',
    'structure_check.diff_count',
    'check_differences',
  ]);
  const sd = Array.isArray(diffs) ? diffs.length : num(diffs);
  if (sd !== undefined) fields.structureDiffs = sd;

  const lint = pick(entry, ['lint']);
  if (isObj(lint)) {
    const translationese = num(lint.translationese);
    const mainland = num(pick(lint, ['mainland', 'mainland_usage']));
    const other = num(lint.other);
    let total = num(lint.total);
    const parts = [translationese, mainland, other].filter((v) => v !== undefined);
    if (total === undefined && parts.length) total = parts.reduce((a, b) => a + b, 0);
    if (total !== undefined) {
      fields.lint = {
        total,
        translationese: translationese ?? null,
        mainland: mainland ?? null,
        other: other ?? null,
      };
    }
  }

  const gl = pick(entry, ['glossary_notes', 'glossaryNotes']);
  if (Array.isArray(gl)) fields.glossaryNotes = cleanNotes(gl.map((g) => (typeof g === 'string' ? g : findingText(g))));
  else if (typeof gl === 'string') fields.glossaryNotes = cleanNotes(gl.split('\n'));

  const tf = pick(entry, ['top_findings', 'topFindings']);
  if (Array.isArray(tf)) fields.topFindings = tf.map(findingText).filter((s) => s !== '');
  else if (typeof tf === 'string' && tf.trim() !== '') fields.topFindings = [tf.trim()];

  const nt = pick(entry, ['notes']);
  if (typeof nt === 'string') fields.notes = nt;

  return { fields, notes };
}

// Run-wide totals (merger layout). They include failed attempts. Null when absent.
export function readRunTotals(json) {
  const t = isObj(json) ? json.totals : undefined;
  if (!isObj(t)) return null;
  return {
    seconds: num(t.wall_clock_s) ?? null,
    costUsd: usd4(num(t.cost_usd_full_rate)) ?? null,
    costCachedUsd: usd4(num(t.cost_usd_cached_rate)) ?? null,
    requests: num(t.requests) ?? null,
    failedRequests: num(t.failed_requests_included) ?? null,
    lint: isObj(t.lint) ? (num(t.lint.total) ?? null) : null,
  };
}

// "每百萬 token：輸入 US$2／快取輸入 US$0.2／輸出 US$10" from prices_usd_per_million. Null when absent.
export function readPriceNote(json) {
  const p = isObj(json) ? json.prices_usd_per_million : undefined;
  if (!isObj(p)) return null;
  const input = num(p.input);
  const cached = num(p.cached_input);
  const output = num(p.output);
  if (input === undefined || cached === undefined || output === undefined) return null;
  return `每百萬 token：輸入 US$${input}／快取輸入 US$${cached}／輸出 US$${output}`;
}

// Returns { shape, byFile: { [chapterFile]: fields }, totals, priceNote, warnings: [] }. Never throws.
export function readRunJson(json, files) {
  const warnings = [];
  const byFile = {};
  const totals = readRunTotals(json);
  const priceNote = readPriceNote(json);
  let list;
  let shape;
  if (Array.isArray(json)) {
    shape = 'array';
    list = json;
  } else if (isObj(json) && Array.isArray(json.files)) {
    shape = 'files-array';
    list = json.files;
  } else if (isObj(json) && isObj(json.files)) {
    shape = 'files-object';
    list = Object.entries(json.files).map(([key, entry]) => ({ __key: key, ...(isObj(entry) ? entry : { __bad: entry }) }));
  } else {
    const desc = isObj(json) ? `object with keys: ${Object.keys(json).join(', ') || '(none)'}` : typeof json;
    warnings.push(`unrecognised run JSON shape (${desc}); falling back to manual values`);
    return { shape: 'unrecognised', byFile, totals, priceNote, warnings };
  }

  for (const item of list) {
    if (!isObj(item)) {
      warnings.push(`entry is not an object (${typeof item}); ignored`);
      continue;
    }
    const key = item.__key ?? item.file ?? item.name ?? item.id ?? item.key ?? item.path;
    const file = findFile(key, files);
    if (!file) {
      const label =
        key === undefined
          ? `entry without file/name/id (keys: ${Object.keys(item).join(', ')})`
          : `key ${JSON.stringify(key)} is not a chapter file`;
      warnings.push(`${label}; ignored`);
      continue;
    }
    if (item.__bad !== undefined) {
      warnings.push(`${file}: entry is not an object; ignored`);
      continue;
    }
    const { fields, notes } = extractFileFields(item);
    for (const n of notes) warnings.push(`${file}: ${n}`);
    if (Object.keys(fields).length === 0) {
      warnings.push(`${file}: no recognised fields (entry keys: ${Object.keys(item).join(', ')})`);
      continue;
    }
    byFile[file] = { ...(byFile[file] ?? {}), ...fields };
  }
  return { shape, byFile, totals, priceNote, warnings };
}
