#!/usr/bin/env node
// Self-test for alignment and Gemini post-processing. Run: node scripts/align-selftest.mjs
import assert from 'node:assert/strict';
import { alignFile } from '../src/lib/align/align.mjs';
import { processGemini } from './gemini-process.mjs';

let passed = 0;
function check(name, fn) {
  fn();
  passed += 1;
  console.log(`ok - ${name}`);
}

// 1. EN has 4 blocks; translation has the same plus one extra paragraph -> a mismatch row appears.
const EN_4 = '# Title\n\nPara one.\n\nPara two.\n\nPara three.\n';
const KIMI_5 = '# 標題\n\n第一段。\n\n多出來的段落。\n\n第二段。\n\n第三段。\n';

check('extra translation paragraph yields a mismatch row', () => {
  const { mode, rows } = alignFile({ en: EN_4, kimi: KIMI_5 }, { idPrefix: 'T' });
  assert.equal(mode, 'section');
  assert.equal(rows.length, 5);
  const mismatches = rows.filter((r) => r.kind === 'mismatch');
  assert.equal(mismatches.length, 1, 'expected exactly one mismatch row');
  assert.equal(mismatches[0].en, null);
  assert.notEqual(mismatches[0].kimi, null);
  assert.equal(mismatches[0].gemini, null);
  assert.equal(rows[0].id, 'T-1');
});

// 2. Identical structure (heading, heading, paragraph, list, table) -> index mode, all aligned.
const EN_S = '# A\n\n## 2.0 Intro\n\nText *one* with [link](https://example.com).\n\n- item\n- item2\n\n| a | b |\n| - | - |\n| 1 | 2 |\n';
const KIMI_S = '# 甲\n\n## 2.0 引言\n\n文字一 [連結](https://example.com)。\n\n- 項目\n- 項目二\n\n| a | b |\n| - | - |\n| 1 | 2 |\n';
const GEM_S = '# 乙\n\n## 2.0 導論\n\n文字壹 [鏈接](https://example.com)。\n\n- 條目\n- 條目二\n\n| a | b |\n| - | - |\n| 1 | 2 |\n';

check('identical structure aligns every row by index', () => {
  const { mode, rows, parsed } = alignFile({ en: EN_S, kimi: KIMI_S, gemini: GEM_S });
  assert.equal(mode, 'index');
  assert.equal(rows.length, 5);
  assert.ok(rows.every((r) => r.kind === 'aligned'));
  assert.ok(rows.every((r) => r.en && r.kimi && r.gemini));
  assert.deepEqual(parsed.en.stats, { blocks: 5, headings: 2, tables: 1, links: 1, lists: 1 });
});

// 3. Missing model doc -> its column is null, no mismatch.
check('missing gemini doc is a null column, not a mismatch', () => {
  const { mode, rows } = alignFile({ en: EN_S, kimi: KIMI_S, gemini: null });
  assert.equal(mode, 'index');
  assert.ok(rows.every((r) => r.kind === 'aligned' && r.gemini === null && r.en && r.kimi));
});

// 4. Section present only in EN -> its blocks become mismatch rows.
const EN_SEC = '# A\n\n## 2.0 Intro\n\nP1.\n\n## 2.1 More\n\nP2.\n';
const KIMI_SEC = '# 甲\n\n## 2.0 引言\n\n第一。\n';

check('section missing from one doc becomes mismatch rows', () => {
  const { rows } = alignFile({ en: EN_SEC, kimi: KIMI_SEC });
  const mismatches = rows.filter((r) => r.kind === 'mismatch');
  assert.equal(mismatches.length, 2);
  assert.ok(mismatches.every((r) => r.en !== null && r.kimi === null));
});

// 5. Gemini post-processing: fence + sentinel, closing fence before and after the sentinel.
check('gemini fence stripped when closing fence precedes sentinel', () => {
  const r = processGemini('```markdown\n# 標題\n\n正文。\n```\n<<<GLOSSARY-NOTES>>>\n- 詞彙: 註解\n');
  assert.equal(r.translation, '# 標題\n\n正文。\n');
  assert.deepEqual(r.notes, ['- 詞彙: 註解']);
  assert.equal(r.sentinel, true);
  assert.equal(r.fenceStripped, true);
});

check('gemini fence stripped when closing fence follows sentinel', () => {
  const r = processGemini('```\n# T\n\n正文\n<<<GLOSSARY-NOTES>>>\n- n1\n\n- n2\n```');
  assert.equal(r.translation, '# T\n\n正文\n');
  assert.deepEqual(r.notes, ['- n1', '- n2']);
  assert.equal(r.fenceStripped, true);
});

check('gemini reply without fence or sentinel passes through', () => {
  const r = processGemini('# T\n\nx\n');
  assert.equal(r.translation, '# T\n\nx\n');
  assert.deepEqual(r.notes, []);
  assert.equal(r.sentinel, false);
  assert.equal(r.fenceStripped, false);
});

console.log(`align-selftest: ${passed} checks passed`);
