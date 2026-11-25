# Check results: nrr zh-TW model comparison on agy (2026-11-26)

`input/check.py` run once per model on `output/<model-id>/` (replies at gemini-web-runs `b4fc1f0`), against the
network-resilience-report checkout at `594b91aeb7b9b6726830ad504d8c48483d6487d6`:

```sh
python3 -I input/check.py --repo <nrr at 594b91a> --replies output/<model-id>   # writes check/<model-id>/
```

Each `check/<model-id>/` holds `parsed/` (the translation as parsed, before restore), `restored/` (after
`restore_english_only`) and `summary.json`. All four runs exited 0. Every reply was a whole file (no chunks), one
attempt each, `SUCCESS rc=0` in `output/run-log.md`. agy seconds and tokens are copied from `output/run-log.md`;
"output" there includes the thinking tokens. CJK chars are counted in the parsed translation. The English sizes
are §2.0 7556 B, §2.3 27038 B and §2.4 1083 B.

| Model | File | Parse ok | Restored strings | `--check` | Skeleton diffs | Link problems | Fence found | CJK chars | agy secs | Output / thinking tokens |
|---|---|---|---|---|---|---|---|---|---|---|
| gemini-4-neon-high | 01 §2.0 | yes | 0 | OK | 0 | 0 | no | 1789 | 205 | 25036 / 23191 |
| gemini-4-neon-high | 02 §2.3 | yes | 0 | OK | 0 | 0 | no | 6579 | 222 | 32737 / 26175 |
| gemini-4-neon-high | 03 §2.4 | yes | 0 | OK | 0 | 0 | no | 255 | 109 | 12366 / 12106 |
| **gemini-4-neon-high total** | | | | | | | | 8623 | 536 | 70139 / 61472 |
| gemini-4-carbon-high | 01 §2.0 | yes | 0 | OK | 0 | 0 | no | 1823 | 625 | 52408 / 50391 |
| gemini-4-carbon-high | 02 §2.3 | yes | 0 | OK | 0 | 0 | no | 6632 | 651 | 60914 / 54240 |
| gemini-4-carbon-high | 03 §2.4 | yes | 0 | OK | 0 | 0 | no | 260 | 380 | 31507 / 31183 |
| **gemini-4-carbon-high total** | | | | | | | | 8715 | 1656 | 144829 / 135814 |
| gemini-4-argon-high | 01 §2.0 | yes | 0 | OK | 0 | 0 | no | 1830 | 136 | 17561 / 15588 |
| gemini-4-argon-high | 02 §2.3 | yes | 0 | OK | 0 | 0 | no | 6704 | 355 | 39147 / 32506 |
| gemini-4-argon-high | 03 §2.4 | yes | 0 | OK | 0 | 0 | no | 260 | 87 | 10833 / 10560 |
| **gemini-4-argon-high total** | | | | | | | | 8794 | 578 | 67541 / 58654 |
| gemini-3.8-flash-high | 01 §2.0 | yes | 0 | OK | 0 | 0 | no | 1843 | 321 | 44919 / 42929 |
| gemini-3.8-flash-high | 02 §2.3 | yes | 0 | OK | 0 | 0 | no | 7023 | 307 | 45685 / 38567 |
| gemini-3.8-flash-high | 03 §2.4 | yes | 0 | OK | 0 | 0 | no | 255 | 211 | 27008 / 26729 |
| **gemini-3.8-flash-high total** | | | | | | | | 9121 | 839 | 117612 / 108225 |

## Findings per model (factual; no quality verdict, model text not edited)

All four models, all three files: the reply parsed and was complete, there were no stray code fences, nothing
needed restoring (the English-only strings the reader build needs came back in English), `--check` was OK, and
there were no skeleton differences or links closed by a full-width `）`. Common to all four: §2.0 line 3,
`**50% Degradation** (降載)` in the English, has no `(降載)` gloss in any of the four translations (the harness
checks do not cover it).

- **gemini-4-neon-high:** glossary notes: 1 (§2.3: `probe` rendered 探測器, not the glossary's 探測, for the RIPE
  Atlas devices). Fewest CJK characters on §2.0 and §2.3. Fastest on §2.3 (222 s) and in total (536 s).
- **gemini-4-carbon-high:** glossary notes: 5. §2.0: `disruption level` rendered 中斷梯級 where the English writes it
  out; the `(降載)` gloss left out on purpose (says so). §2.3: `probe` → 探測器; `segment` → 網段, not the glossary's
  纜段 (network segment, not cable segment). §2.4: `People's Liberation Army (PLA)` → 解放軍（PLA）. Slowest model on
  every file (§2.0 625 s, §2.3 651 s, §2.4 380 s) and the most thinking tokens (135814 in all).
- **gemini-4-argon-high:** glossary notes: 2. §2.0: the `(降載)` gloss left out on purpose (says so). §2.3: `probe`
  → 探測器. Fastest on §2.0 (136 s) and §2.4 (87 s); 578 s in all, second to neon.
- **gemini-3.8-flash-high:** glossary notes: none on any file (`- none` ×3), so its dropping of the `(降載)` gloss is
  not noted. Most CJK characters on §2.0 and §2.3 (§2.3 7023, against 6579–6704 for the others) and the largest
  translations in bytes (§2.3 26197 B). Second-slowest in total (839 s).

Sources: `check/<model-id>/summary.json` (`glossary_notes`, `cjk_chars`, `translation_bytes`), the
`<<<GLOSSARY-NOTES>>>` part of each reply in `output/<model-id>/`, and `output/run-log.md`. `output/raw/*/*.err` are
all empty.
