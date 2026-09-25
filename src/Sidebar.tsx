import { useEffect } from 'react';
import type { DarkMode } from './config';

const DARK_MODES: { value: DarkMode; label: string }[] = [
  { value: 'on', label: 'Dark' },
  { value: 'system', label: 'Follow the system setting' },
  { value: 'off', label: 'Light' },
];

const ICON = {
  width: 16,
  height: 16,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
};

/** The label is gone, so every icon needs the button's title/aria-label instead. */
function ModeIcon({ mode }: { mode: DarkMode }) {
  if (mode === 'on') {
    return (
      <svg {...ICON}>
        <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z" />
      </svg>
    );
  }
  if (mode === 'off') {
    return (
      <svg {...ICON}>
        <circle cx="12" cy="12" r="4" />
        <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
      </svg>
    );
  }
  // "System" means this device, so show the device being used.
  return (
    <>
      <svg {...ICON} className="icon-pointer">
        <rect x="2" y="4" width="20" height="13" rx="2" />
        <path d="M9 21h6M12 17v4" />
      </svg>
      <svg {...ICON} className="icon-touch">
        <rect x="6" y="2" width="12" height="20" rx="2" />
        <path d="M11 18h2" />
      </svg>
    </>
  );
}

interface SidebarProps {
  open: boolean;
  onClose: () => void;
  tagEllipsis: boolean;
  onTagEllipsisChange: (value: boolean) => void;
  darkMode: DarkMode;
  onDarkModeChange: (value: DarkMode) => void;
}

export default function Sidebar({
  open,
  onClose,
  tagEllipsis,
  onTagEllipsisChange,
  darkMode,
  onDarkModeChange,
}: SidebarProps) {
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

        <div className="option option-dark-mode">
          <span className="option-label">Dark mode</span>
          <div className="segmented" role="radiogroup" aria-label="Dark mode">
            {DARK_MODES.map(({ value, label }) => (
              <button
                key={value}
                type="button"
                role="radio"
                aria-checked={darkMode === value}
                className={`segment${darkMode === value ? ' on' : ''}`}
                onClick={() => onDarkModeChange(value)}
                title={label}
                aria-label={label}
              >
                <ModeIcon mode={value} />
              </button>
            ))}
          </div>
        </div>
      </aside>
    </>
  );
}
