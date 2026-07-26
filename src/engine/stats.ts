// Per-player running stats. Derived from leg state; no independent storage.
import type { LegState, MatchState } from './types';

export interface PlayerMatchStats {
  playerIdx: number;
  legsWon: number;
  dartsThrown: number;
  pointsScored: number;
  threeDartAverage: number; // points per 3 darts thrown
  first9Average: number;    // average per 3 darts across first 9 darts of each leg
  highestVisit: number;
  highestCheckout: number;
}

export function computeMatchStats(state: MatchState): PlayerMatchStats[] {
  const n = state.players.length;
  const out: PlayerMatchStats[] = Array.from({ length: n }, (_, i) => ({
    playerIdx: i,
    legsWon: state.legsWonByPlayer[i],
    dartsThrown: 0,
    pointsScored: 0,
    threeDartAverage: 0,
    first9Average: 0,
    highestVisit: 0,
    highestCheckout: 0,
  }));

  const first9Points = new Array<number>(n).fill(0);
  const first9Darts = new Array<number>(n).fill(0);

  for (const leg of state.legs) {
    for (let i = 0; i < n; i++) {
      const p = leg.perPlayer[i];
      out[i].dartsThrown += p.dartsThrown;
      out[i].pointsScored += p.pointsScored;
      out[i].highestVisit = Math.max(out[i].highestVisit, p.highestVisit);
      out[i].highestCheckout = Math.max(out[i].highestCheckout, p.highestCheckout);
    }
    // First-9 across each leg: walk visits in order, take first 3 visits per player
    // whose combined dart count is <= 9. Simpler: take up to 9 darts per player.
    const legFirst9Points = new Array<number>(n).fill(0);
    const legFirst9Darts = new Array<number>(n).fill(0);
    for (const v of leg.visits) {
      const room = 9 - legFirst9Darts[v.playerIdx];
      if (room <= 0) continue;
      const take = Math.min(v.darts.length, room);
      // For OK visits, count proportional score. For BUST, the visit contributed 0
      // to points, so first-9 gets 0 for those darts (bust darts are unhelpful).
      const perDart = v.outcome === 'BUST' ? 0 : v.visitScore / v.darts.length;
      legFirst9Points[v.playerIdx] += perDart * take;
      legFirst9Darts[v.playerIdx] += take;
    }
    for (let i = 0; i < n; i++) {
      first9Points[i] += legFirst9Points[i];
      first9Darts[i] += legFirst9Darts[i];
    }
  }

  for (let i = 0; i < n; i++) {
    const s = out[i];
    s.threeDartAverage = s.dartsThrown > 0 ? (s.pointsScored / s.dartsThrown) * 3 : 0;
    s.first9Average = first9Darts[i] > 0 ? (first9Points[i] / first9Darts[i]) * 3 : 0;
  }
  return out;
}

export function currentLegLeader(leg: LegState): number {
  let bestIdx = 0;
  let bestRemaining = leg.perPlayer[0].remaining;
  for (let i = 1; i < leg.perPlayer.length; i++) {
    if (leg.perPlayer[i].remaining < bestRemaining) {
      bestRemaining = leg.perPlayer[i].remaining;
      bestIdx = i;
    }
  }
  return bestIdx;
}
