// Halve It engine.
//
// Rules (as spec'd by the app user):
//   - N rounds (1..20, default 9). Round K's target is segment (21 - K), i.e.
//     20, 19, 18, ... descending.
//   - Optionally the last round is Bull instead of a numbered segment.
//   - Each visit a player throws 3 darts. Darts that land on the current
//     target contribute their value (with S/D/T multiplier) to visitScore.
//     For a Bull round, BULL (50) and OUTER_BULL (25) both count as hits.
//   - If all 3 darts miss the target (hits === 0) the player's cumulative
//     score is HALVED (rounded to nearest via Math.round). Otherwise the
//     visit score is added.
//   - Starting player is fixed for the whole match (player 0). Player order
//     within a round is stable.
//   - When the last player has thrown in the last round, the match ends and
//     `winnerIdxs` contains every player tied for the max score.
//
// Two visit entry points are supported:
//   - `submitHalveItVisit(state, darts)` — per-dart entry (Dart[]).
//   - `submitHalveItHits(state, hits)`  — hits-count entry, where `hits` is
//     the sum of multipliers across the 3 darts that landed on target
//     (single = 1, double = 2, treble = 3; for the Bull round, OUTER_BULL = 1
//     unit and BULL = 2 units, one unit = 25 points).
//
// Pure module: no React, no persistence. Match state is immutable — every
// mutator returns a new object, matching the countdown engine's discipline.

import { dartValue, validateDart } from './dart';
import type { Dart, MatchState, NumberSegment, Player } from './types';

export type HalveItTarget =
  | { kind: 'number'; segment: NumberSegment }
  | { kind: 'bull' };

export interface HalveItConfig {
  kind: 'halve-it';
  /** Number of rounds. 1..20. */
  rounds: number;
  /** If true, the final round is Bull instead of a numbered segment. */
  includeBullRound: boolean;
}

export interface HalveItPlayerState {
  /** Cumulative score. Starts at 0. */
  score: number;
  /** Total number of darts that hit the round target across the match. */
  hits: number;
  /** Number of rounds where all 3 darts missed and the score was halved. */
  missedRounds: number;
  /** Highest single-visit score across the match. */
  bestRoundScore: number;
}

export interface HalveItRoundVisit {
  playerIdx: number;
  darts: Dart[];
  hits: number;
  /** Points added on OK visit, 0 on halve. */
  visitScore: number;
  scoreBefore: number;
  scoreAfter: number;
  halved: boolean;
}

export interface HalveItRoundState {
  roundIndex: number;
  target: HalveItTarget;
  visits: HalveItRoundVisit[];
}

export interface HalveItMatchState {
  kind: 'halve-it';
  config: HalveItConfig;
  players: Player[];
  perPlayer: HalveItPlayerState[];
  rounds: HalveItRoundState[];
  currentRoundIdx: number;
  currentPlayerIdx: number;
  /** Fixed for the whole match. */
  startingPlayerIdx: number;
  status: 'IN_PROGRESS' | 'FINISHED';
  /** All player indices tied for max score once finished. Empty until then. */
  winnerIdxs: number[];
  createdAt: number;
  updatedAt: number;
}

/** Discriminated union of every kind of persisted match. */
export type AnyMatchState = MatchState | HalveItMatchState;

/** Type guard used by store / persistence / pages to branch on match kind. */
export function isHalveItMatch(state: AnyMatchState): state is HalveItMatchState {
  return (state as HalveItMatchState).kind === 'halve-it';
}

/** Round K (0-indexed) targets segment (20 - K), unless it's the bull round. */
export function halveItTargets(config: HalveItConfig): HalveItTarget[] {
  const { rounds, includeBullRound } = config;
  if (!Number.isInteger(rounds) || rounds < 1 || rounds > 20) {
    throw new Error(`rounds must be an integer 1..20, got ${rounds}`);
  }
  const targets: HalveItTarget[] = [];
  for (let i = 0; i < rounds; i++) {
    const segment = (20 - i) as NumberSegment;
    targets.push({ kind: 'number', segment });
  }
  if (includeBullRound && rounds >= 1) {
    targets[targets.length - 1] = { kind: 'bull' };
  }
  return targets;
}

/** True if a dart scored on the current round's target. */
export function dartHitsTarget(dart: Dart, target: HalveItTarget): boolean {
  if (target.kind === 'bull') {
    return dart.segment === 'BULL' || dart.segment === 'OUTER_BULL';
  }
  return dart.segment === target.segment;
}

function makePlayerState(): HalveItPlayerState {
  return { score: 0, hits: 0, missedRounds: 0, bestRoundScore: 0 };
}

function makeRound(roundIndex: number, target: HalveItTarget): HalveItRoundState {
  return { roundIndex, target, visits: [] };
}

export function createHalveItMatch(
  config: HalveItConfig,
  players: Player[],
): HalveItMatchState {
  if (players.length < 2 || players.length > 4) {
    throw new Error(`Match requires 2–4 players, got ${players.length}`);
  }
  if (!Number.isInteger(config.rounds) || config.rounds < 1 || config.rounds > 20) {
    throw new Error(`rounds must be an integer 1..20, got ${config.rounds}`);
  }
  const targets = halveItTargets(config);
  const now = Date.now();
  return {
    kind: 'halve-it',
    config,
    players,
    perPlayer: Array.from({ length: players.length }, makePlayerState),
    rounds: [makeRound(0, targets[0])],
    currentRoundIdx: 0,
    currentPlayerIdx: 0,
    startingPlayerIdx: 0,
    status: 'IN_PROGRESS',
    winnerIdxs: [],
    createdAt: now,
    updatedAt: now,
  };
}

