import { useEffect, useRef, useState, useCallback, type DragEvent, type MouseEvent } from 'react';

interface PickerProps {
  tags: string[];
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

export default function Picker({ tags }: PickerProps) {
  const [filter, setFilter] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [marquee, setMarquee] = useState<MarqueeState | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const tagsRef = useRef<HTMLDivElement>(null);
  const balloonRefs = useRef<Map<string, HTMLSpanElement>>(new Map());
  const preMarqueeSelected = useRef<Set<string>>(new Set());
  const didDrag = useRef(false);

  const filtered = tags
    .filter((t) => t.toLowerCase().includes(filter.toLowerCase()))
    .sort((a, b) => a.localeCompare(b));

  // Clear selection when clicking outside the picker panel
  useEffect(() => {
    function onPointerDown(e: PointerEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setSelected(new Set());
      }
    }
    window.addEventListener('pointerdown', onPointerDown);
    return () => window.removeEventListener('pointerdown', onPointerDown);
  }, []);

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
    e.preventDefault();
    preMarqueeSelected.current = e.ctrlKey || e.metaKey ? new Set(selected) : new Set();
    setMarquee({
      startX: e.clientX,
      startY: e.clientY,
      currentX: e.clientX,
      currentY: e.clientY,
    });
    if (!(e.ctrlKey || e.metaKey)) {
      setSelected(new Set());
    }
  }

  function onTagClick(tag: string, e: MouseEvent) {
    if (didDrag.current) {
      didDrag.current = false;
      return;
    }
    if (e.ctrlKey || e.metaKey) {
      setSelected((prev) => {
        const next = new Set(prev);
        if (next.has(tag)) next.delete(tag);
        else next.add(tag);
        return next;
      });
    } else {
      setSelected(new Set());
    }
  }

  function onDragStart(e: DragEvent, tag: string) {
    if ((e.ctrlKey || e.metaKey) && !selected.has(tag)) {
      e.preventDefault();
      return;
    }
    didDrag.current = true;
    const tagsToSend = selected.has(tag) && selected.size > 1
      ? [...selected].sort((a, b) => a.localeCompare(b))
      : [tag];
    e.dataTransfer.setData('text/plain', tagsToSend.join('\n'));
    e.dataTransfer.effectAllowed = 'copy';
    (e.target as HTMLElement).classList.add('dragging');

    if (tagsToSend.length > 1) {
      const ghost = document.createElement('div');
      ghost.className = 'drag-ghost';
      tagsToSend.forEach((t) => {
        const pill = document.createElement('span');
        pill.className = 'balloon';
        pill.textContent = t;
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
    <div className="panel picker" ref={panelRef}>
      <div className="panel-label">Picker</div>
      <input
        className="picker-filter"
        type="text"
        placeholder="Filter tags..."
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
      />
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
            draggable
            onClick={(e) => onTagClick(tag, e)}
            onDragStart={(e) => onDragStart(e, tag)}
            onDragEnd={onDragEnd}
          >
            {tag}
          </span>
        ))}
      </div>
      {marqueeStyle && (
        <div className="marquee" style={marqueeStyle} />
      )}
    </div>
  );
}
