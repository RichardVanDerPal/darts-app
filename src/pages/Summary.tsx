import { useEffect } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { useMatchStore } from '../store/matchStore';
import { computeMatchStats } from '../engine/stats';

export function SummaryPage() {
  const match = useMatchStore((s) => s.match);
  const archiveIfFinished = useMatchStore((s) => s.archiveIfFinished);
  const startMatch = useMatchStore((s) => s.startMatch);
  const navigate = useNavigate();

  useEffect(() => {
    void archiveIfFinished();
  }, [archiveIfFinished]);

  if (!match) return <Navigate to="/" replace />;
  if (match.status !== 'FINISHED') return <Navigate to="/game" replace />;

  const stats = computeMatchStats(match);
  const winner = match.winnerIdx !== null ? match.players[match.winnerIdx] : null;

  const playAgain = () => {
    startMatch(match.config, match.players);
    navigate('/game');
  };

  return (
    <div className="flex flex-col gap-4 py-4">
      <section className="rounded-lg bg-white p-4 text-center shadow-sm dark:bg-slate-900">
        <div className="text-sm uppercase opacity-60">Winner</div>
        <div className="mt-1 text-3xl font-bold text-red-600">
          {winner?.name ?? '—'}
        </div>
        <div className="mt-1 text-sm opacity-70">
          {match.config.variant} · best of {match.config.bestOfLegs} · final{' '}
          {match.legsWonByPlayer.join(' – ')}
        </div>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-sm font-semibold uppercase opacity-60">Player stats</h2>
        {match.players.map((p, i) => (
          <div
            key={p.id}
            className="rounded-md bg-white p-3 text-sm shadow-sm dark:bg-slate-900"
          >
            <div className="mb-1 flex items-center justify-between">
              <span className="font-semibold">{p.name}</span>
              <span className="text-xs opacity-70">
                Legs won {stats[i].legsWon}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs opacity-90">
              <span>3-dart avg</span>
              <span className="text-right tabular-nums">
                {stats[i].threeDartAverage.toFixed(2)}
              </span>
              <span>First-9 avg</span>
              <span className="text-right tabular-nums">
                {stats[i].first9Average.toFixed(2)}
              </span>
              <span>Highest visit</span>
              <span className="text-right tabular-nums">
                {stats[i].highestVisit}
              </span>
              <span>Highest checkout</span>
              <span className="text-right tabular-nums">
                {stats[i].highestCheckout}
              </span>
              <span>Darts thrown</span>
              <span className="text-right tabular-nums">
                {stats[i].dartsThrown}
              </span>
            </div>
          </div>
        ))}
      </section>

      <div className="mt-2 flex flex-col gap-2">
        <button
          type="button"
          onClick={playAgain}
          className="rounded-lg bg-red-600 px-4 py-3 font-semibold text-white shadow"
        >
          Play again — same setup
        </button>
        <Link
          to="/"
          className="rounded-lg border border-slate-300 px-4 py-3 text-center font-semibold dark:border-slate-700"
        >
          Home
        </Link>
      </div>
    </div>
  );
}
