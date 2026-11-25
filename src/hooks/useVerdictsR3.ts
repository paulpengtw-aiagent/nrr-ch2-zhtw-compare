import { useCallback, useState } from 'react';
import type { Pick3, VerdictStore3 } from '@/lib/ui/verdicts3';
import { useLocalStorage } from './useLocalStorage';

export const STORE_KEY_R3 = 'nrr-verdicts-r3';

/** Round-3 picks and notes. Separate from rounds 1 and 2. Pressing the current pick again clears it. */
export function useVerdictsR3() {
  const [store, setStore] = useLocalStorage<VerdictStore3>(STORE_KEY_R3, {});
  const [epoch, setEpoch] = useState(0);

  const setPick = useCallback(
    (rowId: string, pick: Pick3) => {
      setStore((prev) => {
        const current = prev[rowId];
        return { ...prev, [rowId]: { ...current, pick: current?.pick === pick ? undefined : pick } };
      });
    },
    [setStore],
  );

  const setNote = useCallback(
    (rowId: string, note: string) => setStore((prev) => ({ ...prev, [rowId]: { ...prev[rowId], note } })),
    [setStore],
  );

  const clearAll = useCallback(() => {
    setStore({});
    setEpoch((e) => e + 1);
  }, [setStore]);

  return { store, setPick, setNote, clearAll, epoch };
}
