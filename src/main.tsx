import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import { TAG_ELLIPSIS, applyTagEllipsis } from './config';
import './index.css';

// Applied before the first paint so tags never flash at the wrong width.
applyTagEllipsis(TAG_ELLIPSIS);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
