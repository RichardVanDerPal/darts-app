import { describe, it, expect } from 'vitest';
import { createMatch, submitVisit } from './match';
import type { Dart, MatchConfig, Player } from './types';

const config = (over: Partial<MatchConfig> = {}): MatchConfig => ({
  variant: '501',
  bestOfLegs: 1,
  doubleIn: false,
  inputMode: 'per-dart',
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

const T20 = D(20, 3);

describe('match — turn progression', () => {
  it('starts with player 0 and rotates after a normal visit', () => {
    const m = createMatch(config(), players);
    expect(m.legs[0].currentPlayerIdx).toBe(0);

    const m2 = submitVisit(m, [T20, T20, T20]);
    expect(m2.legs[0].currentPlayerIdx).toBe(1);
    expect(m2.legs[0].perPlayer[0].remaining).toBe(321);
    expect(m2.legs[0].perPlayer[1].remaining).toBe(501);
  });

  it('rotates player after a BUST', () => {
    const m = createMatch(config(), players);
    // Alice reduces to 20.
    let s = m;
    s = submitVisit(s, [T20, T20, T20]); // 321
    s = submitVisit(s, [T20, T20, T20]); // Bob 321
    s = submitVisit(s, [T20, T20, T20]); // Alice 141
    s = submitVisit(s, [T20, T20, T20]); // Bob 141
    s = submitVisit(s, [T20, T20, D(3, 3)]); // Alice: 141-60-60-9 = 12
    expect(s.legs[0].perPlayer[0].remaining).toBe(12);
    expect(s.legs[0].currentPlayerIdx).toBe(1);
  });
});

describe('match — leg and match completion', () => {
  it('completes a leg on WIN and advances to next leg with alternating starter', () => {
    const m = createMatch(config({ bestOfLegs: 3 }), players);
    // Fast-forward: build a state where Alice is on 40.
    const s0 = {
      ...m,
      legs: [
        {
          ...m.legs[0],
          perPlayer: [
            { ...m.legs[0].perPlayer[0], remaining: 40 },
            m.legs[0].perPlayer[1],
          ],
        },
      ],
    };
    const s1 = submitVisit(s0, [D(20, 2)]);
    expect(s1.legs[0].winnerIdx).toBe(0);
    expect(s1.legsWonByPlayer).toEqual([1, 0]);
    expect(s1.status).toBe('IN_PROGRESS');
    expect(s1.currentLegIdx).toBe(1);
    expect(s1.legs[1].startingPlayerIdx).toBe(1); // alternates
    expect(s1.legs[1].currentPlayerIdx).toBe(1);
    expect(s1.legs[1].perPlayer[0].remaining).toBe(501);
  });

  it('declares the match winner when best-of legs reached', () => {
    const m = createMatch(config({ bestOfLegs: 1 }), players);
    const s0 = {
      ...m,
      legs: [
        {
          ...m.legs[0],
          perPlayer: [
            { ...m.legs[0].perPlayer[0], remaining: 32 },
            m.legs[0].perPlayer[1],
          ],
        },
      ],
    };
    const s1 = submitVisit(s0, [D(16, 2)]);
    expect(s1.status).toBe('FINISHED');
    expect(s1.winnerIdx).toBe(0);
  });

  it('rejects submissions after match is finished', () => {
    const finished = createMatch(config(), players);
    const done = { ...finished, status: 'FINISHED' as const };
    expect(() => submitVisit(done, [T20])).toThrow();
  });
});
