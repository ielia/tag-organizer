/** Width ceiling applied to a tag balloon while "Manageable tag size" is on. */
export const TAG_MAX_WIDTH = '100%';

/**
 * Initial value of the tag width cap. '100%' keeps a tag within one line of its row
 * and ellipsises the overflow; null lets tags size to their content, which lets a long
 * tag scroll the list sideways. Toggled at runtime from the sidebar.
 */
export const TAG_ELLIPSIS: string | null = TAG_MAX_WIDTH;

/**
 * Drives the tag cap through CSS variables on the root element — the root, because the
 * picker's drag image is appended to document.body, outside the React tree.
 *
 * --row-track-min / --row-item-min free the grid track, the row and the tag area to
 * shrink below their content; without them a long tag widens the row and max-width: 100%
 * resolves against that widened box, so nothing ever truncates. The track minimum must
 * be min-content rather than auto: an auto minimum is clamped to a fixed track maximum.
 */
export function applyTagEllipsis(value: string | null) {
  const root = document.documentElement.style;
  root.setProperty('--tag-max-width', value ?? 'none');
  root.setProperty('--row-track-min', value === null ? 'min-content' : '0');
  root.setProperty('--row-item-min', value === null ? 'auto' : '0');
}

/** "system" follows the OS setting; the other two override it. */
export type DarkMode = 'on' | 'off' | 'system';

/** Initial value of the "Dark mode" option. */
export const DARK_MODE: DarkMode = 'system';

export const prefersDark = () =>
  typeof window.matchMedia === 'function' &&
  window.matchMedia('(prefers-color-scheme: dark)').matches;

/**
 * Resolves the mode to a concrete theme on <html>. Stylesheet rules key off
 * data-theme only, so "system" never leaks into CSS.
 */
export function applyDarkMode(mode: DarkMode) {
  const dark = mode === 'on' || (mode === 'system' && prefersDark());
  document.documentElement.dataset.theme = dark ? 'dark' : 'light';
}
