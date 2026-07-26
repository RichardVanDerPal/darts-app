import { useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { useMatchStore } from '../store/matchStore';
import { Header } from './Header';

export function BaseLayout() {
  const hydrate = useMatchStore((s) => s.hydrate);
  const hydrated = useMatchStore((s) => s.hydrated);

  useEffect(() => {
    void hydrate();
  }, [hydrate]);

  return (
    <div className="mx-auto flex min-h-full max-w-3xl flex-col">
      <Header />
      <main className="flex-1 px-4 pb-6 pt-2">
        {hydrated ? <Outlet /> : <div className="p-4 text-center opacity-60">Loading…</div>}
      </main>
    </div>
  );
}
