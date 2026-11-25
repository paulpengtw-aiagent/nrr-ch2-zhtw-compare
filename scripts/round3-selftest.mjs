#!/usr/bin/env node
// Builds round 3 from tests/fixtures/r3 (made from the real English and published copy, with chunked replies,
// a missing file, an inserted paragraph, a shortened paragraph, three summary.json shapes and a run-log table)
// and checks the parsers. No network.
import assert from 'node:assert/strict';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildRound3 } from './round3.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const d = buildRound3({ root: ROOT, titleZh: {}, titleEnOf: (t) => t, dir: join(ROOT, 'tests', 'fixtures', 'r3') });
const sec = (id) => d.sections.find((s) => s.id === id);

assert.equal(d.sections.length, 3);
assert.deepEqual(sec('2.3').models['gemini-4-neon-high'].from, ['02a-2.3-island-partition.md', '02b-2.3-island-partition.md'], 'chunks joined');
assert.equal(sec('2.4').models['gemini-3.8-flash-high'].present, false, 'missing file is a placeholder');
assert.ok(sec('2.4').rows.every((r) => r.models['gemini-3.8-flash-high'] === null));
assert.equal(sec('2.0').models['gemini-4-argon-high'].seconds, 170, 'retries summed');
assert.equal(sec('2.0').models['gemini-4-argon-high'].calls, 2);
assert.equal(sec('2.0').models['gemini-4-neon-high'].tokens, 41200, 'thousands separators');
assert.equal(sec('2.3').models['gemini-4-neon-high'].seconds, 125, 'chunk calls counted for the file');
assert.ok(sec('2.0').rows.some((r) => r.drift.includes('gemini-4-argon-high')), 'inserted paragraph marked');
assert.ok(sec('2.4').rows.some((r) => r.lengthFlag), 'shortened paragraph flagged');
assert.equal(sec('2.4').models['gemini-4-carbon-high'].check.restoredCount, 1, 'summary keyed under files');
assert.equal(sec('2.0').models['gemini-4-argon-high'].check.links.length, 1, 'summary as a list');
assert.ok(sec('2.4').rows.some((r) => r.notes.some((n) => n.kind === 'restored')), 'restored string note on its row');
assert.ok(sec('2.0').rows.some((r) => r.notes.some((n) => n.kind === 'links')), 'link note on its row');
assert.equal(sec('2.4').unmatchedNotes.length, 1, 'unmatched finding kept for the overview');
assert.equal(sec('2.3').published.state, 'stale');
for (const s of d.sections) assert.deepEqual([...s.blindOrder].sort(), d.meta.models.map((m) => m.id).sort());
const again = buildRound3({ root: ROOT, titleZh: {}, titleEnOf: (t) => t, dir: join(ROOT, 'tests', 'fixtures', 'r3') });
assert.deepEqual(again.sections.map((s) => s.blindOrder), d.sections.map((s) => s.blindOrder), 'blind order is fixed');
console.log('round 3 selftest: ok');
