import { Link, useLocation } from 'react-router-dom';
import { ThemeToggle } from './ThemeToggle';

export function Header() {
  const location = useLocation();
  const inGame = location.pathname.startsWith('/game');

  return (
    <header className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-slate-100/90 px-4 py-3 backdrop-blur dark:border-slate-800 dark:bg-slate-950/90">
      <Link to="/" className="text-lg font-semibold tracking-tight">
        <span className="text-red-500">•</span> Darts
      </Link>
      <div className="flex items-center gap-2">
        {!inGame && (
          <Link
            to="/setup"
            className="rounded-md bg-red-600 px-3 py-1.5 text-sm font-medium text-white shadow-sm hover:bg-red-500"
          >
            New match
          </Link>
        )}
        <ThemeToggle />
      </div>
    </header>
  );
}
