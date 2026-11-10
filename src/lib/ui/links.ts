export interface Route {
  sectionId: string | null;
  rowN: number | null;
  overview: boolean;
}

export const OVERVIEW_ID = 'overview';

/** Parses `#/2.1`, `#/2.1/r12` and `#/overview`. */
export function parseHash(hash: string): Route {
  const parts = hash.replace(/^#\/?/, '').split('/').filter(Boolean);
  const first = parts[0];
  const second = parts[1];
  const rowMatch = second ? /^r(\d+)$/.exec(second) : null;
  return {
    sectionId: first && /^\d+(?:\.\d+)*$/.test(first) ? first : null,
    rowN: rowMatch ? Number(rowMatch[1]) : null,
    overview: first === OVERVIEW_ID,
  };
}

/** Hash for a section, a row inside it, or the overview tab. */
export function buildHash(sectionId: string, rowN?: number): string {
  if (sectionId === OVERVIEW_ID) return `#/${OVERVIEW_ID}`;
  return rowN === undefined ? `#/${sectionId}` : `#/${sectionId}/r${rowN}`;
}

/** Full URL including origin, path, query and hash. */
export function shareUrl(hash: string): string {
  const { origin, pathname, search } = window.location;
  return `${origin}${pathname}${search}${hash}`;
}
