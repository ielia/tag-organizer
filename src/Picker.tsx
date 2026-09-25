import { useEffect, useRef, useState, useCallback, type DragEvent } from 'react';
import { useLongPressDrag } from './useLongPressDrag';

interface PickerProps {
  tags: string[];
  onTagDragStart: (
    tags: string[],
    sourceRowId: string | null,
    x: number,
    y: number,
    onDone?: () => void,
  ) => void;
  /** How many list rows are checked; the target of "Add to selected rows". */
  selectedRowCount: number;
  /** False once the list holds MAX_ROWS rows. */
  canAddRow: boolean;
  onAddToSelectedRows: (tags: string[]) => void;
  onAddToNewRow: (tags: string[]) => void;
  /** Truncated tags are unreadable, so hovering must reveal the full name. */
  showTagTitle: boolean;
}

interface MarqueeState {
  startX: number;
  startY: number;
  currentX: number;
  currentY: number;
}

function rectsIntersect(
  a: { left: number; top: number; right: number; bottom: number },
  b: { left: number; top: number; right: number; bottom: number },
) {
  return a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
}

export default function Picker({
  tags,
  onTagDragStart,
  selectedRowCount,
  canAddRow,
  onAddToSelectedRows,
  onAddToNewRow,
  showTagTitle,
}: PickerProps) {
  const [filter, setFilter] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [marquee, setMarquee] = useState<MarqueeState | null>(null);
  const tagsRef = useRef<HTMLDivElement>(null);
  const balloonRefs = useRef<Map<string, HTMLSpanElement>>(new Map());
  const preMarqueeSelected = useRef<Set<string>>(new Set());
  const didDrag = useRef(false);

  const filtered = tags
    .filter((t) => t.toLowerCase().includes(filter.toLowerCase()))
    .sort((a, b) => a.localeCompare(b));

  // Marquee: compute selected tags from rectangle
  const computeMarqueeSelection = useCallback(
    (m: MarqueeState, ctrlKey: boolean) => {
      const selRect = {
        left: Math.min(m.startX, m.currentX),
        top: Math.min(m.startY, m.currentY),
        right: Math.max(m.startX, m.currentX),
        bottom: Math.max(m.startY, m.currentY),
      };
      const next = ctrlKey ? new Set(preMarqueeSelected.current) : new Set<string>();
      balloonRefs.current.forEach((el, tag) => {
        const r = el.getBoundingClientRect();
        if (rectsIntersect(selRect, { left: r.left, top: r.top, right: r.right, bottom: r.bottom })) {
          next.add(tag);
        }
      });
      setSelected(next);
    },
    [],
  );

  // Marquee pointer events
  useEffect(() => {
    if (!marquee) return;

    function onPointerMove(e: PointerEvent) {
      setMarquee((prev) => {
        if (!prev) return prev;
        const next = { ...prev, currentX: e.clientX, currentY: e.clientY };
        computeMarqueeSelection(next, e.ctrlKey || e.metaKey);
        return next;
      });
    }

    function onPointerUp() {
      setMarquee(null);
    }

    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
    return () => {
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
    };
  }, [marquee, computeMarqueeSelection]);

  function onTagsPointerDown(e: React.PointerEvent) {
    // Only start marquee from empty space (not from a balloon)
    if ((e.target as HTMLElement).closest('.balloon')) return;
    // Marquee is a mouse gesture; on touch the same drag must scroll the tag list.
    if (e.pointerType !== 'mouse') return;
    e.preventDefault();
    preMarqueeSelected.current = e.ctrlKey || e.metaKey ? new Set(selected) : new Set();
    setMarquee({
      startX: e.clientX,
      startY: e.clientY,
      currentX: e.clientX,
      currentY: e.clientY,
    });
  }

  function onTagClick(tag: string) {
    if (didDrag.current) {
      didDrag.current = false;
      return;
    }
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(tag)) next.delete(tag);
      else next.add(tag);
      return next;
    });
  }

  // A drag that starts on a selected tag carries the whole selection.
  function dragPayload(tag: string) {
    return selected.has(tag) && selected.size > 1
      ? [...selected].sort((a, b) => a.localeCompare(b))
      : [tag];
  }

  const longPress = useLongPressDrag<string>((tag, x, y) => {
    didDrag.current = true;
    onTagDragStart(dragPayload(tag), null, x, y, () => {
      setSelected(new Set());
      requestAnimationFrame(() => { didDrag.current = false; });
    });
  });

  function applyToSelection(action: (tags: string[]) => void) {
    action([...selected].sort((a, b) => a.localeCompare(b)));
    setSelected(new Set());
  }

  function onDragStart(e: DragEvent, tag: string) {
    if ((e.ctrlKey || e.metaKey) && !selected.has(tag)) {
      e.preventDefault();
      return;
    }
    didDrag.current = true;
    const tagsToSend = dragPayload(tag);
    e.dataTransfer.setData('text/plain', tagsToSend.join('\n'));
    e.dataTransfer.effectAllowed = 'copy';
    (e.target as HTMLElement).classList.add('dragging');

    if (tagsToSend.length > 1) {
      const ghost = document.createElement('div');
      ghost.className = 'drag-ghost';
      tagsToSend.forEach((t) => {
        const pill = document.createElement('span');
        pill.className = 'balloon';
        const label = document.createElement('span');
        label.className = 'balloon-text';
        label.textContent = t;
        pill.appendChild(label);
        ghost.appendChild(pill);
      });
      document.body.appendChild(ghost);
      e.dataTransfer.setDragImage(ghost, 0, 0);
      requestAnimationFrame(() => document.body.removeChild(ghost));
    }
  }

  function onDragEnd(e: DragEvent) {
    (e.target as HTMLElement).classList.remove('dragging');
    setSelected(new Set());
    // Reset didDrag after a tick so the click on the same element is still suppressed,
    // but clicks on other elements aren't blocked.
    requestAnimationFrame(() => { didDrag.current = false; });
  }

  // Marquee rectangle in CSS coords
  const marqueeStyle = marquee
    ? {
        left: Math.min(marquee.startX, marquee.currentX),
        top: Math.min(marquee.startY, marquee.currentY),
        width: Math.abs(marquee.currentX - marquee.startX),
        height: Math.abs(marquee.currentY - marquee.startY),
      }
    : null;

  return (
    <div className="panel picker">
      <div className="panel-header">
        <div className="panel-label">Picker</div>
        <span className="picker-count">
          ({selected.size} of {tags.length} selected)
        </span>
      </div>
      <div className="picker-filter-wrap">
        <input
          className="picker-filter"
          type="text"
          placeholder="Filter tags..."
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        />
        {filter && (
          <button
            className="delete-btn filter-clear"
            onClick={() => setFilter('')}
            title="Clear filter"
          >
            x
          </button>
        )}
      </div>
      <div className="picker-actions">
        <button
          className="select-btn"
          disabled={selected.size === 0 || !canAddRow}
          onClick={() => applyToSelection(onAddToNewRow)}
        >
          As new row
        </button>
        <button
          className="select-btn"
          disabled={selected.size === 0 || selectedRowCount === 0}
          onClick={() => applyToSelection(onAddToSelectedRows)}
        >
          Add to selected rows
        </button>
        <button
          className="select-btn picker-actions-end"
          disabled={selected.size === 0}
          onClick={() => setSelected(new Set())}
        >
          Clear selection
        </button>
      </div>
      <p className="picker-hint picker-hint-pointer">
        Click to select &middot; drag to move &middot; box-select from empty space
      </p>
      <p className="picker-hint picker-hint-touch">Tap to select &middot; hold to drag</p>
      <div
        className="picker-tags"
        ref={tagsRef}
        onPointerDown={onTagsPointerDown}
      >
        {filtered.map((tag) => (
          <span
            key={tag}
            ref={(el) => { if (el) balloonRefs.current.set(tag, el); }}
            className={`balloon${selected.has(tag) ? ' balloon-selected' : ''}`}
            title={showTagTitle ? tag : undefined}
            draggable
            onClick={() => onTagClick(tag)}
            onPointerDown={(e) => longPress.onPointerDown(e, tag)}
            onPointerMove={longPress.onPointerMove}
            onPointerUp={longPress.onPointerUp}
            onPointerCancel={longPress.onPointerCancel}
            onDragStart={(e) => onDragStart(e, tag)}
            onDragEnd={onDragEnd}
          >
            <span className="balloon-text">{tag}</span>
          </span>
        ))}
      </div>
      {marqueeStyle && (
        <div className="marquee" style={marqueeStyle} />
      )}
    </div>
  );
}
