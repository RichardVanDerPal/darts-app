import { describe, it, expect } from 'vitest';
import { processVisit } from './engine';
import type { Dart, MatchConfig, PlayerLegState } from './types';

const config501: MatchConfig = {
  variant: '501',
  bestOfLegs: 1,
  doubleIn: false,
  inputMode: 'per-dart',
};

function fresh(remaining = 501, opened = true): PlayerLegState {
  return {
    remaining,
    opened,
    dartsThrown: 0,
    pointsScored: 0,
    highestVisit: 0,
    highestCheckout: 0,
  };
}

const D = (segment: Dart['segment'], multiplier: Dart['multiplier'] = 1): Dart => ({
  segment,
  multiplier,
});

describe('processVisit — basic scoring', () => {
  it('subtracts three-dart visit from remaining', () => {
    const r = processVisit(
      fresh(501),
      [D(20, 3), D(20, 3), D(20, 3)],
      config501,
    );
    expect(r.outcome).toBe('OK');
    expect(r.visitScore).toBe(180);
    expect(r.playerState.remaining).toBe(321);
    expect(r.playerState.dartsThrown).toBe(3);
    expect(r.playerState.highestVisit).toBe(180);
  });

  it('supports 1- and 2-dart visits without penalty', () => {
    const r1 = processVisit(fresh(200), [D(20, 3)], config501);
    expect(r1.outcome).toBe('OK');
    expect(r1.playerState.remaining).toBe(140);
    expect(r1.playerState.dartsThrown).toBe(1);

    const r2 = processVisit(fresh(200), [D(20, 3), D(19, 3)], config501);
    expect(r2.outcome).toBe('OK');
    expect(r2.playerState.remaining).toBe(200 - 60 - 57);
    expect(r2.playerState.dartsThrown).toBe(2);
  });
});

describe('processVisit — WIN (double-out)', () => {
  it('wins on a single-dart double checkout (§8.7)', () => {
    const r = processVisit(fresh(40), [D(20, 2)], config501);
    expect(r.outcome).toBe('WIN');
    expect(r.visitScore).toBe(40);
    expect(r.playerState.remaining).toBe(0);
    expect(r.playerState.dartsThrown).toBe(1);
    expect(r.playerState.highestCheckout).toBe(40);
  });

  it('wins on the bullseye (double-25) (§4.3)', () => {
    const r = processVisit(fresh(50), [D('BULL')], config501);
    expect(r.outcome).toBe('WIN');
    expect(r.playerState.remaining).toBe(0);
  });

  it('wins on a 3-dart 170 finish (T20, T20, Bull)', () => {
    const r = processVisit(
      fresh(170),
      [D(20, 3), D(20, 3), D('BULL')],
      config501,
    );
    expect(r.outcome).toBe('WIN');
    expect(r.visitScore).toBe(170);
    expect(r.playerState.highestCheckout).toBe(170);
  });

  it('does not consume unused darts on WIN (§8.7)', () => {
    // If we win on dart 1, dart 2 & 3 are not thrown.
    const r = processVisit(fresh(40), [D(20, 2)], config501);
    expect(r.dartsUsed).toHaveLength(1);
    expect(r.playerState.dartsThrown).toBe(1);
  });
});

describe('processVisit — BUST rules (§5.4)', () => {
  it('busts when score would go below 0', () => {
    const r = processVisit(
      fresh(30),
      [D(20, 2), D(10)], // 40 then 10; first dart already busts (30-40 < 0)
      config501,
    );
    expect(r.outcome).toBe('BUST');
    expect(r.visitScore).toBe(0);
    expect(r.playerState.remaining).toBe(30); // reverted
    expect(r.dartsUsed).toHaveLength(1); // stopped at busting dart
  });

  it('busts when score reaches exactly 1', () => {
    const r = processVisit(fresh(3), [D(2)], config501);
    expect(r.outcome).toBe('BUST');
    expect(r.playerState.remaining).toBe(3);
  });

  it('busts when score reaches 0 without a double', () => {
    const r = processVisit(fresh(20), [D(20)], config501);
    expect(r.outcome).toBe('BUST');
    expect(r.playerState.remaining).toBe(20);
  });

  it('busts when score reaches 0 on an outer bull (25 is not a double)', () => {
    const r = processVisit(fresh(25), [D('OUTER_BULL')], config501);
    expect(r.outcome).toBe('BUST');
    expect(r.playerState.remaining).toBe(25);
  });

  it('reverts to start-of-visit score, discarding good scoring earlier in the visit', () => {
    // Start 100. Dart 1: 20 (OK). Dart 2: 20 (OK, remaining=60). Dart 3: 60 (T20) → BUST (0 non-double).
    const r = processVisit(
      fresh(100),
      [D(20), D(20), D(20, 3)],
      config501,
    );
    expect(r.outcome).toBe('BUST');
    expect(r.playerState.remaining).toBe(100);
    expect(r.playerState.dartsThrown).toBe(3); // all 3 attempted
  });

  it('forfeits remaining darts on bust', () => {
    const r = processVisit(
      fresh(20),
      [D(20), D(20), D(20)], // dart 1 already busts (0 non-double)
      config501,
    );
    expect(r.dartsUsed).toHaveLength(1);
    expect(r.playerState.dartsThrown).toBe(1);
  });
});

describe('processVisit — double-in (§5.3)', () => {
  const config = { ...config501, doubleIn: true };

  it('ignores scoring darts before the first double', () => {
    const p = fresh(301, false);
    const r = processVisit(p, [D(20, 3), D(19, 3)], config);
    expect(r.outcome).toBe('OK');
    expect(r.playerState.remaining).toBe(301); // nothing counted
    expect(r.playerState.opened).toBe(false);
  });

  it('opens on a double and counts that double (§8.8)', () => {
    const p = fresh(301, false);
    const r = processVisit(p, [D(20, 3), D(16, 2), D(20, 3)], config);
    expect(r.outcome).toBe('OK');
    expect(r.playerState.opened).toBe(true);
    // D16(32) opens; then T20(60). 301 - 32 - 60 = 209.
    expect(r.playerState.remaining).toBe(209);
  });

  it('bullseye opens as a double', () => {
    const p = fresh(301, false);
    const r = processVisit(p, [D('BULL')], config);
    expect(r.playerState.opened).toBe(true);
    expect(r.playerState.remaining).toBe(251);
  });
});

describe('processVisit — input validation (§9.3)', () => {
  it('rejects zero-dart visits', () => {
    expect(() => processVisit(fresh(), [], config501)).toThrow();
  });

  it('rejects visits with more than 3 darts', () => {
    expect(() =>
      processVisit(fresh(), [D(1), D(1), D(1), D(1)], config501),
    ).toThrow();
  });

  it('rejects structurally invalid darts', () => {
    expect(() =>
      processVisit(fresh(), [{ segment: 'BULL', multiplier: 2 } as Dart], config501),
    ).toThrow();
  });
});
