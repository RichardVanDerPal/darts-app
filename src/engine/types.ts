// Core types for the darts engine. Mirrors §4 and §9.1 of Darts-rules.md.

export type NumberSegment =
  | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10
  | 11 | 12 | 13 | 14 | 15 | 16 | 17 | 18 | 19 | 20;

export type Segment = NumberSegment | 'BULL' | 'OUTER_BULL' | 'MISS';

export type Multiplier = 1 | 2 | 3;

export interface Dart {
  segment: Segment;
  multiplier: Multiplier;
}

export type Variant = '501' | '301';

export interface MatchConfig {
  variant: Variant;
  /** Best-of-N legs. Match ends when a player wins ceil(N/2) legs. */
  bestOfLegs: number;
  /** Optional §5.3 double-in rule. Default false. */
  doubleIn: boolean;
  /** Input mode preference (UI hint only; engine is agnostic). */
  inputMode: 'per-dart' | 'visit-total';
}

export interface Player {
  id: string;
  name: string;
}

export interface PlayerLegState {
  /** Score remaining in the current leg. */
  remaining: number;
  /** For double-in: has this player opened their scoring? */
  opened: boolean;
  /** Darts thrown in this leg (all visits, flattened). */
  dartsThrown: number;
  /** Total points scored in this leg (sum of visit scores, bust-adjusted). */
  pointsScored: number;
  /** Highest single-visit score in this leg. */
  highestVisit: number;
  /** Highest checkout completed in this leg (0 if leg not won by this player). */
  highestCheckout: number;
}

export type VisitOutcome = 'OK' | 'BUST' | 'WIN';

export interface VisitRecord {
  playerIdx: number;
  darts: Dart[];
  outcome: VisitOutcome;
  scoreBefore: number;
  scoreAfter: number;
  /** Points that actually reduced the remaining score (0 on bust). */
  visitScore: number;
}

export interface LegState {
  legIndex: number;
  /** Player who threw first in this leg. */
  startingPlayerIdx: number;
  /** Whose turn it currently is. */
  currentPlayerIdx: number;
  perPlayer: PlayerLegState[];
  visits: VisitRecord[];
  winnerIdx: number | null;
}

export interface MatchState {
  config: MatchConfig;
  players: Player[];
  legs: LegState[];
  currentLegIdx: number;
  legsWonByPlayer: number[];
  status: 'IN_PROGRESS' | 'FINISHED';
  winnerIdx: number | null;
  createdAt: number;
  updatedAt: number;
}
