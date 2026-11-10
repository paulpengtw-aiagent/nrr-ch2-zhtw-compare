import { useCallback, useState } from 'react';
import { DEFAULT_PAIR, type Pair } from '@/lib/ui/models';
import { readStorage, useLocalStorage, writeStorage } from './useLocalStorage';

type PairMap = Record<string, Pair>;

const MAP_KEY = 'nrr-blind-map';

/** Randomises left/right once per section and persists the result so it stays stable. */
function ensurePairs(ids: string[]): PairMap {
  const map: PairMap = { ...readStorage<PairMap>(MAP_KEY, {}) };
  let changed = false;
  for (const id of ids) {
    if (!map[id]) {
      map[id] =
        Math.random() < 0.5
          ? { left: 'kimi', right: 'gemini' }
          : { left: 'gemini', right: 'kimi' };
      changed = true;
    }
  }
  if (changed) writeStorage(MAP_KEY, map);
  return map;
}

export function useBlind(sectionIds: string[]) {
  const [blind, setBlind] = useLocalStorage<boolean>('nrr-blind', false);
  const [pairs] = useState<PairMap>(() => ensurePairs(sectionIds));

  const pairFor = useCallback(
    (sectionId: string): Pair => (blind ? (pairs[sectionId] ?? DEFAULT_PAIR) : DEFAULT_PAIR),
    [blind, pairs],
  );

  const reveal = useCallback(() => setBlind(false), [setBlind]);

  return { blind, setBlind, reveal, pairFor };
}
