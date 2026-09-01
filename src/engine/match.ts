// Match orchestration: legs, alternating starters, best-of-N.
import { processVisit, processVisitTotal, type VisitTotalOptions, type VisitResult } from './engine';
import type {
  Dart,
  LegState,
  MatchConfig,
  MatchState,
  Player,
  PlayerLegState,
  VisitRecord,
} from './types';

function variantStart(config: MatchConfig): number {
  return config.variant === '501' ? 501 : 301;
}

function makePlayerLegState(config: MatchConfig): PlayerLegState {
  return {
    remaining: variantStart(config),
    opened: !config.doubleIn,
    dartsThrown: 0,
    pointsScored: 0,
    highestVisit: 0,
    highestCheckout: 0,
  };
}

function makeLeg(
  legIndex: number,
  startingPlayerIdx: number,
  playerCount: number,
  config: MatchConfig,
): LegState {
  return {
    legIndex,
    startingPlayerIdx,
    currentPlayerIdx: startingPlayerIdx,
    perPlayer: Array.from({ length: playerCount }, () => makePlayerLegState(config)),
    visits: [],
    winnerIdx: null,
  };
}

export function createMatch(config: MatchConfig, players: Player[]): MatchState {
  if (players.length < 2 || players.length > 4) {
    throw new Error(`Match requires 2–4 players, got ${players.length}`);
  }
  if (config.bestOfLegs < 1 || !Number.isInteger(config.bestOfLegs)) {
    throw new Error(`bestOfLegs must be a positive integer, got ${config.bestOfLegs}`);
  }
  const now = Date.now();
  const normalizedConfig: MatchConfig = { ...config, kind: 'countdown' };
  return {
    config: normalizedConfig,
    players,
    legs: [makeLeg(0, 0, players.length, normalizedConfig)],
    currentLegIdx: 0,
    legsWonByPlayer: new Array(players.length).fill(0),
    status: 'IN_PROGRESS',
    winnerIdx: null,
    createdAt: now,
    updatedAt: now,
  };
}

function legsToWin(bestOfLegs: number): number {
  return Math.floor(bestOfLegs / 2) + 1;
}

/**
 * Submit a visit for the current player. Returns a new MatchState with the
 * visit recorded and turn/leg/match progression applied.
 */
export function submitVisit(state: MatchState, darts: Dart[]): MatchState {
  if (state.status === 'FINISHED') {
    throw new Error('Match is already finished');
  }
  const leg = state.legs[state.currentLegIdx];
  if (leg.winnerIdx !== null) {
    throw new Error('Current leg is already won; advance the leg before submitting');
  }
  const playerIdx = leg.currentPlayerIdx;
  const before = leg.perPlayer[playerIdx];
  const result = processVisit(before, darts, state.config);
  return applyVisitResult(state, playerIdx, result);
}

/**
 * Submit a visit as a total (visit-total input mode).
 */
export function submitVisitTotal(
  state: MatchState,
  opts: VisitTotalOptions,
): MatchState {
  if (state.status === 'FINISHED') {
    throw new Error('Match is already finished');
  }
  const leg = state.legs[state.currentLegIdx];
  if (leg.winnerIdx !== null) {
    throw new Error('Current leg is already won; advance the leg before submitting');
  }
  const playerIdx = leg.currentPlayerIdx;
  const before = leg.perPlayer[playerIdx];
  const result = processVisitTotal(before, opts, state.config);
  return applyVisitResult(state, playerIdx, result);
}

function applyVisitResult(
  state: MatchState,
  playerIdx: number,
  result: VisitResult,
): MatchState {
  const leg = state.legs[state.currentLegIdx];
  const before = leg.perPlayer[playerIdx];

  const visit: VisitRecord = {
    playerIdx,
    darts: result.dartsUsed,
    outcome: result.outcome,
    scoreBefore: before.remaining,
    scoreAfter: result.playerState.remaining,
    visitScore: result.visitScore,
  };

  const perPlayer = leg.perPlayer.map((p, i) => (i === playerIdx ? result.playerState : p));

  let nextLeg: LegState = {
    ...leg,
    perPlayer,
    visits: [...leg.visits, visit],
  };

  const legsWonByPlayer = [...state.legsWonByPlayer];
  const legs = [...state.legs];

  if (result.outcome === 'WIN') {
    nextLeg = { ...nextLeg, winnerIdx: playerIdx };
    legsWonByPlayer[playerIdx] += 1;
    legs[state.currentLegIdx] = nextLeg;

    const target = legsToWin(state.config.bestOfLegs);
    if (legsWonByPlayer[playerIdx] >= target) {
      return {
        ...state,
        legs,
        legsWonByPlayer,
        status: 'FINISHED',
        winnerIdx: playerIdx,
        updatedAt: Date.now(),
      };
    }

    // Start next leg: starting player rotates round-robin from prior starter.
    const nextStartingPlayerIdx =
      (nextLeg.startingPlayerIdx + 1) % state.players.length;
    const newLeg = makeLeg(
      state.currentLegIdx + 1,
      nextStartingPlayerIdx,
      state.players.length,
      state.config,
    );
    legs.push(newLeg);
    return {
      ...state,
      legs,
      currentLegIdx: state.currentLegIdx + 1,
      legsWonByPlayer,
      updatedAt: Date.now(),
    };
  }

  // OK or BUST: advance to next player.
  nextLeg = {
    ...nextLeg,
    currentPlayerIdx: (playerIdx + 1) % state.players.length,
  };
  legs[state.currentLegIdx] = nextLeg;
  return {
    ...state,
    legs,
    updatedAt: Date.now(),
  };
}
