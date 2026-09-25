import { useState, useRef, useCallback, useEffect, type Dispatch, type DragEvent, type MouseEvent, type SetStateAction } from 'react';
import type { TagDrag, TagRow } from './types';
import { MAX_ROWS, PALETTE } from './palette';
import { moveTagsToNewRow, moveTagsToRow } from './rowOps';
import { useLongPressDrag } from './useLongPressDrag';

interface TagListProps {
  rows: TagRow[];
  onRowsChange: (rows: TagRow[]) => void;
  /** Checked row ids. Owned by App so the picker's actions can target them. */
  selected: Set<string>;
  onSelectedChange: Dispatch<SetStateAction<Set<string>>>;
  /** In-flight touch drag, owned by App; used to highlight the drop target. */
  drag: TagDrag | null;
  onTouchDragStart: (
    tags: string[],
    sourceRowId: string | null,
    x: number,
    y: number,
    onDone?: () => void,
  ) => void;
  /** Truncated tags are unreadable, so hovering must reveal the full name. */
  showTagTitle: boolean;
}

interface ReorderState {
  rowId: string;
  offsetY: number;
  rowHeight: number;
  rowWidth: number;
  rowLeft: number;
  currentY: number;
  dropIdx: number;
  sourceIdx: number;
}

const GAP = 4; // must match .tag-list-rows gap
const EDGE = 48; // px from a list edge where auto-scroll kicks in
const EDGE_SPEED = 720; // px per second at the very edge

