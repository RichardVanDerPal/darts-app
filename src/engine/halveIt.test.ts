import { describe, it, expect } from 'vitest';
import {
  createHalveItMatch,
  dartHitsTarget,
  halveItTargets,
  maxHitsForTarget,
  submitHalveItHits,
  submitHalveItVisit,
  targetUnitValue,
  type HalveItConfig,
} from './halveIt';
import type { Dart, Player } from './types';

const config = (over: Partial<HalveItConfig> = {}): HalveItConfig => ({
  kind: 'halve-it',
  rounds: 9,
  includeBullRound: false,
  ...over,
});

const players: Player[] = [
  { id: 'a', name: 'Alice' },
  { id: 'b', name: 'Bob' },
];

const D = (segment: Dart['segment'], multiplier: Dart['multiplier'] = 1): Dart => ({
  segment,
  multiplier,
});

const MISS = D('MISS');

describe('halveIt — target sequence', () => {
  it('defaults to 9 rounds: 20 down to 12', () => {
    const targets = halveItTargets(config());
    expect(targets).toHaveLength(9);
    expect(targets.map((t) => (t.kind === 'number' ? t.segment : 'B'))).toEqual([
      20, 19, 18, 17, 16, 15, 14, 13, 12,
    ]);
  });

  it('supports 1 round targeting just 20', () => {
    const targets = halveItTargets(config({ rounds: 1 }));
    expect(targets).toEqual([{ kind: 'number', segment: 20 }]);
  });

  it('replaces the last round with Bull when includeBullRound is on', () => {
    const targets = halveItTargets(config({ rounds: 5, includeBullRound: true }));
    expect(targets).toHaveLength(5);
    expect(targets[0]).toEqual({ kind: 'number', segment: 20 });
    expect(targets[3]).toEqual({ kind: 'number', segment: 17 });
    expect(targets[4]).toEqual({ kind: 'bull' });
  });

  it('rejects out-of-range round counts', () => {
    expect(() => halveItTargets(config({ rounds: 0 }))).toThrow();
    expect(() => halveItTargets(config({ rounds: 21 }))).toThrow();
    expect(() => halveItTargets(config({ rounds: 3.5 }))).toThrow();
  });
});

describe('halveIt — dartHitsTarget', () => {
  it('matches darts on the numbered target regardless of multiplier', () => {
    const t = { kind: 'number' as const, segment: 20 as const };
    expect(dartHitsTarget(D(20, 1), t)).toBe(true);
    expect(dartHitsTarget(D(20, 2), t)).toBe(true);
    expect(dartHitsTarget(D(20, 3), t)).toBe(true);
    expect(dartHitsTarget(D(19, 3), t)).toBe(false);
    expect(dartHitsTarget(D('BULL'), t)).toBe(false);
    expect(dartHitsTarget(MISS, t)).toBe(false);
  });

  it('bull target accepts BULL and OUTER_BULL', () => {
    const t = { kind: 'bull' as const };
    expect(dartHitsTarget(D('BULL'), t)).toBe(true);
    expect(dartHitsTarget(D('OUTER_BULL'), t)).toBe(true);
    expect(dartHitsTarget(D(20, 3), t)).toBe(false);
    expect(dartHitsTarget(MISS, t)).toBe(false);
  });
});

describe('halveIt — createHalveItMatch', () => {
  it('initialises scores to 0 and first target to 20', () => {
    const m = createHalveItMatch(config(), players);
    expect(m.kind).toBe('halve-it');
    expect(m.perPlayer.map((p) => p.score)).toEqual([0, 0]);
    expect(m.rounds).toHaveLength(1);
    expect(m.rounds[0].target).toEqual({ kind: 'number', segment: 20 });
    expect(m.currentRoundIdx).toBe(0);
    expect(m.currentPlayerIdx).toBe(0);
    expect(m.status).toBe('IN_PROGRESS');
    expect(m.winnerIdxs).toEqual([]);
  });

  it('rejects <2 or >4 players', () => {
    expect(() => createHalveItMatch(config(), [players[0]])).toThrow();
    expect(() =>
      createHalveItMatch(config(), [
        players[0],
        players[1],
        { id: 'c', name: 'C' },
        { id: 'd', name: 'D' },
        { id: 'e', name: 'E' },
      ]),
    ).toThrow();
  });

  it('rejects out-of-range rounds', () => {
    expect(() => createHalveItMatch(config({ rounds: 0 }), players)).toThrow();
    expect(() => createHalveItMatch(config({ rounds: 21 }), players)).toThrow();
  });
});

