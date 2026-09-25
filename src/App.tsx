import { useCallback, useEffect, useRef, useState } from 'react';
import Picker from './Picker';
import Sidebar from './Sidebar';
import TagList from './TagList';
import type { TagDrag, TagRow } from './types';
import { addTagsToRows, moveTagsToNewRow, moveTagsToRow } from './rowOps';
import { MAX_ROWS } from './palette';
import { TAG_ELLIPSIS, TAG_MAX_WIDTH, applyTagEllipsis } from './config';

const ALL_TAGS = [
  'React', 'TypeScript', 'JavaScript', 'CSS', 'HTML',
  'Node.js', 'Python', 'Rust', 'Go', 'Docker',
  'Kubernetes', 'AWS', 'Azure', 'GraphQL', 'REST',
  'MongoDB', 'PostgreSQL', 'Redis', 'Git', 'Linux',
  'Webpack', 'Vite', 'ESLint', 'Prettier', 'Jest',
  'Tailwind', 'SASS', 'WebSockets', 'OAuth', 'CI/CD',
  'A Very Very Very Long Tag Name That Should Definitely Need Two Lines To Fit',
];

/** Which drop target sits under the finger. */
function hitTest(x: number, y: number) {
  const el = document.elementFromPoint(x, y);
  const rowEl = el?.closest('[data-row-id]') as HTMLElement | null;
  if (rowEl) return { overRowId: rowEl.dataset.rowId ?? null, overNew: false };
  return { overRowId: null, overNew: !!el?.closest('.new-row-drop') };
}

export default function App() {
  const [rows, setRows] = useState<TagRow[]>([]);
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());
  const [drag, setDrag] = useState<TagDrag | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [tagEllipsis, setTagEllipsis] = useState(TAG_ELLIPSIS !== null);

  useEffect(() => {
    applyTagEllipsis(tagEllipsis ? TAG_MAX_WIDTH : null);
  }, [tagEllipsis]);

  const closeMenu = useCallback(() => setMenuOpen(false), []);
  const onDragDone = useRef<(() => void) | null>(null);

  const addToSelectedRows = useCallback(
    (tags: string[]) => setRows((prev) => addTagsToRows(prev, [...selectedRows], tags)),
    [selectedRows],
  );

  const addToNewRow = useCallback(
    (tags: string[]) => setRows((prev) => moveTagsToNewRow(prev, tags, null)),
    [],
  );

  const startTagDrag = useCallback(
    (tags: string[], sourceRowId: string | null, x: number, y: number, onDone?: () => void) => {
      onDragDone.current = onDone ?? null;
      setDrag({ tags, sourceRowId, x, y, ...hitTest(x, y) });
    },
    [],
  );

  // Touch drag session: follow the finger, drop on release.
  useEffect(() => {
    if (!drag) return;
    const active = drag;

    function onPointerMove(e: PointerEvent) {
      const hit = hitTest(e.clientX, e.clientY);
      setDrag((prev) => (prev ? { ...prev, x: e.clientX, y: e.clientY, ...hit } : prev));
    }

    function finish() {
      setDrag(null);
      onDragDone.current?.();
      onDragDone.current = null;
    }

    function onPointerUp(e: PointerEvent) {
      const hit = hitTest(e.clientX, e.clientY);
      if (hit.overRowId) {
        setRows(moveTagsToRow(rows, hit.overRowId, active.tags, active.sourceRowId));
      } else if (hit.overNew) {
        setRows(moveTagsToNewRow(rows, active.tags, active.sourceRowId));
      }
      finish();
    }

    // The gesture started from a stationary press, so no scroll is in flight yet;
    // a non-passive listener can still claim it. touch-action alone cannot, because
    // browsers read it when the gesture starts, not when the drag does.
    function blockScroll(e: TouchEvent) {
      e.preventDefault();
    }

    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
    window.addEventListener('pointercancel', finish);
    document.addEventListener('touchmove', blockScroll, { passive: false });
    return () => {
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      window.removeEventListener('pointercancel', finish);
      document.removeEventListener('touchmove', blockScroll);
    };
  }, [drag, rows]);

  return (
    <div className="shell">
      <header className="app-header">
        <button
          className="hamburger"
          onClick={() => setMenuOpen((prev) => !prev)}
          aria-label="Options"
          aria-expanded={menuOpen}
        >
          <span />
          <span />
          <span />
        </button>
        <span className="app-title">Tag Organizer</span>
      </header>

      <Sidebar
        open={menuOpen}
        onClose={closeMenu}
        tagEllipsis={tagEllipsis}
        onTagEllipsisChange={setTagEllipsis}
      />

      <div className="app">
      <div className="panel">
        <div className="panel-label">Top Left</div>
      </div>
      <Picker
        tags={ALL_TAGS}
        onTagDragStart={startTagDrag}
        selectedRowCount={selectedRows.size}
        canAddRow={rows.length < MAX_ROWS}
        onAddToSelectedRows={addToSelectedRows}
        onAddToNewRow={addToNewRow}
        showTagTitle={tagEllipsis}
      />
      <TagList
        rows={rows}
        onRowsChange={setRows}
        selected={selectedRows}
        onSelectedChange={setSelectedRows}
        drag={drag}
        onTouchDragStart={startTagDrag}
        showTagTitle={tagEllipsis}
      />
      <div className="panel">
        <div className="panel-label">Bottom Right</div>
      </div>
      </div>

      {drag && (
        <div className="drag-ghost touch-ghost" style={{ left: drag.x, top: drag.y }}>
          {drag.tags.map((tag) => (
            <span key={tag} className="balloon">
              <span className="balloon-text">{tag}</span>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
