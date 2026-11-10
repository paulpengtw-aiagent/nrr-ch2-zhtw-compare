// Post-processing for a raw Gemini web reply.
// 1. trim; 2. strip an opening fence line (``` / ```` optionally followed by markdown|md)
//    and the LAST closing fence line (exactly ``` / ````), wherever it sits;
// 3. split at the LAST line equal to the glossary sentinel: before = translation, after = notes.

export const GLOSSARY_SENTINEL = '<<<GLOSSARY-NOTES>>>';

const FENCE_OPEN = /^`{3,4}(?:markdown|md)?\s*$/;
const FENCE_CLOSE = /^`{3,4}\s*$/;

export function processGemini(raw) {
  const text = String(raw).replace(/\r\n?/g, '\n').trim();
  let lines = text.split('\n');

  let fenceStripped = false;
  if (lines.length > 0 && FENCE_OPEN.test(lines[0].trim())) {
    lines = lines.slice(1);
    fenceStripped = true;
    for (let i = lines.length - 1; i >= 0; i--) {
      if (FENCE_CLOSE.test(lines[i].trim())) {
        lines.splice(i, 1);
        break;
      }
    }
  }

  let sIdx = -1;
  for (let i = lines.length - 1; i >= 0; i--) {
    if (lines[i].trim() === GLOSSARY_SENTINEL) {
      sIdx = i;
      break;
    }
  }
  const before = sIdx >= 0 ? lines.slice(0, sIdx) : lines;
  const after = sIdx >= 0 ? lines.slice(sIdx + 1) : [];

  const translation = before.join('\n').replace(/^(?:[ \t]*\n)+/, '').replace(/\s+$/, '') + '\n';
  const notes = after.filter((l) => l.trim() !== '').map((l) => l.replace(/\s+$/, ''));

  return { translation, notes, sentinel: sIdx >= 0, fenceStripped };
}
