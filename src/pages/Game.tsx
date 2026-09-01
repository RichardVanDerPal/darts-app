import { useEffect } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useMatchStore } from '../store/matchStore';
import { computeMatchStats } from '../engine/stats';
import { isHalveItMatch } from '../engine/halveIt';
import { PlayerCard } from '../components/PlayerCard';
import { CheckoutHint } from '../components/CheckoutHint';
import { DartPad } from '../components/DartPad';
import { VisitTotalPad } from '../components/VisitTotalPad';
import { HalveItGame } from '../components/HalveItGame';
import { useWakeLock } from '../hooks/useWakeLock';
import type { MatchState } from '../engine/types';

export function GamePage() {
  const navigate = useNavigate();
  const match = useMatchStore((s) => s.match);

  useEffect(() => {
    if (match && match.status === 'FINISHED') {
      navigate('/summary', { replace: true });
    }
  }, [match, navigate]);

  if (!match) return <Navigate to="/" replace />;

  return (
    <>
      {isHalveItMatch(match) ? (
        <HalveItGame match={match} />
      ) : (
        <CountdownGame match={match} />
      )}
      <AbandonButton />
    </>
  );
}

function CountdownGame({ match }: { match: MatchState }) {
  const submitVisit = useMatchStore((s) => s.submitVisit);
  const submitVisitTotal = useMatchStore((s) => s.submitVisitTotal);
  const undo = useMatchStore((s) => s.undo);
  const undoAvailable = useMatchStore((s) => s.undoStack.length > 0);

  useWakeLock(match.status === 'IN_PROGRESS');

  const leg = match.legs[match.currentLegIdx];
  const activePlayer = match.players[leg.currentPlayerIdx];
  const activeLegState = leg.perPlayer[leg.currentPlayerIdx];
  const stats = computeMatchStats(match);

  return (
    <div className="flex flex-col gap-4 py-2">
      <div className="flex items-center justify-between text-sm opacity-70">
        <span>
          Leg {match.currentLegIdx + 1} · Best of {match.config.bestOfLegs} ·{' '}
          {match.config.variant}
        </span>
        <button
          type="button"
          onClick={undo}
          disabled={!undoAvailable}
          className="rounded-md border border-slate-300 px-2 py-1 disabled:opacity-40 dark:border-slate-700"
        >
          ↶ Undo visit
        </button>
      </div>

      <div
        className={
          'grid gap-3 ' +
          (match.players.length === 2
            ? 'grid-cols-2'
            : match.players.length === 3
              ? 'grid-cols-3'
              : 'grid-cols-2 sm:grid-cols-4')
        }
      >
        {match.players.map((p, i) => (
          <PlayerCard
            key={p.id}
            player={p}
            legState={leg.perPlayer[i]}
            isActive={i === leg.currentPlayerIdx}
            legsWon={match.legsWonByPlayer[i]}
            threeDartAverage={stats[i].threeDartAverage}
          />
        ))}
      </div>

      <div className="rounded-md bg-slate-100 p-3 text-center text-sm font-medium dark:bg-slate-900">
        <span className="opacity-70">To throw:</span>{' '}
        <span className="font-semibold">{activePlayer.name}</span>
        <span className="ml-2 tabular-nums opacity-70">
          ({activeLegState.remaining} left)
        </span>
      </div>

      <CheckoutHint remaining={activeLegState.remaining} dartsLeft={3} />

      {match.config.inputMode === 'per-dart' ? (
        <DartPad
          key={`${leg.currentPlayerIdx}-${leg.visits.length}`}
          remaining={activeLegState.remaining}
          onSubmitVisit={(darts) => submitVisit(darts)}
        />
      ) : (
        <VisitTotalPad
          key={`${leg.currentPlayerIdx}-${leg.visits.length}`}
          remaining={activeLegState.remaining}
          onSubmit={(opts) => submitVisitTotal(opts)}
        />
      )}
    </div>
  );
}

function AbandonButton() {
  const abandon = useMatchStore((s) => s.abandon);
  const navigate = useNavigate();
  return (
    <button
      type="button"
      onClick={async () => {
        if (!confirm('Abandon this match? Progress will be lost.')) return;
        await abandon();
        navigate('/', { replace: true });
      }}
      className="mt-2 self-center rounded-md px-3 py-2 text-sm opacity-60 hover:opacity-100"
    >
      Abandon match
    </button>
  );
}
