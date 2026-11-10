import { useSyncExternalStore } from 'react';
import { parseHash, type Route } from '@/lib/ui/links';

function subscribe(onChange: () => void) {
  window.addEventListener('hashchange', onChange);
  return () => window.removeEventListener('hashchange', onChange);
}

const getSnapshot = () => window.location.hash;
const getServerSnapshot = () => '';

/** Tracks `#/<section>/r<row>` in the URL. */
export function useHashRoute(): { hash: string; route: Route } {
  const hash = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  return { hash, route: parseHash(hash) };
}