describe('halveIt — visit scoring', () => {
  it('adds the visit score when at least one dart hits target (multipliers count)', () => {
    let m = createHalveItMatch(config(), players);
    m = submitHalveItVisit(m, [D(20, 3), D(20, 2), D(1, 1)]); // T20 + D20 + miss target
    expect(m.perPlayer[0].score).toBe(60 + 40);
    expect(m.perPlayer[0].hits).toBe(2);
    expect(m.perPlayer[0].bestRoundScore).toBe(100);
    expect(m.perPlayer[0].missedRounds).toBe(0);
    expect(m.currentPlayerIdx).toBe(1);
  });

  it('does not halve if any of the 3 darts hit target', () => {
    let m = createHalveItMatch(config(), players);
    m = submitHalveItVisit(m, [D(20, 3), D(20, 3), D(20, 3)]); // Alice R1: 180
    m = submitHalveItVisit(m, [MISS, MISS, MISS]); // Bob R1: 0 -> halved -> still 0
    m = submitHalveItVisit(m, [MISS, MISS, D(19, 1)]); // Alice R2 target 19: last dart saves it, +19
    expect(m.perPlayer[0].score).toBe(199);
    expect(m.perPlayer[0].missedRounds).toBe(0);
  });

  it('halves the score (rounded to nearest) when all 3 darts miss', () => {
    let m = createHalveItMatch(config(), players);
    m = submitHalveItVisit(m, [D(20, 1), D(20, 1), D(5, 1)]); // Alice: 40
    m = submitHalveItVisit(m, [MISS, MISS, MISS]); // Bob: halved (0 stays 0)
    m = submitHalveItVisit(m, [D(1, 1), D(1, 1), D(1, 1)]); // Alice R2: all darts on 1, target is 19 -> halved
    expect(m.perPlayer[0].score).toBe(20); // 40 -> 20
    expect(m.perPlayer[0].missedRounds).toBe(1);
  });

  it('rounds an odd score to nearest when halving (60 -> 30, even case)', () => {
    let m = createHalveItMatch(config(), players);
    m = submitHalveItVisit(m, [D(20, 1), D(20, 1), D(20, 1)]); // Alice: 60
    m = submitHalveItVisit(m, [MISS, MISS, MISS]); // Bob halved
    m = submitHalveItVisit(m, [MISS, MISS, MISS]); // Alice round 2 -> 60/2 = 30
    expect(m.perPlayer[0].score).toBe(30);
  });

  it('rounds an odd score to nearest when halving (57 -> 29)', () => {
    // Build Alice up to 57 across three single-hit rounds, then miss to halve.
    // Math.round(57 / 2) === 29 in JS (28.5 rounds away from zero).
    let s = createHalveItMatch(config({ rounds: 5 }), players);
    s = submitHalveItVisit(s, [D(20, 1), MISS, MISS]); // Alice R1: +20 -> 20
    s = submitHalveItVisit(s, [MISS, MISS, MISS]);     // Bob R1
    s = submitHalveItVisit(s, [D(19, 1), MISS, MISS]); // Alice R2: +19 -> 39
    s = submitHalveItVisit(s, [MISS, MISS, MISS]);     // Bob R2
    s = submitHalveItVisit(s, [D(18, 1), MISS, MISS]); // Alice R3: +18 -> 57
    s = submitHalveItVisit(s, [MISS, MISS, MISS]);     // Bob R3
    expect(s.perPlayer[0].score).toBe(57);
    s = submitHalveItVisit(s, [MISS, MISS, MISS]);     // Alice R4 halves 57 -> 29
    expect(s.perPlayer[0].score).toBe(29);
  });

  it('scores BULL/OUTER_BULL correctly in a bull round', () => {
    let m = createHalveItMatch(config({ rounds: 2, includeBullRound: true }), players);
    // R1 target 20 for both
    m = submitHalveItVisit(m, [D(20, 3), MISS, MISS]);
    m = submitHalveItVisit(m, [D(20, 1), MISS, MISS]);
    // R2 target is Bull
    expect(m.rounds[1].target).toEqual({ kind: 'bull' });
    m = submitHalveItVisit(m, [D('BULL'), D('OUTER_BULL'), MISS]); // 50 + 25 = 75 added
    expect(m.perPlayer[0].score).toBe(60 + 75);
    expect(m.perPlayer[0].hits).toBe(3); // T20 in R1 = 1 hit, BULL + OUTER_BULL = 2 hits
  });
});

