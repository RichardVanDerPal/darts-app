import { useState } from 'react';

function currentIsDark(): boolean {
  return document.documentElement.classList.contains('dark');
}

export function ThemeToggle() {
  const [dark, setDark] = useState(currentIsDark());

  const toggle = () => {
    const next = !dark;
    setDark(next);
    if (next) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('darts-theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('darts-theme', 'light');
    }
  };

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={dark ? 'Switch to light mode' : 'Switch to dark mode'}
      className="rounded-md border border-slate-300 px-2 py-1 text-sm dark:border-slate-700"
    >
      {dark ? '☀︎' : '☾'}
    </button>
  );
}
