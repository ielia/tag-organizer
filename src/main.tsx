import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import {
  DARK_MODE,
  TAG_ELLIPSIS,
  TAG_MAX_WIDTH,
  applyDarkMode,
  applyTagEllipsis,
} from './config';
import { loadDarkMode, loadTagEllipsis } from './storage';
import './index.css';

// Applied before the first paint, so neither the theme nor the tag width flashes —
// read from storage here too, or a restored setting would appear only after mount.
applyTagEllipsis((loadTagEllipsis() ?? TAG_ELLIPSIS !== null) ? TAG_MAX_WIDTH : null);
applyDarkMode(loadDarkMode() ?? DARK_MODE);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