export default function TagList({
  rows,
  onRowsChange: onRowsChangeProp,
  selected,
  onSelectedChange: setSelected,
  drag,
  onTouchDragStart,
  showTagTitle,
}: TagListProps) {
  const onRowsChange = useCallback(
    (newRows: TagRow[]) => onRowsChangeProp(newRows.filter((r) => r.tags.length > 0)),
    [onRowsChangeProp],
  );

  const [lastClickedId, setLastClickedId] = useState<string | null>(null);
  const [dragOverRowId, setDragOverRowId] = useState<string | null>(null);
  const [dragOverNew, setDragOverNew] = useState(false);
  const [reorder, setReorder] = useState<ReorderState | null>(null);
  const reordering = reorder !== null;
  const rowRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const listRef = useRef<HTMLDivElement>(null);
  const pointerY = useRef(0);

  const handleCheckboxClick = useCallback(
    (rowId: string, e: MouseEvent) => {
      setSelected((prev) => {
        const next = new Set(prev);
        if (e.shiftKey && lastClickedId) {
          // Copy the active row's checked state to all rows in the range
          const activeChecked = prev.has(lastClickedId);
          const ids = rows.map((r) => r.id);
          const from = ids.indexOf(lastClickedId);
          const to = ids.indexOf(rowId);
          const [start, end] = from < to ? [from, to] : [to, from];
          for (let i = start; i <= end; i++) {
            if (activeChecked) next.add(ids[i]);
            else next.delete(ids[i]);
          }
        } else {
          if (next.has(rowId)) next.delete(rowId);
          else next.add(rowId);
        }
        return next;
      });
      setLastClickedId(rowId);
    },
    [lastClickedId, rows],
  );

  const longPress = useLongPressDrag<{ tag: string; rowId: string }>(({ tag, rowId }, x, y) => {
    onTouchDragStart([tag], rowId, x, y);
  });

  function onTagDragStart(e: DragEvent, tag: string, rowId: string) {
    e.stopPropagation();
    e.dataTransfer.setData('text/plain', tag);
    e.dataTransfer.setData('application/x-source-row', rowId);
    e.dataTransfer.effectAllowed = 'copyMove';
    (e.target as HTMLElement).classList.add('dragging');
  }

  function onTagDragEnd(e: DragEvent) {
    (e.target as HTMLElement).classList.remove('dragging');
  }

  function removeTagFromRow(rowId: string, tag: string) {
    onRowsChange(
      rows.map((r) =>
        r.id === rowId ? { ...r, tags: r.tags.filter((t) => t !== tag) } : r,
      ),
    );
  }

  function onRowDragStart(e: DragEvent) {
    if (!(e.target as HTMLElement).closest('.balloon')) {
      e.preventDefault();
    }
  }

  function deleteRow(rowId: string) {
    onRowsChange(rows.filter((r) => r.id !== rowId));
    setSelected((prev) => {
      const next = new Set(prev);
      next.delete(rowId);
      return next;
    });
  }

  // --- Pointer-based row reorder ---
  function onHandlePointerDown(e: React.PointerEvent, rowId: string) {
    e.preventDefault();
    const rowEl = rowRefs.current.get(rowId);
    if (!rowEl) return;
    const rect = rowEl.getBoundingClientRect();
    const sourceIdx = rows.findIndex((r) => r.id === rowId);
    pointerY.current = e.clientY;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    setReorder({
      rowId,
      offsetY: e.clientY - rect.top,
      rowHeight: rect.height,
      rowWidth: rect.width,
      rowLeft: rect.left,
      currentY: e.clientY,
      dropIdx: sourceIdx,
      sourceIdx,
    });
  }

  // Compute drop index from midpoints of non-dragged rows.
  const computeDropIdx = useCallback((clientY: number, prev: ReorderState) => {
    const listEl = listRef.current;
    if (!listEl) return prev.dropIdx;
    const listRect = listEl.getBoundingClientRect();
    const relY = clientY - listRect.top + listEl.scrollTop;

    const otherRows = rows.filter((r) => r.id !== prev.rowId);
    let dropIdx = otherRows.length;
    let accum = 0;
    for (let i = 0; i < otherRows.length; i++) {
      const el = rowRefs.current.get(otherRows[i].id);
      const h = el ? el.offsetHeight : prev.rowHeight;
      if (relY < accum + h / 2) {
        dropIdx = i;
        break;
      }
      accum += h + GAP;
    }
    return dropIdx;
  }, [rows]);

  // Scroll the list when the dragged row is held near an edge.
  useEffect(() => {
    if (!reordering) return;
    let frame = 0;
    let last = performance.now();

    function step(now: number) {
      frame = requestAnimationFrame(step);
      // Scale by elapsed time, so the speed does not double on a 120Hz display.
      const seconds = Math.min(now - last, 100) / 1000;
      last = now;

      const listEl = listRef.current;
      if (!listEl) return;

      const rect = listEl.getBoundingClientRect();
      const y = pointerY.current;
      let delta = 0;
      if (y < rect.top + EDGE) {
        delta = -EDGE_SPEED * seconds * Math.min(1, (rect.top + EDGE - y) / EDGE);
      } else if (y > rect.bottom - EDGE) {
        delta = EDGE_SPEED * seconds * Math.min(1, (y - (rect.bottom - EDGE)) / EDGE);
      }
      if (delta === 0) return;

      const before = listEl.scrollTop;
      listEl.scrollTop += delta;
      if (listEl.scrollTop === before) return; // already at the end

      // The finger has not moved, but the rows under it have.
      setReorder((prev) => {
        if (!prev) return prev;
        const dropIdx = computeDropIdx(pointerY.current, prev);
        return dropIdx === prev.dropIdx ? prev : { ...prev, dropIdx };
      });
    }

    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [reordering, computeDropIdx]);

  useEffect(() => {
    if (!reorder) return;

    function onPointerMove(e: PointerEvent) {
      pointerY.current = e.clientY;
      setReorder((prev) =>
        prev ? { ...prev, currentY: e.clientY, dropIdx: computeDropIdx(e.clientY, prev) } : prev,
      );
    }

    function onPointerUp() {
      window.getSelection()?.removeAllRanges();
      setReorder((prev) => {
        if (!prev) return null;
        const fromIdx = prev.sourceIdx;
        let toIdx = prev.dropIdx;
        // Adjust: dropIdx is in "visual slot" space (excluding the dragged item)
        if (toIdx >= fromIdx) toIdx++; // convert back to original array space
        if (toIdx !== fromIdx) {
          const next = [...rows];
          const [item] = next.splice(fromIdx, 1);
          const insertAt = toIdx > fromIdx ? toIdx - 1 : toIdx;
          next.splice(insertAt, 0, item);
          onRowsChange(next);
        }
        return null;
      });
    }

    // Backstop for browsers that started a pan anyway, e.g. when the finger leaves
    // the handle mid-drag.
    function blockScroll(e: TouchEvent) {
      e.preventDefault();
    }

    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
    document.addEventListener('touchmove', blockScroll, { passive: false });
    return () => {
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      document.removeEventListener('touchmove', blockScroll);
    };
  }, [reorder, rows, onRowsChange, computeDropIdx]);

  // --- Tag drag handlers for existing rows ---
  function onRowDragOver(e: DragEvent, rowId: string) {
    e.preventDefault();
    e.dataTransfer.dropEffect = e.dataTransfer.types.includes('application/x-source-row') ? 'move' : 'copy';
    setDragOverRowId(rowId);
  }

  function onRowDragLeave(_e: DragEvent, rowId: string) {
    setDragOverRowId((prev) => (prev === rowId ? null : prev));
  }

  function onRowDrop(e: DragEvent, rowId: string) {
    e.preventDefault();
    const raw = e.dataTransfer.getData('text/plain');
    if (!raw) return;
    setDragOverRowId(null);
    const tags = raw.split('\n').filter(Boolean);
    const sourceRowId = e.dataTransfer.getData('application/x-source-row');
    onRowsChange(moveTagsToRow(rows, rowId, tags, sourceRowId || null));
  }

  // --- Drag handlers for new-row drop zone ---
  function onNewDragOver(e: DragEvent) {
    e.preventDefault();
    if (rows.length >= MAX_ROWS) {
      e.dataTransfer.dropEffect = 'none';
      return;
    }
    e.dataTransfer.dropEffect = e.dataTransfer.types.includes('application/x-source-row') ? 'move' : 'copy';
    setDragOverNew(true);
  }

  function onNewDragLeave() {
    setDragOverNew(false);
  }

  function onNewDrop(e: DragEvent) {
    e.preventDefault();
    const raw = e.dataTransfer.getData('text/plain');
    if (!raw) return;
    setDragOverNew(false);
    const tags = raw.split('\n').filter(Boolean);
    const sourceRowId = e.dataTransfer.getData('application/x-source-row');
    onRowsChange(moveTagsToNewRow(rows, tags, sourceRowId || null));
  }

  const atRowLimit = rows.length >= MAX_ROWS;

  // A drop target lights up for whichever drag system is in flight.
  const overRowId = dragOverRowId ?? drag?.overRowId ?? null;
  const overNew = dragOverNew || !!drag?.overNew;

  // Floating row position
  const floatingTop = reorder ? reorder.currentY - reorder.offsetY : 0;
  const draggedRow = reorder ? rows.find((r) => r.id === reorder.rowId) : null;

  // Build the visual order: rows minus the dragged one, with a spacer at dropIdx
  function renderRows() {
    if (!reorder) {
      // No reorder in progress — render normally
      return rows.map((row, idx) => {
        const ci = idx % PALETTE.length;
        return (
          <div
            key={row.id}
            ref={(el) => { if (el) rowRefs.current.set(row.id, el); }}
            data-row-id={row.id}
            className={`tag-row${selected.has(row.id) ? ' selected' : ''}${overRowId === row.id ? ' drag-over' : ''}`}
            style={{ background: PALETTE[ci] + '22' }}
            onDragOver={(e) => onRowDragOver(e, row.id)}
            onDragLeave={(e) => onRowDragLeave(e, row.id)}
            onDrop={(e) => onRowDrop(e, row.id)}
            onDragStart={onRowDragStart}
          >
            <span
              className="drag-handle"
              onPointerDown={(e) => onHandlePointerDown(e, row.id)}
              title="Drag to reorder"
            >
              &#x2261;
            </span>
            <input
              type="checkbox"
              className="row-checkbox"
              checked={selected.has(row.id)}
              readOnly
              onClick={(e) => handleCheckboxClick(row.id, e)}
            />
            <div className="row-tags">
              {row.tags.map((tag) => (
                <span
                  key={tag}
                  className="balloon"
                  title={showTagTitle ? tag : undefined}
                  draggable
                  onDragStart={(e) => onTagDragStart(e, tag, row.id)}
                  onDragEnd={onTagDragEnd}
                  onPointerDown={(e) => longPress.onPointerDown(e, { tag, rowId: row.id })}
                  onPointerMove={longPress.onPointerMove}
                  onPointerUp={longPress.onPointerUp}
                  onPointerCancel={longPress.onPointerCancel}
                  style={{
                    background: PALETTE[ci] + '44',
                    borderColor: PALETTE[ci] + '66',
                  }}
                >
                  <span className="balloon-text">{tag}</span>
                  <button
                    className="delete-btn"
                    onClick={() => removeTagFromRow(row.id, tag)}
                    title="Remove tag"
                  >
                    x
                  </button>
                </span>
              ))}
            </div>
            <button
              className="row-delete-btn"
              onClick={() => deleteRow(row.id)}
              title="Delete row"
            >
              &#x1F5D1;&#xFE0E;
            </button>
          </div>
        );
      });
    }

    // Reorder in progress: render non-dragged rows + spacer
    const elements: React.ReactNode[] = [];
    let visualSlot = 0;

    let posIdx = 0; // positional index for color
    for (const row of rows) {
      if (row.id === reorder.rowId) {
        // Collapsed placeholder for the dragged row (keeps ref alive)
        elements.push(
          <div
            key={row.id}
            ref={(el) => { if (el) rowRefs.current.set(row.id, el); }}
            className="tag-row dragging-row-collapsed"
          />
        );
        continue;
      }

      // Insert spacer before this row if dropIdx matches
      if (visualSlot === reorder.dropIdx) {
        elements.push(
          <div
            key="__spacer"
            className="reorder-spacer"
            style={{ height: reorder.rowHeight }}
          />
        );
        posIdx++; // spacer takes a positional slot (the dragged row's color)
      }

      const ci = posIdx % PALETTE.length;
      elements.push(
        <div
          key={row.id}
          ref={(el) => { if (el) rowRefs.current.set(row.id, el); }}
          data-row-id={row.id}
          className={`tag-row${selected.has(row.id) ? ' selected' : ''}${overRowId === row.id ? ' drag-over' : ''}`}
          style={{ background: PALETTE[ci] + '22' }}
          onDragOver={(e) => onRowDragOver(e, row.id)}
          onDragLeave={(e) => onRowDragLeave(e, row.id)}
          onDrop={(e) => onRowDrop(e, row.id)}
        >
          <span
            className="drag-handle"
            onPointerDown={(e) => onHandlePointerDown(e, row.id)}
            title="Drag to reorder"
          >
            &#x2261;
          </span>
          <input
            type="checkbox"
            className="row-checkbox"
            checked={selected.has(row.id)}
            readOnly
            onClick={(e) => handleCheckboxClick(row.id, e)}
          />
          <div className="row-tags">
            {row.tags.map((tag) => (
              <span
                key={tag}
                className="balloon"
                title={showTagTitle ? tag : undefined}
                style={{
                  background: PALETTE[ci] + '44',
                  borderColor: PALETTE[ci] + '66',
                }}
              >
                <span className="balloon-text">{tag}</span>
                <button
                  className="delete-btn"
                  onClick={() => removeTagFromRow(row.id, tag)}
                  title="Remove tag"
                >
                  x
                </button>
              </span>
            ))}
          </div>
          <button
            className="row-delete-btn"
            onClick={() => deleteRow(row.id)}
            title="Delete row"
          >
            &#x1F5D1;&#xFE0E;
          </button>
        </div>
      );
      visualSlot++;
      posIdx++;
    }

    // Spacer at the end
    if (visualSlot <= reorder.dropIdx) {
      elements.push(
        <div
          key="__spacer"
          className="reorder-spacer"
          style={{ height: reorder.rowHeight }}
        />
      );
    }

    return elements;
  }

  return (
    <div className="panel tag-list">
      <div className="panel-header">
        <span className="panel-label">List</span>
        <div className="panel-header-actions">
          <button
            className="select-btn"
            disabled={rows.length === 0 || selected.size === rows.length}
            onClick={() => setSelected(new Set(rows.map((r) => r.id)))}
          >
            Select all
          </button>
          <button
            className="select-btn"
            disabled={selected.size === 0}
            onClick={() => setSelected(new Set())}
          >
            Unselect all
          </button>
        </div>
      </div>
      <div className="tag-list-rows" ref={listRef}>
        {renderRows()}
      </div>
      <div
        className={`new-row-drop${overNew && !atRowLimit ? ' drag-over' : ''}${atRowLimit ? ' full' : ''}`}
        onDragOver={onNewDragOver}
        onDragLeave={onNewDragLeave}
        onDrop={onNewDrop}
      >
        {atRowLimit ? `Row limit reached (${MAX_ROWS})` : 'Drop here to create a new row'}
      </div>

      {/* Floating row preview */}
      {reorder && draggedRow && (() => {
        const fci = reorder.dropIdx % PALETTE.length;
        return (
        <div
          className="floating-row tag-row"
          style={{
            top: floatingTop,
            left: reorder.rowLeft,
            width: reorder.rowWidth,
            background: PALETTE[fci] + '22',
          }}
        >
          <span className="drag-handle">&#x2261;</span>
          <input
            type="checkbox"
            className="row-checkbox"
            checked={selected.has(draggedRow.id)}
            readOnly
            tabIndex={-1}
          />
          <div className="row-tags">
            {draggedRow.tags.map((tag) => (
              <span
                key={tag}
                className="balloon"
                title={showTagTitle ? tag : undefined}
                style={{
                  background: PALETTE[fci] + '44',
                  borderColor: PALETTE[fci] + '66',
                }}
              >
                <span className="balloon-text">{tag}</span>
                <span className="delete-btn">x</span>
              </span>
            ))}
          </div>
          <span className="row-delete-btn">&#x1F5D1;&#xFE0E;</span>
        </div>
        );
      })()}
    </div>
  );
}
