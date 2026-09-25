import { useEffect } from 'react';

interface SidebarProps {
  open: boolean;
  onClose: () => void;
  tagEllipsis: boolean;
  onTagEllipsisChange: (value: boolean) => void;
}

export default function Sidebar({ open, onClose, tagEllipsis, onTagEllipsisChange }: SidebarProps) {
  useEffect(() => {
    if (!open) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <>
      <div className="sidebar-backdrop" onClick={onClose} />
      <aside className="sidebar" aria-label="Options">
        <div className="sidebar-header">
          <span className="panel-label">Options</span>
          <button className="sidebar-close" onClick={onClose} title="Close">
            &times;
          </button>
        </div>

        <label className="option">
          <span className="option-label">Manageable tag size</span>
          <button
            type="button"
            role="switch"
            aria-checked={tagEllipsis}
            className={`switch${tagEllipsis ? ' on' : ''}`}
            onClick={() => onTagEllipsisChange(!tagEllipsis)}
          >
            <span className="switch-knob" />
          </button>
        </label>
        <p className="option-hint">
          Caps each tag at one line and ellipsises the rest. Off, long tags widen the list.
        </p>
      </aside>
    </>
  );
}
