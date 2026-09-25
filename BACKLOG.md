# Backlog

Wanted but not scheduled. One heading per item; remove an entry when it ships.

## Per-theme row colours

Two colours per list index, one for dark mode and one for light, still applied positionally
as today (`index % length`).

**Status:** wanted; implementation not chosen. Light-mode colours not picked either — the
current eight were tuned against a dark panel and will need deeper values to read on white.

The constraint either option has to deal with: row tints are built in JS today, by
concatenating alpha onto the hex — `PALETTE[i] + '22'` for the row background, `+ '44'` and
`+ '66'` for the tag fill and border.

### Option A — two arrays in `palette.ts`

`PALETTE_DARK` and `PALETTE_LIGHT`, the second typed
`{ [K in keyof typeof PALETTE_DARK]: string }` so the lengths cannot drift and `MAX_ROWS`
stays derived from one of them. `App` holds the resolved theme as state — `applyDarkMode`
resolves "system" straight onto `data-theme`, so React never learns the answer — and passes
the chosen array to `TagList`, whose colour code is otherwise unchanged.

Smaller change, keeps the existing hex-plus-alpha maths. Adds a second source of theme
truth in React alongside the `data-theme` attribute.

### Option B — row colours as CSS tokens

Eight tokens per theme beside the others at the top of `index.css`, with the row carrying a
`color-N` class and the tints coming from `color-mix(in srgb, var(--row) 13%, transparent)`
instead of string concatenation.

Fits the theming already in place, needs no React state, and the theme switch repaints the
rows for free. Larger change to how `TagList` renders, moves colour out of `palette.ts`
(which `MAX_ROWS` derives from), and would be the first `color-mix` in the codebase —
supported in current Chrome, Safari and Firefox, not in older ones.
