import { useRef } from 'react';
import type { PointerEvent as ReactPointerEvent } from 'react';

const LONG_PRESS_MS = 350;
const MOVE_SLOP = 10; // px of finger travel that cancels the press and lets the list scroll

/**
 * Touch/pen counterpart to HTML5 drag-and-drop, which never fires for touch input.
 * A press held still for LONG_PRESS_MS starts a drag; moving before that cancels it so
 * the gesture stays a scroll. Mouse input is ignored — desktop keeps the native path.
 */
export function useLongPressDrag<T>(onStart: (item: T, x: number, y: number) => void) {
  const timer = useRef<number | null>(null);
  const origin = useRef<{ x: number; y: number } | null>(null);
  const item = useRef<T | null>(null);

  function cancel() {
    if (timer.current !== null) {
      window.clearTimeout(timer.current);
      timer.current = null;
    }
    origin.current = null;
    item.current = null;
  }

  function onPointerDown(e: ReactPointerEvent, pressed: T) {
    if (e.pointerType === 'mouse') return;
    cancel();
    origin.current = { x: e.clientX, y: e.clientY };
    item.current = pressed;
    const { clientX, clientY } = e;
    timer.current = window.setTimeout(() => {
      timer.current = null;
      const held = item.current;
      origin.current = null;
      item.current = null;
      if (held !== null) onStart(held, clientX, clientY);
    }, LONG_PRESS_MS);
  }

  function onPointerMove(e: ReactPointerEvent) {
    const from = origin.current;
    if (!from || timer.current === null) return;
    if (Math.abs(e.clientX - from.x) > MOVE_SLOP || Math.abs(e.clientY - from.y) > MOVE_SLOP) {
      cancel();
    }
  }

  return { onPointerDown, onPointerMove, onPointerUp: cancel, onPointerCancel: cancel };
}
