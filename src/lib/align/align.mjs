// Block-level alignment of EN / Kimi / Gemini Markdown documents.
// Plain ESM so that scripts/build-data.mjs can import it under Node without a bundler.

import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkGfm from 'remark-gfm';

const processor = unified().use(remarkParse).use(remarkGfm);

export const COLUMNS = ['en', 'kimi', 'gemini'];

// Build-time row stats. Visible text follows mdast-util-to-string semantics (text, code, inlineCode and
// html values, image alt text; no markup, no link URLs), computed from the parsed tree. Counts exclude whitespace.
const CJK_CHAR = /[㐀-鿿豈-﫿]/g;
const MIN_CJK_FOR_FLAG = 8;
const LENGTH_LOW = 0.6;
const LENGTH_HIGH = 1.7;

function visibleText(node) {
  if (!node || typeof node !== 'object') return '';
  if (typeof node.value === 'string') return node.value;
  if (typeof node.alt === 'string' && node.alt) return node.alt;
  if (Array.isArray(node.children)) return node.children.map(visibleText).join('');
  return '';
}

function blockStats(block) {
  if (!block) return null;
  const text = visibleText(processor.parse(block.md));
  return {
    chars: [...text.replace(/\s/g, '')].length,
    cjk: (text.match(CJK_CHAR) ?? []).length,
  };
}

// Set only when Kimi and Gemini are both present and the smaller side has >= 8 CJK chars.
// ratio = kimiCjk / geminiCjk; flagged when outside [0.6, 1.7].
function lengthFlagFor(kimi, gemini) {
  if (!kimi || !gemini) return null;
  if (Math.min(kimi.cjk, gemini.cjk) < MIN_CJK_FOR_FLAG) return null;
  const ratio = kimi.cjk / gemini.cjk;
  if (ratio >= LENGTH_LOW && ratio <= LENGTH_HIGH) return null;
  return { ratio: Number(ratio.toFixed(2)) };
}

const NUM_PREFIX = /^(\d+(?:\.\d+)*)/;

function plainText(node) {
  if (!node) return '';
  if (typeof node.value === 'string') return node.value;
  if (Array.isArray(node.children)) return node.children.map(plainText).join('');
  return '';
}

function countDeep(node, pred) {
  let n = pred(node) ? 1 : 0;
  if (Array.isArray(node.children)) {
    for (const child of node.children) n += countDeep(child, pred);
  }
  return n;
}

// Parse one Markdown document into top-level blocks (raw source slices) and structure stats.
// Internal blocks carry `headingText`; toBlock() strips it before anything leaves this module.
export function parseDoc(text) {
  const tree = processor.parse(text);
  const blocks = tree.children.map((node) => {
    const start = node.position?.start?.offset ?? 0;
    const end = node.position?.end?.offset ?? start;
    const block = { type: node.type, md: text.slice(start, end) };
    if (node.type === 'heading') {
      block.depth = node.depth;
      block.headingText = plainText(node).trim();
    }
    return block;
  });
  const stats = {
    blocks: blocks.length,
    headings: tree.children.filter((n) => n.type === 'heading').length,
    tables: tree.children.filter((n) => n.type === 'table').length,
    links: countDeep(tree, (n) => n.type === 'link' || n.type === 'linkReference'),
    lists: tree.children.filter((n) => n.type === 'list').length,
  };
  return { blocks, stats };
}

function toBlock(b) {
  return b.type === 'heading' ? { type: b.type, depth: b.depth, md: b.md } : { type: b.type, md: b.md };
}

function typeKey(b) {
  return b.type === 'heading' ? `heading${b.depth}` : b.type;
}

function makeRow(kind, cells) {
  return {
    kind,
    en: cells.en ?? null,
    kimi: cells.kimi ?? null,
    gemini: cells.gemini ?? null,
  };
}

// Split a block list at headings (any depth). Preamble before the first heading is key 'pre'.
// Keys: 'num:<prefix>' when the heading starts with a number, else 'd<depth>#<ordinal>'.
// Duplicate keys get an '@n' suffix.
function splitSections(blocks) {
  const raw = [];
  let cur = null;
  for (const b of blocks) {
    if (b.type === 'heading') {
      cur = { pre: false, heading: b, blocks: [b] };
      raw.push(cur);
    } else {
      if (!cur) {
        cur = { pre: true, heading: null, blocks: [] };
        raw.push(cur);
      }
      cur.blocks.push(b);
    }
  }
  const depthOrdinal = new Map();
  const seen = new Map();
  return raw.map((s) => {
    let base;
    if (s.pre) {
      base = 'pre';
    } else {
      const m = NUM_PREFIX.exec(s.heading.headingText);
      if (m) {
        base = `num:${m[1]}`;
      } else {
        const d = s.heading.depth;
        const ord = (depthOrdinal.get(d) ?? 0) + 1;
        depthOrdinal.set(d, ord);
        base = `d${d}#${ord}`;
      }
    }
    const occ = (seen.get(base) ?? 0) + 1;
    seen.set(base, occ);
    return { key: occ > 1 ? `${base}@${occ}` : base, blocks: s.blocks };
  });
}

