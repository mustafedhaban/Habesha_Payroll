import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './index.css';

try {
  const theme = localStorage.getItem('habesha-theme');
  if (theme === 'dark') document.documentElement.dataset.theme = 'dark';
} catch {
  /* ignore */
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
