// Defensive reader for data/run/<model>-run.json. The run-JSON shape is not final, so this accepts
// several layouts, maps keys loosely and never throws. Anything unrecognised becomes a warning and the
// caller keeps the manual values from data/meta.json.

const NONE_LINE = /^(?:[-*]\s*)?\(?none\)?\.?$/i;

const isObj = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);

// Drops blank lines and "none" / "- none" placeholders.
export function cleanNotes(lines) {
  return lines
    .map((l) => String(l).replace(/\s+$/, ''))
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

// Maps one per-file entry to the fields it provides. Only recognised, valid values are returned.
export function extractFileFields(entry) {
  const fields = {};
  const notes = [];

  const seconds = num(pick(entry, ['seconds', 'elapsed_s', 'duration_s', 'elapsedSeconds']));
  if (seconds !== undefined) fields.seconds = seconds;

  const cost = pick(entry, ['cost', 'cost_usd', 'costUsd']);
  const costUsd = num(cost) ?? num(pick(cost, ['usd']));
  if (costUsd !== undefined) fields.costUsd = costUsd;

  const tokObj = pick(entry, ['tokens', 'usage']);
  const tok = (keys) => num(pick(entry, keys)) ?? num(pick(tokObj, keys));
  const prompt = tok(['prompt_tokens', 'input', 'prompt']);
  const completion = tok(['completion_tokens', 'output', 'completion']);
  const reasoning = tok(['reasoning_tokens', 'reasoning']);
  if (prompt !== undefined && completion !== undefined) {
    fields.tokens = { prompt, completion, reasoning: reasoning ?? null };
  } else if (prompt !== undefined || completion !== undefined || reasoning !== undefined) {
    notes.push('tokens present but prompt/completion incomplete; tokens ignored');
  }

  const sd = num(pick(entry, ['structure_diffs', 'structureDiffs', 'structure.differences', 'structure_check.diff_count']));
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

// Returns { shape, byFile: { [chapterFile]: fields }, warnings: [] }. Never throws.
export function readRunJson(json, files) {
  const warnings = [];
  const byFile = {};
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
    const desc = Array.isArray(json)
      ? 'array'
      : isObj(json)
        ? `object with keys: ${Object.keys(json).join(', ') || '(none)'}`
        : typeof json;
    warnings.push(`unrecognised run JSON shape (${desc}); falling back to manual values`);
    return { shape: 'unrecognised', byFile, warnings };
  }

  for (const item of list) {
    if (!isObj(item)) {
      warnings.push(`entry is not an object (${typeof item}); ignored`);
      continue;
    }
    const key = item.__key ?? item.file ?? item.name ?? item.id ?? item.key ?? item.path;
    const file = findFile(key, files);
    if (!file) {
      const label = key === undefined ? `entry without file/name/id (keys: ${Object.keys(item).join(', ')})` : `key ${JSON.stringify(key)} is not a chapter file`;
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
  return { shape, byFile, warnings };
}
