import { useCallback, useState } from 'react';
import type { Verdict, VerdictStore, Winner } from '@/lib/ui/verdicts';
import { useLocalStorage } from './useLocalStorage';

const STORE_KEY = 'nrr-verdicts';

export function useVerdicts() {
  const [store, setStore] = useLocalStorage<VerdictStore>(STORE_KEY, {});
  // Bumped on clear so keyed rows remount and drop their local note drafts.
  const [epoch, setEpoch] = useState(0);

  const setWinner = useCallback(
    (rowId: string, winner: Winner) => {
      setStore((prev) => {
        const current: Verdict | undefined = prev[rowId];
        const next: Winner | undefined = current?.winner === winner ? undefined : winner;
        return { ...prev, [rowId]: { ...current, winner: next } };
      });
    },
    [setStore],
  );

  const setNote = useCallback(
    (rowId: string, note: string) => {
      setStore((prev) => ({ ...prev, [rowId]: { ...prev[rowId], note } }));
    },
    [setStore],
  );

  const clearAll = useCallback(() => {
    setStore({});
    setEpoch((e) => e + 1);
  }, [setStore]);

  return { store, setWinner, setNote, clearAll, epoch };
}
