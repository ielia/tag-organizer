import type { TagRow } from './types';
import { MAX_ROWS } from './palette';

// crypto.randomUUID() only exists in secure contexts, so it is missing when the dev
// server is reached over plain HTTP on a LAN address. Row ids only need to be unique
// within a session, so fall back to a counter.
let rowIdCounter = 0;
export function newRowId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  rowIdCounter++;
  return `row-${Date.now().toString(36)}-${rowIdCounter.toString(36)}`;
}

const sortTags = (tags: string[]) => [...tags].sort((a, b) => a.localeCompare(b));

// Rows that lose their last tag are dropped.
const prune = (rows: TagRow[]) => rows.filter((r) => r.tags.length > 0);

const without = (row: TagRow, tags: Set<string>) => ({
  ...row,
  tags: row.tags.filter((t) => !tags.has(t)),
});

/** Move tags into an existing row, removing them from their source row if they had one. */
export function moveTagsToRow(
  rows: TagRow[],
  targetRowId: string,
  tags: string[],
  sourceRowId: string | null,
): TagRow[] {
  if (sourceRowId === targetRowId) return rows;
  const tagSet = new Set(tags);
  return prune(
    rows.map((r) => {
      if (r.id === sourceRowId) return without(r, tagSet);
      if (r.id === targetRowId) {
        const added = tags.filter((t) => !r.tags.includes(t));
        if (added.length === 0) return r;
        return { ...r, tags: sortTags([...r.tags, ...added]) };
      }
      return r;
    }),
  );
}

/** Copy tags into every listed row, leaving their source untouched. */
export function addTagsToRows(rows: TagRow[], rowIds: string[], tags: string[]): TagRow[] {
  const ids = new Set(rowIds);
  return prune(
    rows.map((r) => {
      if (!ids.has(r.id)) return r;
      const added = tags.filter((t) => !r.tags.includes(t));
      if (added.length === 0) return r;
      return { ...r, tags: sortTags([...r.tags, ...added]) };
    }),
  );
}

/** Move tags into a new row appended at the end. */
export function moveTagsToNewRow(
  rows: TagRow[],
  tags: string[],
  sourceRowId: string | null,
): TagRow[] {
  const tagSet = new Set(tags);
  const base = sourceRowId ? rows.map((r) => (r.id === sourceRowId ? without(r, tagSet) : r)) : rows;
  const next = prune([...base, { id: newRowId(), tags: sortTags(tags) }]);
  // Emptying the source row can free a slot, so judge the result rather than the input.
  return next.length > MAX_ROWS ? rows : next;
}
