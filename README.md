# NRR Chapter 2: zh-TW translation comparison

A static site (Vite + React + Tailwind, built into `docs/` for GitHub Pages) that compares machine
translations of Chapter 2 of the network resilience report, block by block. Each row can get a verdict
and a note; the overview tallies them.

There are three rounds, switched with the control at the top of the page:

- **Round 1** (`#/2.0`, `#/2.1/r12`, `#/overview`): original English. Kimi K3.1 Pro vs Gemini 3.6 Flash,
  with blind mode.
- **Round 2** (`#/r2/2.0`, `#/r2/2.0/r5`, `#/r2/overview`): Fable-rewritten English, Gemini 3.6 Flash only.
  There is no blind mode (one model).
- **Round 3** (`#/r3/2.0`, `#/r3/2.3/r5`, `#/r3/overview`): the same English, four Gemini models via Antigravity
  side by side, plus the published zh-TW copy as a read-only reference column. Blind mode (譯本 A–D).

## Commands

```bash
npm ci
npm run fetch                     # rounds 1 and 2: re-download sources and model output with gh api (pinned refs)
npm run fetch <run-repo sha>      # round 3 only: English + published copy at 594b91a, run folder at <sha>
npm run selftest:r3               # round-3 build against tests/fixtures/r3 (parsers, chunks, notes); no network
npm run build                     # scripts/build-data.mjs (data -> src/generated/*.json), then vite build -> docs/
npx playwright install chromium   # once
npx playwright test               # e2e; serves docs/ on port 4173, so build first
npm run dev                       # local dev server
```

## Data layout

- `data/en`, `data/kimi`, `data/gemini`, `data/run`, `data/meta.json`: round 1.
- `data/r2/en`: round-2 English source (the Fable rewrite).
- `data/r2/gemini`: Gemini translations as parsed in the run folder, stored unedited.
- `data/r2/check`: the `--check` output, its README, and lint for the old and new English runs.
- `data/r2/run/run-log.md`: the Gemini run log (timings, errors, retries).
- `data/r2/meta.json`: hand-written round-2 facts (timings, attempt notes, row notes).
- `data/r2/fetch-manifest.json`: what the last `npm run fetch` retrieved.
- `src/generated/compare.json` (round 1) and `src/generated/compare-r2.json` (round 2) are written by
  `scripts/build-data.mjs`.

## Round 2

**What it is.** The English Chapter 2 was first rewritten into plainer English (Fable 5.2). Gemini 3.6 Flash
then translated that English to zh-TW with the same translation prompt as round 1. The glossary was
extended with the new labels. Gemini's web app ran at thinking level High, with one new chat per file.
The translations are shown as Gemini wrote them; nothing was edited. Error replies were retried with
Try again, and 2.1 was rerun in a fresh chat. The overview lists the timings and attempts for each file.

**Sources** (pinned commit SHAs, never branch names):

- English source: https://github.com/paulpengtw/network-resilience-report/tree/9b80936876b94bcdec36fd5a07b815d74fe7df8d/report/ch2
- Gemini run folder: https://github.com/paulpengtw-aiagent/gemini-web-runs/tree/6550aa39c459483478f3227d4a715fedc8241052/2026-11-10-nrr-ch2-plain-zhtw

`npm run fetch` reads the English at `9b80936` and, at `6550aa3`, the parsed translations (`check/parsed/`),
the run log (`output/gemini-3.6-flash/run-log.md`) and the `check/` files.

**Storage (browser localStorage).**

- `nrr-round`: `'1'` or `'2'`. A hash that names a round wins and updates this key. An empty hash opens
  the remembered round, which defaults to round 1.
- `nrr-verdicts-r2`: round-2 verdicts keyed by row id, `{"2.0-1": {"verdict": "good" | "ok" | "fix", "note": "..."}}`
  (通順 / 尚可 / 需修). Clearing in round 2 touches only this key.
- `nrr-verdicts` (round 1) is not read or written by round 2.

**Known problems.** These are rows whose text is wrong in the Gemini output. They are shown as row notes
inside the matching row, and the text is left as Gemini wrote it:

- 2.0 and 2.1: a full-width `）` closes a Markdown link, so the URL swallows the text after it
  (OONI, Al Jazeera, Domino Theory). The `--check` output reports both.
- 2.2: "about 50–60 times" became `五、六十倍（五、六十倍）`, which drops the digits and repeats the Chinese.
- 2.2: "The cause is either … or …" became `原因可能為…或…`, which is softer than the English.

**Length flag.** Round 2 has no second model to compare with, so the badge compares each row's Gemini CJK
character count with the English visible-character count. Each ratio is divided by the round median, and the
row is flagged when the result is outside 0.60 to 1.70 (only when Gemini has at least 8 CJK characters).
This is a normalised comparison. English and Chinese lengths do not map one-to-one, so the raw ratio is not
meaningful on its own.

