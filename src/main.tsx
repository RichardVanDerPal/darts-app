import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { RouterProvider } from 'react-router-dom';
import { router } from './router';
import './styles/global.css';

// Apply persisted theme choice before first render to avoid flash.
const storedTheme = localStorage.getItem('darts-theme');
if (storedTheme === 'light') {
  document.documentElement.classList.remove('dark');
} else {
  document.documentElement.classList.add('dark');
}

const rootEl = document.getElementById('root');
if (!rootEl) throw new Error('Missing #root element');

createRoot(rootEl).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
);
