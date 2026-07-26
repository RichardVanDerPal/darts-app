// Visit resolution. Implements §5.5 of Darts-rules.md.
import { dartValue, isDouble, validateDart } from './dart';
import type { Dart, PlayerLegState, VisitOutcome, MatchConfig } from './types';

export interface VisitResult {
  outcome: VisitOutcome;
  /** Points that were actually applied to `remaining` (0 on bust). */
  visitScore: number;
  /** Darts effectively used before WIN/BUST short-circuited the visit. */
  dartsUsed: Dart[];
  /** The new PlayerLegState. Mutation is avoided — caller receives a new object. */
  playerState: PlayerLegState;
}

/**
 * Process a visit (up to 3 darts) against a player's leg state.
 *
 * Bust conditions (§5.4):
 *   1. score < 0
 *   2. score == 1
 *   3. score == 0 without the final scoring dart being a double
 * On bust: `remaining` reverts to the value at the start of the visit and any
 * remaining darts in the visit are forfeited.
 *
 * Double-in (§5.3, opt-in): darts thrown before `opened === true` do not
 * reduce `remaining`. The dart that *opens* is a double, and its own value
 * DOES count (§8.8).
 */
export function processVisit(
  before: PlayerLegState,
  darts: Dart[],
  config: MatchConfig,
): VisitResult {
  if (darts.length === 0 || darts.length > 3) {
    throw new Error(`A visit must have between 1 and 3 darts, got ${darts.length}`);
  }
  darts.forEach(validateDart);

  const startingScore = before.remaining;
  let running = startingScore;
  let opened = before.opened;
  const used: Dart[] = [];

  for (const d of darts) {
    used.push(d);
    const v = dartValue(d);

    // Double-in gate: darts thrown before opening do not reduce score.
    if (config.doubleIn && !opened) {
      if (!isDouble(d)) continue;
      opened = true;
      // fall through: this double's value DOES count (§8.8)
    }

    const next = running - v;

    if (next < 0 || next === 1) {
      return bust(before, startingScore, used);
    }

    if (next === 0) {
      if (isDouble(d)) {
        const nextState: PlayerLegState = {
          remaining: 0,
          opened: true,
          dartsThrown: before.dartsThrown + used.length,
          pointsScored: before.pointsScored + (startingScore - 0),
          highestVisit: Math.max(before.highestVisit, startingScore),
          highestCheckout: Math.max(before.highestCheckout, startingScore),
        };
        return {
          outcome: 'WIN',
          visitScore: startingScore,
          dartsUsed: used,
          playerState: nextState,
        };
      }
      return bust(before, startingScore, used);
    }

    running = next;
  }

  const finalScore = startingScore - running;
  const nextState: PlayerLegState = {
    remaining: running,
    opened,
    dartsThrown: before.dartsThrown + used.length,
    pointsScored: before.pointsScored + finalScore,
    highestVisit: Math.max(before.highestVisit, finalScore),
    highestCheckout: before.highestCheckout,
  };
  return {
    outcome: 'OK',
    visitScore: finalScore,
    dartsUsed: used,
    playerState: nextState,
  };
}

function bust(
  before: PlayerLegState,
  startingScore: number,
  used: Dart[],
): VisitResult {
  return {
    outcome: 'BUST',
    visitScore: 0,
    dartsUsed: used,
    playerState: {
      remaining: startingScore,
      opened: before.opened,
      dartsThrown: before.dartsThrown + used.length,
      pointsScored: before.pointsScored,
      highestVisit: before.highestVisit,
      highestCheckout: before.highestCheckout,
    },
  };
}

/**
 * Alternative entry point for visit-total input mode. Because a raw total
 * doesn't reveal whether the final dart was a double, the UI must ask the
 * user via `finishedOnDouble` whenever `remaining - total === 0`.
 *
 * We assume 3 darts thrown when `dartsUsed` isn't specified. This is a mild
 * inaccuracy in per-player dart counts under this input mode, but it keeps
 * the UI simple and averages remain broadly meaningful.
 */
export interface VisitTotalOptions {
  total: number;
  finishedOnDouble: boolean;
  /** Number of darts the player actually threw. Defaults to 3. */
  dartsUsed?: number;
}

export function processVisitTotal(
  before: PlayerLegState,
  opts: VisitTotalOptions,
  _config: MatchConfig,
): VisitResult {
  const { total, finishedOnDouble } = opts;
  const dartsUsedCount = opts.dartsUsed ?? 3;

  if (!Number.isInteger(total) || total < 0 || total > 180) {
    throw new Error(`Visit total must be an integer 0..180, got ${total}`);
  }
  if (dartsUsedCount < 1 || dartsUsedCount > 3) {
    throw new Error(`dartsUsed must be 1..3, got ${dartsUsedCount}`);
  }

  const startingScore = before.remaining;
  const next = startingScore - total;
  const empty: Dart[] = [];

  if (next < 0 || next === 1) {
    return {
      outcome: 'BUST',
      visitScore: 0,
      dartsUsed: empty,
      playerState: {
        remaining: startingScore,
        opened: before.opened,
        dartsThrown: before.dartsThrown + dartsUsedCount,
        pointsScored: before.pointsScored,
        highestVisit: before.highestVisit,
        highestCheckout: before.highestCheckout,
      },
    };
  }

  if (next === 0) {
    if (!finishedOnDouble) {
      return {
        outcome: 'BUST',
        visitScore: 0,
        dartsUsed: empty,
        playerState: {
          remaining: startingScore,
          opened: before.opened,
          dartsThrown: before.dartsThrown + dartsUsedCount,
          pointsScored: before.pointsScored,
          highestVisit: before.highestVisit,
          highestCheckout: before.highestCheckout,
        },
      };
    }
    return {
      outcome: 'WIN',
      visitScore: startingScore,
      dartsUsed: empty,
      playerState: {
        remaining: 0,
        opened: true,
        dartsThrown: before.dartsThrown + dartsUsedCount,
        pointsScored: before.pointsScored + startingScore,
        highestVisit: Math.max(before.highestVisit, startingScore),
        highestCheckout: Math.max(before.highestCheckout, startingScore),
      },
    };
  }

  return {
    outcome: 'OK',
    visitScore: total,
    dartsUsed: empty,
    playerState: {
      remaining: next,
      opened: before.opened || total > 0,
      dartsThrown: before.dartsThrown + dartsUsedCount,
      pointsScored: before.pointsScored + total,
      highestVisit: Math.max(before.highestVisit, total),
      highestCheckout: before.highestCheckout,
    },
  };
}
