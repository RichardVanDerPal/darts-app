import { useMatchStore } from '../store/matchStore';
import { useWakeLock } from '../hooks/useWakeLock';
import { HalveItHitsPad } from './HalveItHitsPad';
import { HalveItPlayerCard } from './HalveItPlayerCard';
import type { HalveItMatchState, HalveItTarget } from '../engine/halveIt';

interface Props {
  match: HalveItMatchState;
}

/**
 * In-game screen for a Halve It match. The countdown-mode version lives
 * inline in Game.tsx; this component owns the entire Halve It view so
 * Game.tsx can stay a thin dispatcher on match.kind.
 */
export function HalveItGame({ match }: Props) {
  const submitHalveItHits = useMatchStore((s) => s.submitHalveItHits);
  const undo = useMatchStore((s) => s.undo);
  const undoAvailable = useMatchStore((s) => s.undoStack.length > 0);

  useWakeLock(match.status === 'IN_PROGRESS');

  const round = match.rounds[match.currentRoundIdx];
  const target = round.target;
  const activePlayer = match.players[match.currentPlayerIdx];
  const activeState = match.perPlayer[match.currentPlayerIdx];

  // Show the most recent visit for each player as the "last delta".
  const lastVisitByPlayer = new Map<
    number,
    { visitScore: number; halved: boolean }
  >();
  for (const r of match.rounds) {
    for (const v of r.visits) {
      lastVisitByPlayer.set(v.playerIdx, {
        visitScore: v.visitScore,
        halved: v.halved,
      });
    }
  }

  return (
    <div className="flex flex-col gap-4 py-2">
      <div className="flex items-center justify-between text-sm opacity-70">
        <span>
          Halve It · Round {match.currentRoundIdx + 1} of {match.config.rounds}
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

      <TargetCallout target={target} />

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
          <HalveItPlayerCard
            key={p.id}
            player={p}
            playerState={match.perPlayer[i]}
            isActive={i === match.currentPlayerIdx}
            lastDelta={lastVisitByPlayer.get(i) ?? null}
          />
        ))}
      </div>

      <div className="rounded-md bg-slate-100 p-3 text-center text-sm font-medium dark:bg-slate-900">
        <span className="opacity-70">To throw:</span>{' '}
        <span className="font-semibold">{activePlayer.name}</span>
        <span className="ml-2 tabular-nums opacity-70">
          (score {activeState.score})
        </span>
      </div>

      <HalveItHitsPad
        key={`${match.currentRoundIdx}-${match.currentPlayerIdx}-${round.visits.length}`}
        target={target}
        onSubmit={(hits) => submitHalveItHits(hits)}
      />
    </div>
  );
}

function TargetCallout({ target }: { target: HalveItTarget }) {
  const label = target.kind === 'bull' ? 'Bull' : target.segment;
  const sublabel =
    target.kind === 'bull'
      ? 'Hit BULL (50) or 25 to score'
      : 'Doubles and trebles score with multiplier';
  return (
    <div className="rounded-lg border-2 border-red-600 bg-red-50 px-4 py-3 text-center dark:bg-red-950/30">
      <div className="text-xs font-semibold uppercase tracking-wide text-red-700 dark:text-red-400">
        Target
      </div>
      <div className="mt-1 text-5xl font-black tabular-nums text-red-700 dark:text-red-400">
        {label}
      </div>
      <div className="mt-1 text-xs opacity-70">{sublabel}</div>
    </div>
  );
}