describe('halveIt — round advancement', () => {
  it('advances to next round only after all players have thrown', () => {
    let m = createHalveItMatch(config({ rounds: 3 }), players);
    m = submitHalveItVisit(m, [D(20, 1), MISS, MISS]); // Alice
    expect(m.currentRoundIdx).toBe(0);
    expect(m.currentPlayerIdx).toBe(1);
    m = submitHalveItVisit(m, [MISS, MISS, MISS]); // Bob (halved)
    expect(m.currentRoundIdx).toBe(1);
    expect(m.currentPlayerIdx).toBe(0);
    expect(m.rounds).toHaveLength(2);
    expect(m.rounds[1].target).toEqual({ kind: 'number', segment: 19 });
  });

  it('preserves player order — starter is always player 0', () => {
    let m = createHalveItMatch(config({ rounds: 3 }), players);
    m = submitHalveItVisit(m, [MISS, MISS, MISS]); // Alice
    m = submitHalveItVisit(m, [MISS, MISS, MISS]); // Bob
    expect(m.currentPlayerIdx).toBe(0);
    m = submitHalveItVisit(m, [MISS, MISS, MISS]); // Alice R2
    m = submitHalveItVisit(m, [MISS, MISS, MISS]); // Bob R2
    expect(m.currentPlayerIdx).toBe(0);
    expect(m.currentRoundIdx).toBe(2);
  });
});

describe('halveIt — match completion', () => {
  it('finishes after the configured number of rounds', () => {
    let m = createHalveItMatch(config({ rounds: 2 }), players);
    m = submitHalveItVisit(m, [D(20, 3), MISS, MISS]); // Alice 60
    m = submitHalveItVisit(m, [D(20, 1), MISS, MISS]); // Bob 20
    m = submitHalveItVisit(m, [D(19, 1), MISS, MISS]); // Alice 79
    expect(m.status).toBe('IN_PROGRESS');
    m = submitHalveItVisit(m, [MISS, MISS, MISS]); // Bob halved -> 10
    expect(m.status).toBe('FINISHED');
    expect(m.winnerIdxs).toEqual([0]);
    expect(m.perPlayer[0].score).toBe(79);
    expect(m.perPlayer[1].score).toBe(10);
  });

  it('reports ties by including every top-score player index', () => {
    let m = createHalveItMatch(config({ rounds: 1 }), players);
    m = submitHalveItVisit(m, [D(20, 1), MISS, MISS]); // Alice 20
    m = submitHalveItVisit(m, [D(20, 1), MISS, MISS]); // Bob 20
    expect(m.status).toBe('FINISHED');
    expect(m.winnerIdxs).toEqual([0, 1]);
  });

  it('rejects submitting a visit after the match is finished', () => {
    let m = createHalveItMatch(config({ rounds: 1 }), players);
    m = submitHalveItVisit(m, [D(20, 1), MISS, MISS]);
    m = submitHalveItVisit(m, [D(20, 1), MISS, MISS]);
    expect(() => submitHalveItVisit(m, [MISS, MISS, MISS])).toThrow();
  });
});