// Pairwise index alignment over the present columns. Index i where the types agree
// becomes one 'aligned' row; where they disagree, each block gets its own 'mismatch' row.
// Blocks past the shorter length also become 'mismatch' rows.
function alignLists(lists, cols) {
  const rows = [];
  const len = Math.min(...cols.map((c) => lists[c].length));
  for (let i = 0; i < len; i++) {
    const keys = cols.map((c) => typeKey(lists[c][i]));
    if (keys.every((k) => k === keys[0])) {
      const cells = {};
      for (const c of cols) cells[c] = toBlock(lists[c][i]);
      rows.push(makeRow('aligned', cells));
    } else {
      for (const c of cols) rows.push(makeRow('mismatch', { [c]: toBlock(lists[c][i]) }));
    }
  }
  for (const c of cols) {
    for (let i = len; i < lists[c].length; i++) {
      rows.push(makeRow('mismatch', { [c]: toBlock(lists[c][i]) }));
    }
  }
  return rows;
}

// Section-wise alignment: sections matched by key across docs. A section present in all
// present docs is aligned by index; a section present in only some docs is all 'mismatch'.
function alignSections(cols, blocksByCol) {
  const secs = {};
  for (const c of cols) {
    secs[c] = new Map(splitSections(blocksByCol[c]).map((s) => [s.key, s.blocks]));
  }
  // Order: first column's section order, other columns' extra sections inserted after their predecessor.
  const order = [...secs[cols[0]].keys()];
  for (const c of cols.slice(1)) {
    let prev = null;
    for (const key of secs[c].keys()) {
      if (!order.includes(key)) {
        const at = prev === null ? 0 : order.indexOf(prev) + 1;
        order.splice(at, 0, key);
      }
      prev = key;
    }
  }
  const rows = [];
  for (const key of order) {
    const having = cols.filter((c) => secs[c].has(key));
    if (having.length === cols.length) {
      const lists = {};
      for (const c of cols) lists[c] = secs[c].get(key);
      rows.push(...alignLists(lists, cols));
    } else {
      for (const c of having) {
        for (const b of secs[c].get(key)) rows.push(makeRow('mismatch', { [c]: toBlock(b) }));
      }
    }
  }
  return rows;
}

// texts: { en?: string|null, kimi?: string|null, gemini?: string|null }
// Returns { mode: 'index'|'section'|'single', rows, parsed } where parsed[col] = { blocks, stats }.
// A missing doc (null/undefined) is a null column, never a mismatch.
export function alignFile(texts, { idPrefix = '' } = {}) {
  const cols = COLUMNS.filter((c) => typeof texts[c] === 'string');
  const parsed = {};
  const blocksByCol = {};
  for (const c of cols) {
    parsed[c] = parseDoc(texts[c]);
    blocksByCol[c] = parsed[c].blocks;
  }

  let mode;
  let rows;
  if (cols.length <= 1) {
    mode = 'single';
    const c = cols[0];
    rows = c ? blocksByCol[c].map((b) => makeRow('aligned', { [c]: toBlock(b) })) : [];
  } else {
    const shape = (c) => blocksByCol[c].map(typeKey);
    const ref = shape(cols[0]);
    const sameShape = cols.every((c) => {
      const s = shape(c);
      return s.length === ref.length && s.every((k, i) => k === ref[i]);
    });
    if (sameShape) {
      mode = 'index';
      rows = alignLists(blocksByCol, cols);
    } else {
      mode = 'section';
      rows = alignSections(cols, blocksByCol);
    }
  }

  const numbered = rows.map((r, i) => {
    const stats = { en: blockStats(r.en), kimi: blockStats(r.kimi), gemini: blockStats(r.gemini) };
    return {
      n: i + 1,
      id: `${idPrefix}${idPrefix ? '-' : ''}${i + 1}`,
      kind: r.kind,
      en: r.en,
      kimi: r.kimi,
      gemini: r.gemini,
      chars: {
        en: stats.en?.chars ?? null,
        kimi: stats.kimi?.chars ?? null,
        gemini: stats.gemini?.chars ?? null,
      },
      lengthFlag: lengthFlagFor(stats.kimi, stats.gemini),
    };
  });
  return { mode, rows: numbered, parsed };
}

export function firstHeadingText(parsedDoc) {
  return parsedDoc?.blocks.find((b) => b.type === 'heading')?.headingText ?? '';
}
