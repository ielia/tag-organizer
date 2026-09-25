# CLAUDE.md

Directives for Claude Code when working in this repository.

## Git

- Never run any `git` command, for any reason. Not `commit`, not `add`, not `push`, not
  `checkout`, not `branch`, not `stash` — and not read-only ones like `status`, `log`,
  `diff`, or `show`. Do not create branches, pull requests, or tags, and do not edit
  anything under `.git/`.
- Version control is the human's alone. If something would be easier with git history,
  say what you would like to know and let the user run it and paste the result.
- Leave the working tree in a state the user can inspect and commit themselves; never
  revert, discard, or restore files through git to "clean up" after yourself.

## Verification

- After any source change, run `npm run build`. It type-checks with `tsc` before bundling
  and is the only automated check in this project. Do not report a change as done until it passes.
- There is no test suite, linter, or formatter. Do not add one, invent test commands, or
  claim tests were run.
- For anything interactive — drag, drop, marquee, reorder — say plainly that it needs manual
  verification in `npm run dev`. Never assert that drag behaviour works from reading code alone.

## Scope

- Frontend only. Do not add a backend, router, state-management library, CSS framework,
  or component library.
- Never install a dependency without asking first. No `npm install <pkg>`, `npm uninstall`,
  `npm update`, or hand-editing `package.json` / `package-lock.json` to add, remove, or bump
  a package — propose it, say why, and wait for a yes. Plain `npm install` to restore the
  existing lockfile is fine.
- Solve problems with what is already here (React, TypeScript, Vite) before proposing
  anything new. A small amount of local code beats a new dependency.
- Keep state where it is: the row list lives in `App.tsx`; `Picker` and `TagList` own only
  their own interaction state. Do not introduce a store or context to move it.
- Rows and the sidebar options persist to `localStorage` through `src/storage.ts`. Every
  read is validated there, because storage can hold anything a user typed into it, and
  every call is wrapped — `localStorage` throws outright when disabled or full. A new
  persisted value gets its own validated loader, never a bare `JSON.parse`.

## Code conventions

- TypeScript is `strict` with `noUnusedLocals` and `noUnusedParameters`. Unused bindings
  break the build — remove them rather than prefixing with `_` or disabling the check.
- Follow the existing style: function components with hooks, named `function` declarations
  for handlers, `type`-only imports for types, two-space indent, single quotes.
- Styling is plain CSS in `src/index.css`, addressed by class name. Add rules there.
- Never write a colour literal in a rule. Every colour is a theme token defined once at the
  top of `index.css` for `[data-theme="dark"]` and `[data-theme="light"]`; a new colour
  means a new token in both themes. Rules key off `data-theme` only — `applyDarkMode`
  resolves "system" to one of the two, so nothing keys off `prefers-color-scheme`.
  Do not use inline styles except for values computed at runtime (palette colors, drag
  geometry), and do not introduce CSS modules or styled-components.
- Shared types go in `src/types.ts`, colors in `src/palette.ts`. Do not duplicate either.
- The `@media` blocks must stay at the end of `index.css`. Media queries add no
  specificity, so they beat the rules they override (`.picker`, `.tag-list`, `.select-btn`)
  by source order alone — moved earlier, they silently stop applying.

## Rules specific to this code

These encode bugs that were already fixed. Re-breaking them is a regression.

- Tags are never removed from the picker. A tag may appear in any number of rows.
- Row color is positional — `PALETTE[index % PALETTE.length]`, never stored per row.
- The list holds at most `MAX_ROWS` rows, which is `PALETTE.length` — one row per colour.
  Derive it from the palette; never hard-code 8. `moveTagsToNewRow` is the single gate that
  enforces it, so every path that can create a row must go through that helper.
- A row that loses its last tag is deleted. Every tag move goes through the helpers in
  `src/rowOps.ts`, which prune empty rows and keep row tags sorted by `localeCompare` and
  unique — do not reimplement that merge logic in a handler. `TagList`'s other mutations
  (delete row, remove tag) go through its local `onRowsChange` wrapper, which also prunes.
- Tags can be dragged by three routes; a change to one must not break the others:
  HTML5 drag-and-drop for mouse, a long-press pointer drag for touch and pen
  (`useLongPressDrag`, session state owned by `App`), and pointer events for row reordering.
  When touching the HTML5 path, check `effectAllowed` on the source still matches the
  `dropEffect` set in `dragover` — a mismatch makes drops fail silently with no error.
- The touch path finds its drop target with `elementFromPoint`, so rows must keep their
  `data-row-id` attribute and anything floating above the finger must stay
  `pointer-events: none`.
- `TagList` renders the dragged row twice during reorder: a collapsed in-flow placeholder
  and a fixed-position floating clone. Any element added to a row must be added to the
  clone too, or multi-line rows collapse mid-drag.
- A tag balloon is built in four places: the picker, the list rows, the floating clone, and
  the two drag ghosts (`App.tsx`, and the imperative one in `Picker.tsx`). All of them need
  the same `<span className="balloon-text">` around the tag name, or tags render
  inconsistently between the list and a drag preview.
- Tag width is capped through `applyTagEllipsis` in `src/config.ts`, which sets CSS
  variables on the root element — the root, because the picker's drag image lives outside
  the React tree on `document.body`. `main.tsx` applies `TAG_ELLIPSIS` before the first
  paint; the sidebar switch re-applies it at runtime. Keep the three variables in that one
  function; setting `--tag-max-width` alone does not truncate anything.
- `GAP` in `TagList.tsx` must match the `gap` of `.tag-list-rows` in `index.css`. Change both.
- Do not "simplify" the `didDrag` ref, its `requestAnimationFrame` reset in `onDragEnd`, or
  the `preventDefault()` guards in `onDragStart` / `onRowDragStart`. Each works around a
  specific browser behaviour and looks redundant until it is removed.

## Housekeeping

- `session-<date>.md` files log the requests that shaped this code, one file per
  conversation. At the start of every new conversation in this repository, create a new
  `session-<YYYY-MM-DD>.md` before doing anything else; if a file for today already exists
  from an earlier conversation, add a numeric suffix (`session-2026-09-24-2.md`). Never
  append this conversation's requests to a previous conversation's file.
- Record each request in that file as it comes in, in the user's own terms — what was asked,
  not how it was implemented. Keep the numbered format used by the existing session files.
- Never create or modify `README.md` unless the user explicitly asks for it. Do not update
  it as a side effect of a code change, and do not offer to keep it in sync. When the user
  does ask, keep it limited to setup and run instructions for a human.
- Deferred work is tracked in `BACKLOG.md`. Check it before proposing new work, and move an
  item out of it when it ships.