describe('halveIt — validation', () => {
  it('rejects visits with 0 or >3 darts', () => {
    const m = createHalveItMatch(config(), players);
    expect(() => submitHalveItVisit(m, [])).toThrow();
    expect(() =>
      submitHalveItVisit(m, [MISS, MISS, MISS, MISS]),
    ).toThrow();
  });

  it('accepts partial visits (1 or 2 darts)', () => {
    let m = createHalveItMatch(config(), players);
    m = submitHalveItVisit(m, [D(20, 3)]); // 1-dart visit, hits target
    expect(m.perPlayer[0].score).toBe(60);
    // No halve because at least one dart hit.
    expect(m.perPlayer[0].missedRounds).toBe(0);
  });

  it('a 1-dart visit that misses still halves the score', () => {
    let m = createHalveItMatch(config(), players);
    m = submitHalveItVisit(m, [D(20, 1), D(20, 1), D(20, 1)]); // Alice: 60
    m = submitHalveItVisit(m, [D(20, 1), MISS, MISS]); // Bob: 20
    m = submitHalveItVisit(m, [MISS]); // Alice R2 with 1 dart -> halved
    expect(m.perPlayer[0].score).toBe(30);
    expect(m.perPlayer[0].missedRounds).toBe(1);
  });
});

describe('halveIt — hits-count entry', () => {
  it('targetUnitValue and maxHitsForTarget', () => {
    expect(targetUnitValue({ kind: 'number', segment: 20 })).toBe(20);
    expect(targetUnitValue({ kind: 'number', segment: 12 })).toBe(12);
    expect(targetUnitValue({ kind: 'bull' })).toBe(25);
    expect(maxHitsForTarget({ kind: 'number', segment: 20 })).toBe(9);
    expect(maxHitsForTarget({ kind: 'bull' })).toBe(6);
  });

  it('adds hits × segment for a numbered target (T20 = 3 hits = 60)', () => {
    let m = createHalveItMatch(config(), players);
    m = submitHalveItHits(m, 3); // one T20 == 3 hit-units
    expect(m.perPlayer[0].score).toBe(60);
    expect(m.perPlayer[0].hits).toBe(3);
    expect(m.perPlayer[0].bestRoundScore).toBe(60);
    expect(m.currentPlayerIdx).toBe(1);
  });

  it('halves the score when hits === 0', () => {
    let m = createHalveItMatch(config(), players);
    m = submitHalveItHits(m, 5); // Alice: 100
    m = submitHalveItHits(m, 1); // Bob: 20
    m = submitHalveItHits(m, 0); // Alice R2: halve 100 -> 50
    expect(m.perPlayer[0].score).toBe(50);
    expect(m.perPlayer[0].missedRounds).toBe(1);
  });

  it('rejects negative or over-max hits', () => {
    const m = createHalveItMatch(config(), players);
    expect(() => submitHalveItHits(m, -1)).toThrow();
    expect(() => submitHalveItHits(m, 10)).toThrow();
    expect(() => submitHalveItHits(m, 1.5)).toThrow();
  });

  it('bull round accepts up to 6 hits (3 bullseyes × 25 units)', () => {
    let m = createHalveItMatch(config({ rounds: 2, includeBullRound: true }), players);
    m = submitHalveItHits(m, 3); // R1 target 20: 60
    m = submitHalveItHits(m, 1); // Bob R1: 20
    // R2 target is bull, unit value 25
    expect(m.rounds[1].target).toEqual({ kind: 'bull' });
    m = submitHalveItHits(m, 6); // Alice R2: 6 × 25 = 150
    expect(m.perPlayer[0].score).toBe(60 + 150);
    expect(() => submitHalveItHits(m, 7)).toThrow();
  });

  it('completes the match and detects ties', () => {
    let m = createHalveItMatch(config({ rounds: 1 }), players);
    m = submitHalveItHits(m, 2); // Alice 40
    m = submitHalveItHits(m, 2); // Bob 40
    expect(m.status).toBe('FINISHED');
    expect(m.winnerIdxs).toEqual([0, 1]);
  });

  it('interleaves cleanly with dart-based visits (same round)', () => {
    let m = createHalveItMatch(config({ rounds: 2 }), players);
    m = submitHalveItVisit(m, [D(20, 3), MISS, MISS]); // Alice: 60 via darts
    m = submitHalveItHits(m, 2); // Bob: 40 via hits
    expect(m.currentRoundIdx).toBe(1);
    expect(m.perPlayer[0].score).toBe(60);
    expect(m.perPlayer[1].score).toBe(40);
  });
});
