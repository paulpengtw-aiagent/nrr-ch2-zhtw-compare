# NRR Chapter 2: zh-TW translation comparison

A static site (Vite + React + Tailwind, built into `docs/` for GitHub Pages) that compares machine
translations of Chapter 2 of the network resilience report, block by block. Each row can get a verdict
and a note; the overview tallies them.

There are two rounds, switched with the control at the top of the page:

- **Round 1** (`#/2.0`, `#/2.1/r12`, `#/overview`): original English. Kimi K3.1 Pro vs Gemini 3.6 Flash,
  with blind mode.
- **Round 2** (`#/r2/2.0`, `#/r2/2.0/r5`, `#/r2/overview`): Fable-rewritten English, Gemini 3.6 Flash only.
  There is no blind mode (one model).

## Commands

```bash
npm ci
npm run fetch                     # re-download sources and model output with gh api (pinned refs)
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
