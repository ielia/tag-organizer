import type { TagRow } from './types';
import type { DarkMode } from './config';
import { MAX_ROWS } from './palette';

const PREFIX = 'tag-organizer:';

/** localStorage throws when it is disabled or full, and holds whatever a user edited
    into it, so every read is validated and every call is guarded. */
function read(key: string): unknown {
  try {
    const raw = localStorage.getItem(PREFIX + key);
    return raw === null ? null : JSON.parse(raw);
  } catch {
    return null;
  }
}

function write(key: string, value: unknown) {
  try {
    localStorage.setItem(PREFIX + key, JSON.stringify(value));
  } catch {
    // Nothing to do: this session simply will not be restored.
  }
}

function isRow(value: unknown): value is TagRow {
  if (typeof value !== 'object' || value === null) return false;
  const row = value as Record<string, unknown>;
  return (
    typeof row.id === 'string' &&
    Array.isArray(row.tags) &&
    row.tags.length > 0 && // empty rows are deleted, so a stored one is corrupt
    row.tags.every((tag) => typeof tag === 'string')
  );
}

export function loadRows(): TagRow[] | null {
  const value = read('rows');
  if (!Array.isArray(value)) return null;
  return value.filter(isRow).slice(0, MAX_ROWS);
}

export const saveRows = (rows: TagRow[]) => write('rows', rows);

export function loadSelectedRows(): string[] | null {
  const value = read('selectedRows');
  if (!Array.isArray(value)) return null;
  return value.filter((id): id is string => typeof id === 'string');
}

export const saveSelectedRows = (ids: string[]) => write('selectedRows', ids);

export function loadTagEllipsis(): boolean | null {
  const value = read('tagEllipsis');
  return typeof value === 'boolean' ? value : null;
}

export const saveTagEllipsis = (value: boolean) => write('tagEllipsis', value);

const DARK_MODES: DarkMode[] = ['on', 'off', 'system'];

export function loadDarkMode(): DarkMode | null {
  const value = read('darkMode');
  return DARK_MODES.includes(value as DarkMode) ? (value as DarkMode) : null;
}

export const saveDarkMode = (mode: DarkMode) => write('darkMode', mode);
