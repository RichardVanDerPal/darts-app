import type { PlayerLegState, Player } from '../engine/types';

interface Props {
  player: Player;
  legState: PlayerLegState;
  isActive: boolean;
  legsWon: number;
  threeDartAverage: number;
}

export function PlayerCard({
  player,
  legState,
  isActive,
  legsWon,
  threeDartAverage,
}: Props) {
  return (
    <div
      className={
        'flex flex-col rounded-lg p-3 shadow-sm transition ' +
        (isActive
          ? 'bg-red-600 text-white ring-2 ring-red-500 ring-offset-2 ring-offset-slate-100 dark:ring-offset-slate-950'
          : 'bg-white dark:bg-slate-900')
      }
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {isActive && <span aria-hidden>▶</span>}
          <span className="text-sm font-semibold">{player.name}</span>
        </div>
        <span className="text-xs opacity-70">Legs {legsWon}</span>
      </div>
      <div className="mt-2 text-5xl font-black tabular-nums leading-none">
        {legState.remaining}
      </div>
      <div className="mt-2 flex items-center justify-between text-xs opacity-80">
        <span>Avg {threeDartAverage.toFixed(1)}</span>
        <span>High {legState.highestVisit}</span>
      </div>
    </div>
  );
}
