import type { Player } from '../engine/types';
import type { HalveItPlayerState } from '../engine/halveIt';

interface Props {
  player: Player;
  playerState: HalveItPlayerState;
  isActive: boolean;
  /** Score change from the player's previous visit in the current match, if any. */
  lastDelta?: { visitScore: number; halved: boolean } | null;
}

/**
 * Compact per-player score card for the Halve It in-game screen.
 * Mirrors the visual language of PlayerCard (countdown) but shows
 * the cumulative score and last-visit delta instead of remaining/leg.
 */
export function HalveItPlayerCard({ player, playerState, isActive, lastDelta }: Props) {
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
        <span className="text-xs opacity-70">Hits {playerState.hits}</span>
      </div>
      <div className="mt-2 text-5xl font-black tabular-nums leading-none">
        {playerState.score}
      </div>
      <div className="mt-2 flex items-center justify-between text-xs opacity-80">
        <span>
          {lastDelta === null || lastDelta === undefined
            ? '—'
            : lastDelta.halved
              ? '▼ halved'
              : `+${lastDelta.visitScore}`}
        </span>
        <span>Best {playerState.bestRoundScore}</span>
      </div>
    </div>
  );
}