function computeWinners(perPlayer: HalveItPlayerState[]): number[] {
  let max = -Infinity;
  for (const p of perPlayer) if (p.score > max) max = p.score;
  const idxs: number[] = [];
  for (let i = 0; i < perPlayer.length; i++) {
    if (perPlayer[i].score === max) idxs.push(i);
  }
  return idxs;
}

/** Points scored per "hit unit" for a target (numbered = segment, bull = 25). */
export function targetUnitValue(target: HalveItTarget): number {
  return target.kind === 'bull' ? 25 : target.segment;
}

/** Max meaningful hits-count for a target: 3 trebles (9) or 3 bullseyes (6). */
export function maxHitsForTarget(target: HalveItTarget): number {
  return target.kind === 'bull' ? 6 : 9;
}

/**
 * Submit a visit for the current player. Returns a new match state with the
 * visit recorded, player advanced, and (if the round has ended) the next
 * round set up or the match finished.
 */
export function submitHalveItVisit(
  state: HalveItMatchState,
  darts: Dart[],
): HalveItMatchState {
  if (state.status === 'FINISHED') {
    throw new Error('Match is already finished');
  }
  if (darts.length === 0 || darts.length > 3) {
    throw new Error(`A visit must have between 1 and 3 darts, got ${darts.length}`);
  }
  darts.forEach(validateDart);

  const target = state.rounds[state.currentRoundIdx].target;
  let hits = 0;
  let visitScore = 0;
  for (const d of darts) {
    if (dartHitsTarget(d, target)) {
      hits += 1;
      visitScore += dartValue(d);
    }
  }
  return applyHalveItVisit(state, darts, hits, visitScore);
}

/**
 * Submit a visit as a hits-count. `hits` is the sum of multipliers across
 * the (up to 3) darts that landed on the target:
 *   - numbered target: single = 1, double = 2, treble = 3 (max 9)
 *   - bull target: outer bull = 1, bull = 2 (one unit = 25 points; max 6)
 * `hits === 0` triggers the halve. The stored visit has `darts: []` since
 * per-dart detail isn't available under this entry mode.
 */
export function submitHalveItHits(
  state: HalveItMatchState,
  hits: number,
): HalveItMatchState {
  if (state.status === 'FINISHED') {
    throw new Error('Match is already finished');
  }
  const target = state.rounds[state.currentRoundIdx].target;
  const max = maxHitsForTarget(target);
  if (!Number.isInteger(hits) || hits < 0 || hits > max) {
    throw new Error(`hits must be an integer 0..${max}, got ${hits}`);
  }
  const visitScore = hits * targetUnitValue(target);
  return applyHalveItVisit(state, [], hits, visitScore);
}

/** Shared visit-application: record the visit, mutate the player, advance turn/round/match. */
function applyHalveItVisit(
  state: HalveItMatchState,
  darts: Dart[],
  hits: number,
  visitScore: number,
): HalveItMatchState {
  const round = state.rounds[state.currentRoundIdx];
  const playerIdx = state.currentPlayerIdx;
  const before = state.perPlayer[playerIdx];

  const scoreBefore = before.score;
  const halved = hits === 0;
  const scoreAfter = halved
    ? Math.round(scoreBefore / 2)
    : scoreBefore + visitScore;

  const nextPerPlayer = state.perPlayer.map((p, i) => {
    if (i !== playerIdx) return p;
    return {
      score: scoreAfter,
      hits: p.hits + hits,
      missedRounds: p.missedRounds + (halved ? 1 : 0),
      bestRoundScore: Math.max(p.bestRoundScore, halved ? 0 : visitScore),
    };
  });

  const visit: HalveItRoundVisit = {
    playerIdx,
    darts,
    hits,
    visitScore: halved ? 0 : visitScore,
    scoreBefore,
    scoreAfter,
    halved,
  };
  const nextRound: HalveItRoundState = {
    ...round,
    visits: [...round.visits, visit],
  };
  const rounds = state.rounds.slice();
  rounds[state.currentRoundIdx] = nextRound;

  const playerCount = state.players.length;
  const nextPlayerIdx = (playerIdx + 1) % playerCount;
  const roundComplete = nextRound.visits.length >= playerCount;

  if (!roundComplete) {
    return {
      ...state,
      perPlayer: nextPerPlayer,
      rounds,
      currentPlayerIdx: nextPlayerIdx,
      updatedAt: Date.now(),
    };
  }

  // Round finished — advance to next round or finish the match.
  const isLastRound = state.currentRoundIdx + 1 >= state.config.rounds;
  if (isLastRound) {
    return {
      ...state,
      perPlayer: nextPerPlayer,
      rounds,
      currentPlayerIdx: state.startingPlayerIdx,
      status: 'FINISHED',
      winnerIdxs: computeWinners(nextPerPlayer),
      updatedAt: Date.now(),
    };
  }

  const targets = halveItTargets(state.config);
  const newRoundIdx = state.currentRoundIdx + 1;
  const newRound = makeRound(newRoundIdx, targets[newRoundIdx]);
  return {
    ...state,
    perPlayer: nextPerPlayer,
    rounds: [...rounds, newRound],
    currentRoundIdx: newRoundIdx,
    currentPlayerIdx: state.startingPlayerIdx,
    updatedAt: Date.now(),
  };
}
