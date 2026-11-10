import { buildHash, OVERVIEW_ID, parseHash, type Route } from './links';

/** Round 1: original English, Kimi vs Gemini. Round 2: Fable-rewritten English, Gemini only. */
export type Round = 1 | 2;

export const ROUND_KEY = 'nrr-round';
const R2_SEGMENT = 'r2';

export const TITLE_R2 = '第 2 章繁中翻譯比較：第二輪（Fable 改寫英文 × Gemini 3.6 Flash）';

/**
 * Round named by a hash. `#/r2/...` is round 2; any other non-empty hash is round 1 (its route is parsed
 * exactly as before); an empty hash names no round.
 */
export function parseRoundHash(hash: string): { round: Round | null; route: Route } {
  const parts = hash.replace(/^#\/?/, '').split('/').filter(Boolean);
  if (parts[0] === R2_SEGMENT) return { round: 2, route: parseHash(`#/${parts.slice(1).join('/')}`) };
  if (parts.length === 0) return { round: null, route: parseHash('') };
  return { round: 1, route: parseHash(hash) };
}

/** Hash for a section (or the overview) in the given round. Round 1 uses the unchanged round-1 hashes. */
export function buildRoundHash(round: Round, sectionId: string, rowN?: number): string {
  if (round === 1) return buildHash(sectionId, rowN);
  if (sectionId === OVERVIEW_ID) return `#/${R2_SEGMENT}/${OVERVIEW_ID}`;
  return rowN === undefined ? `#/${R2_SEGMENT}/${sectionId}` : `#/${R2_SEGMENT}/${sectionId}/r${rowN}`;
}

/** Raw localStorage (not JSON) so the value is the plain string '1' or '2'. */
export function readRememberedRound(): Round {
  try {
    return window.localStorage.getItem(ROUND_KEY) === '2' ? 2 : 1;
  } catch {
    return 1;
  }
}

export function rememberRound(round: Round): void {
  try {
    window.localStorage.setItem(ROUND_KEY, String(round));
  } catch {
    // storage unavailable: the hash still decides the round
  }
}
