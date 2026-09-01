import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useMatchStore } from '../store/matchStore';
import { listHistory } from '../persistence/matchRepo';
import { isHalveItMatch, type AnyMatchState } from '../engine/halveIt';

export function HomePage() {
  const match = useMatchStore((s) => s.match);
  const [history, setHistory] = useState<AnyMatchState[]>([]);

  useEffect(() => {
    void listHistory().then(setHistory);
  }, []);

  const resumable = match && match.status === 'IN_PROGRESS';

  return (
    <div className="flex flex-col gap-6 py-4">
      <section className="rounded-lg bg-white p-4 shadow-sm dark:bg-slate-900">
        <h1 className="text-2xl font-bold">Darts Scoreboard</h1>
        <p className="mt-1 text-sm opacity-70">
          Offline-first 501 / 301 / Halve It scorer. Works from your home screen.
        </p>
      </section>

      <section className="flex flex-col gap-3">
        {resumable && (
          <Link
            to="/game"
            className="rounded-lg bg-red-600 px-4 py-3 text-center font-semibold text-white shadow hover:bg-red-500"
          >
            Resume match — {match!.players.map((p) => p.name).join(' vs ')}
          </Link>
        )}
        <Link
          to="/setup"
          className="rounded-lg border border-red-600 px-4 py-3 text-center font-semibold text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30"
        >
          {resumable ? 'Start a different match' : 'New match'}
        </Link>
      </section>

      <section>
        <h2 className="mb-2 text-sm font-semibold uppercase opacity-60">Recent matches</h2>
        {history.length === 0 ? (
          <p className="text-sm opacity-60">No finished matches yet.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {history.slice(0, 10).map((m) => (
              <li
                key={m.createdAt}
                className="rounded-md bg-white p-3 text-sm shadow-sm dark:bg-slate-900"
              >
                <div className="font-medium">
                  {m.players.map((p) => p.name).join(' vs ')}
                </div>
                <div className="opacity-70">
                  {formatMode(m)} · winner: {formatWinner(m)} ·{' '}
                  {new Date(m.updatedAt).toLocaleString()}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function formatMode(m: AnyMatchState): string {
  if (isHalveItMatch(m)) {
    return `Halve It · ${m.config.rounds} rounds${
      m.config.includeBullRound ? ' (bull final)' : ''
    }`;
  }
  return `${m.config.variant} · best of ${m.config.bestOfLegs}`;
}

function formatWinner(m: AnyMatchState): string {
  if (isHalveItMatch(m)) {
    if (m.winnerIdxs.length === 0) return '—';
    if (m.winnerIdxs.length > 1) return 'Tied';
    return m.players[m.winnerIdxs[0]].name;
  }
  return m.winnerIdx !== null ? m.players[m.winnerIdx].name : '—';
}
