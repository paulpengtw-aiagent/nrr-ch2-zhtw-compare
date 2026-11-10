# Gemini web run: NRR ch2 (plain-English rewrite) → zh-TW, 3.6 Flash, Thinking level High (2026-11-10)

- Account: 11341418.scu.edu.tw@gmail.com (Plus), gemini.google.com/app via ego-browser.
- Before the run: model 3.1 Pro, Thinking level **Low**.
- Set: model 3.6 Flash, Thinking level High (`settings.png`). The settings were checked on every
  fresh page load of /app and set again where needed, then verified (picker label
  "Flash High", 3.6 Flash and High aria-checked) before each send.
- Each request: new chat, two attachments via Upload & tools > Upload files
  (`system-prompt.md` + the one `user-NN-….md`), the fixed message, sent once.
- Seconds = send click → reply Copy button seen, polled every 20 s (so ±20 s).
- Bytes = `wc -c` of the clipboard saved verbatim with `pbpaste` (no trailing newline added).

| # | File | Chat URL | Seconds | Bytes | Notes |
|---|---|---|---|---|---|
| 01 | 01-2.0-disruption-ladder.md | https://gemini.google.com/app/f69ca4c95050309d | 133 | 6582 | one code block, nothing outside; copied with the block's Copy code button; sentinel present; no retry/fallback |
| 02 | 02-2.1-50-percent-degradation.md | https://gemini.google.com/app/159c5e2d7aed8dd4 | – | – | FAILED, no file: attempt 1 error reply "I seem to be encountering an error…" (Copy at 152 s); Redo > Try again #1 (after 77 s): same error at ≤21 s; Try again #2 (after 60 s): "I encountered an error doing what you asked. Could you try again?" at 357 s; no code block, no fallback/limit notice; retries exhausted |
| 03 | 03-2.2-global-cutoff.md | https://gemini.google.com/app/4939ca98a9038f5a | 199 | 26445 | attempt 1: error reply "I encountered an error doing what you asked…" at 71 s; Redo > Try again #1 after 60 s succeeded (draft 2/2; seconds are from the Try again click); one code block, nothing outside; copied with the block's Copy code button; sentinel present; no fallback |
| 04 | 04-2.3-island-partition.md | https://gemini.google.com/app/d1a550592d5526ce | 178 | 22982 | attempt 1: refusal-style error reply "I'm having a hard time fulfilling your request…" at 120 s, no code block; Redo > Try again #1 after 60 s succeeded (draft 2/2; seconds are from the Try again click); one code block, nothing outside; copied with the block's Copy code button; sentinel present; no fallback |
| 05 | 05-2.4-interfaces.md | https://gemini.google.com/app/ed3f3f406700597a | 56 | 979 | attempt 1: error reply "Sorry, something went wrong. Please try your request again." at 18 s; Redo > Try again #1 after 60 s succeeded (draft 2/2; seconds are from the Try again click, ±20 s); one code block, nothing outside; copied with the block's Copy code button; sentinel present; no fallback |
| 02 (retry run) | 02-2.1-50-percent-degradation.md | https://gemini.google.com/app/f5abe8be20e70c29 | 142 | 20578 | separate retry run (new task, fresh NEW chat, not the failed chat above); settings before: 3.1 Pro / Low; set and verified 3.6 Flash + High; first attempt succeeded; one code block, nothing outside; copied with the block's Copy code button; sentinel present; no retry/fallback |

## Finish

- 4 of 5 files saved in the main run (01, 03, 04, 05); 02 was added by the retry run below, so all 5 are present. Every saved file ends with `<<<GLOSSARY-NOTES>>>` + `- none`.
  Each was a single ````markdown block with nothing outside, so there are no `part2` files.
- 02 failed in the main run: the first attempt and both Redo > Try again retries ended in Gemini error replies
  with no code block, so there is no `02-…` file. 03, 04 and 05 each needed one retry (error-style
  first replies). No "another model"/high-demand notice and no "Limit reached" at any point.
- Restored afterwards: model 3.1 Pro, Thinking level Low (confirmed after a fresh page load).
  No chats were deleted; no other settings were changed.

## Retry run for 02

- Fresh NEW chat (https://gemini.google.com/app/f5abe8be20e70c29), same attachments and message (NN=02),
  3.6 Flash + High confirmed before the send. Copy button at 142 s; 20578 bytes; ends with
  `<<<GLOSSARY-NOTES>>>` + `- none`; no error, retry, fallback or limit notice, so the 5-minute second chat was not needed.
- Settings restored to 3.1 Pro / Low afterwards (confirmed after a fresh page load).
