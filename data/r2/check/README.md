# Check: Gemini 3.6 Flash, NRR Chapter 2 plain-English rewrite → zh-TW (2026-11-10)

Raw replies: `../output/gemini-3.6-flash/` at gemini-web-runs `ea21546`. English source:
`paulpengtw/network-resilience-report@9b80936876b94bcdec36fd5a07b815d74fe7df8d` `report/ch2/`.
No paid API calls. Nothing in the model output was edited.

## Method

- **Parsing:** each raw reply went through the harness's own `parse_reply`, `assemble` and `completeness_problem`
  (`scripts/translate_kimi.py`, `zhtw-compare-ch2@c7ece9f5`), imported unchanged (`scripts/parse.py`). The results are in `parsed/`.
  None of the clipboard files had an outer fence (they were copied with the block's Copy code button), so there was nothing to strip.
  All five replies are complete, each ending in `<<<GLOSSARY-NOTES>>>` followed by `- none`, so there are 0 glossary notes.
- **Structure check:** the parsed files were copied into a local, unpushed clone at `i18n/zh-TW/report/ch2/`,
  then `python3 scripts/translate_kimi.py --check --files report/ch2/2.0…2.4` was run (output in `check-output.txt`).
- **Lint:** `zhtw-mcp lint --content-type markdown --format compact`, the sysprog21/zhtw-mcp release `latest`
  (x86_64 Linux, SHA256SUMS verified). Categories as in `compare/gemini-run.json`: translationese,
  mainland usage (the `cross_strait` rule family), and other. Each output line counts once. With this binary,
  re-linting the earlier old-English run reproduces its published totals exactly, both per file and overall
  (106 = 86/17/3). "Han chars" counts CJK ideographs in the parsed translation (`scripts/lint.py`).
- **Facts:** numbers, years, citation link texts, inference markers and labels (`scripts/facts.py`, results in `facts-new.json`),
  links and `google.com/search` wrappers (`scripts/links.py`), and hedge words (`scripts/hedges.py`, results in `hedges-new.txt`).

## `--check`

2 warnings (exit 1). Both are **broken links**: Gemini closed the Markdown link with a full-width `）` instead of `)`,
so the URL swallows the text that follows it. The old-English run had 0 such breaks.

- 2.0 l.18: `[OONI, November 2019](https://ooni.org/post/2019-iran-internet-blackout/）），到…`. The Al Jazeera link
  in the same paragraph is broken the same way (`…breaks-grim-record/））。§2.2…`).
- 2.1 l.21: `[Domino Theory, Taiwan Internet Cable Problems](https://dominotheory.com/taiwans-internet-cable-problems-run-deep/）。因此…`.

2.2, 2.3 and 2.4 have no differences: headings, tables, markers and all link URLs match the source.

## Lint, old English run → new English run

T/M/O = translationese / mainland usage / other. The rate is lint lines per 1,000 Han characters.

| File | Old: lint (T/M/O) | Old Han chars | Old per 1k | New: lint (T/M/O) | New Han chars | New per 1k |
|---|---|---|---|---|---|---|
| 2.0-disruption-ladder.md | 5 (2/2/1) | 1103 | 4.53 | 8 (5/3/0) | 1756 | 4.56 |
| 2.1-50-percent-degradation.md | 33 (30/3/0) | 4223 | 7.81 | 43 (34/7/2) | 4769 | 9.02 |
| 2.2-global-cutoff.md | 31 (22/8/1) | 5445 | 5.69 | 34 (26/7/1) | 6141 | 5.54 |
| 2.3-island-partition.md | 37 (32/4/1) | 5419 | 6.83 | 42 (36/5/1) | 6079 | 6.91 |
| 2.4-interfaces.md | 0 (0/0/0) | 227 | 0.0 | 0 (0/0/0) | 266 | 0.0 |
| TOTAL | 106 (86/17/3) | 16417 | 6.46 | 127 (101/22/4) | 19011 | 6.68 |

The "other" lines in the new run are `ai_style` ×3 (2 in 2.1, 1 in 2.2) and `grammar` ×1 (2.3). Raw lines are in `lint-new.txt` and `lint-old.txt`.
The new English produces 16% more Chinese (19011 vs 16417 Han characters). The lint rate barely moves overall
(6.46 → 6.68 per 1k). §2.1 got worse (7.81 → 9.02), and §2.0, §2.2 and §2.3 are flat.

## Links, numbers, dates, citations

- **Links:** the counts match in every file (2/25/37/10/0). Apart from the 3 breaks above, every URL is identical.
  There are **0** `https://www.google.com/search?q=` wrappers and 0 bare URLs.
- **Years and citations:** the per-file year counts match. The digits in every citation link text match the English.
- **Numbers:** every figure in the English appears in the Chinese, with two exceptions:
  - 2.2 l.109: "about 50–60 times (五、六十倍)" became `五、六十倍（五、六十倍）`. The Arabic figure is dropped, and the
    Chinese parenthetical is duplicated. The meaning is the same.
  - 2.2: "19.2 million speed tests" became `1920 萬`, which is correct.
  - The extra numbers in the Chinese are month names and number words written as digits (`11 月`, `第 3 章`, …). No figure was changed.
- **2.4:** the last two English sentences ("Chapters 2 and 3 do not use… Chapters 2 and 3 also do not name…") are merged into one
  sentence ("第 2 章與第 3 章並未…，亦未…"). Content is kept.

## Inference and hedge markers

| File | EN structural / inference markers | ZH `*（依據…）*` markers (結構性推論 / 推論；未經獨立證實) | Hedge words EN / ZH |
|---|---|---|---|
| 2.0 | 0 / 0 | 0 (0 / 0) | 3 / 3 |
| 2.1 | 7 / 0 | 7 (7 / 0) | 15 / 16 |
| 2.2 | 2 / 1 | 3 (2 / 1) | 9 / 10 |
| 2.3 | 18 / 8 | 26 (18 / 8) | 2 / 2 |
| 2.4 | 0 / 0 | 0 (0 / 0) | 1 / 2 |

Every marker is italic, opened and closed. In the hedge column, the one extra in 2.2 is at l.83: "The cause is either coordinated physical damage
or a submarine landslide" became `原因可能為…或…`, which softens it slightly. The extra in 2.4 comes from "might produce any level, or none" being rendered with 可能 twice. Neither is a fact change.

## Glossary labels (new renderings)

Every new label uses the glossary rendering in every occurrence:
時間歷程 (`### 時間歷程（Course over time）`), `**事件經過。**`, `### 第 3 章對應內容（In Chapter 3）`,
`**對台灣的適用程度：**` with 直接適用／部分適用／僅機制適用 (each grade count equals the English), `**區分各模擬情境。**`,
`### 失效樣貌（What the failure looks like）`, `**如何與「…」區分。**` (with the scenario names from the glossary),
半部 (57 vs 56 English half/halves in §2.3; 兩半部, 另一半部, 北半部, 南半部), 升級階梯 (5/5), and 復原路徑 (5/5).
The §2.0 reading key names all of these as well. None of the old renderings (情節輪廓, 辨識區分點, 台灣適用性, 第 3 章指引, 時間樣貌,
標準模擬情境) appears. **Deviations: none.** 2.2's "at half scale" became 半數規模, which is correct: it is not the Island Partition half.