**Lint caveat.** Lint (zhtw-mcp) counts surface patterns only: translationese, mainland usage, and other
findings. It does not measure whether the text reads clearly. The overview shows the counts per file and per
1,000 Han characters, old English run and new, with the caveat stated on the page.

**Check.** The structure check (`--check`) gives 2 warnings, both the broken links above. Sections 2.2 to 2.4
have no structural differences. The raw output is shown in a collapsible block on the overview.

**Timings.** From `run-log.md`. They were timed by hand, from the send (or Try again) click to the Copy button,
polled every 20 seconds, so each is ±20 seconds.

## Tests and screenshots

- `tests/e2e/site.spec.ts`, `layout.spec.ts`, `screenshots.spec.ts`: round 1, unchanged.
- `tests/e2e/round2.spec.ts`: round-2 routing, storage, alignment, notes, tally, copy, overview, overflow.
  It also writes `qa/r2-section-1440.png`, `qa/r2-section-402.png`, `qa/r2-overview-1440.png`,
  `qa/r2-overview-402.png`.

## Round 3

**What it is.** The same English Chapter 2 files (`2.0`, `2.3`, `2.4`, pinned at
[`594b91a`](https://github.com/paulpengtw/network-resilience-report/tree/594b91aeb7b9b6726830ad504d8c48483d6487d6/report/ch2))
translated by four models in Antigravity at thinking level High: Gemini 4 Neon, Gemini 4 Carbon, Gemini 4 Argon and
Gemini 3.8 Flash (column order). A fifth, read-only column shows the zh-TW copy published in the report repo at the same
SHA, labelled "Published (Gemini 4 Hydrogen High, #277)". It gets no verdict buttons.

**Refreshing the data.** The run folder is `paulpengtw-aiagent/gemini-web-runs/2026-11-26-nrr-zhtw-agy-compare/`.

```bash
npm run fetch <commit sha of gemini-web-runs>   # full or short SHA; resolved to the full SHA, never a branch
npm run build
npx playwright test tests/e2e/round3.spec.ts    # or the whole suite
```

The fetch replaces `data/r3/{en,published,run,parsed,output,check}` and records the run SHA in
`data/r3/fetch-manifest.json`. It reads `input/files.json`, `output/run-log.md`, `output/<model>/NN-<name>.md` (raw),
`check/<model>/parsed/NN-<name>.md` (shown) and `check/<model>/summary.json`. Any model or file not in the run folder is
shown as "尚未翻譯（not translated yet）". When a file was sent in chunks (`02a`, `02b`, …) and there is no whole-file
reply, the chunks are joined in order. `npm run fetch` with no argument still fetches rounds 1 and 2 only.

**Published copy freshness.** `i18n/zh-TW/stale.json` `current[path]` is the English commit the copy was synced to. The
copy is stale when the English blob at that commit differs from the English at `594b91a` (or the path is listed in
`stale`). Without an entry, the last commit dates of the two files are compared. The state shows in the column header.

**Alignment.** One row per English block. Each translation is aligned against the English on its own (round-1 align
code), so one model's structural drift does not shift the other columns. Extra blocks are folded into the previous
cell and marked 結構不一致.

**Length badge.** On rows where the longest and shortest model translations (CJK count, each at least 8) differ by more
than 1.70×.

**Row notes.** From `summary.json`: restored strings, link problems and skeleton differences. A finding goes on the row
whose model text (or English, for restored strings) contains its quoted text. Findings that match no row are listed on
the overview. The key names in `summary.json` are matched loosely (`restored*`, `*link*`, `*skeleton*`, `*check*`,
`*cjk*`, `pars*`), and the file can be keyed by file name, nested under `files`, or be a list.

**Timings and tokens.** From `output/run-log.md`, one line per call. A Markdown table header (`file`, `model`, `status`,
`seconds`, `tokens`) is used when present; otherwise the order time, file, model id, status, seconds, tokens. Calls
for the same model and file (retries, chunks) are summed.

**Storage (browser localStorage).**

- `nrr-round`: `'3'` for round 3.
- `nrr-verdicts-r3`: `{"2.0-1": {"pick": "<model id>" | "tie", "note": "..."}}`. Clearing in round 3 touches only this key.
- `nrr-r3-cols` (model ids and `published`) and `nrr-r3-cols-blind` (`A`–`D` and `published`): the two to four columns
  shown side by side.
- `nrr-blind-r3`, `nrr-show-en-r3`.

**Blind mode.** Models become 譯本 A–D, shuffled per file with a fixed seed (`nrr-r3-2026-11-26:<file>`), so the
letters are the same for everyone. The overview is hidden until 揭曉模型.

**Fixture preview.** `R3_DATA_DIR=tests/fixtures/r3 npm run build` builds round 3 from the fixture (made from the real
English and published copy). Use it only for a local look; rebuild without it before committing.

**Tests.** `tests/e2e/round3.spec.ts` reads `src/generated/compare-r3.json`, so it passes with placeholders and after
the run folder fills in. It writes `qa/r3-section-1440.png`, `qa/r3-section-402.png` and `qa/r3-overview-1440.png`.

