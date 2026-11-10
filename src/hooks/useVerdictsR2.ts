import { useCallback, useState } from 'react';
import type { Verdict2 } from '@/types';
import type { VerdictStore2 } from '@/lib/ui/verdicts2';
import { useLocalStorage } from './useLocalStorage';

export const STORE_KEY_R2 = 'nrr-verdicts-r2';

/** Round-2 verdicts and notes. Separate from round 1's `nrr-verdicts`. */
export function useVerdictsR2() {
  const [store, setStore] = useLocalStorage<VerdictStore2>(STORE_KEY_R2, {});
  // Bumped on clear so keyed rows remount and drop their local note drafts.
  const [epoch, setEpoch] = useState(0);

  const setVerdict = useCallback(
    (rowId: string, verdict: Verdict2) => {
      setStore((prev) => {
        const current = prev[rowId];
        const next: Verdict2 | undefined = current?.verdict === verdict ? undefined : verdict;
        return { ...prev, [rowId]: { ...current, verdict: next } };
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

  return { store, setVerdict, setNote, clearAll, epoch };
}
