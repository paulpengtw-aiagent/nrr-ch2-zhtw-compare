import { useEffect } from 'react';
import { parseRoundHash, readRememberedRound, rememberRound, type Round } from '@/lib/ui/round';
import type { Route } from '@/lib/ui/links';
import { useHashRoute } from './useHashRoute';

/**
 * Current round. A hash that names a round wins and is remembered in localStorage `nrr-round`;
 * an empty hash opens the remembered round (default 1).
 */
export function useRound(): { round: Round; route: Route } {
  const { hash } = useHashRoute();
  const parsed = parseRoundHash(hash);

  useEffect(() => {
    if (parsed.round !== null) rememberRound(parsed.round);
  }, [parsed.round]);

  return { round: parsed.round ?? readRememberedRound(), route: parsed.route };
}
