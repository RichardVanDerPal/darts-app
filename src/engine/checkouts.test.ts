import { describe, it, expect } from 'vitest';
import { suggestCheckout, isCheckoutable } from './checkouts';

describe('suggestCheckout — 1-dart finishes', () => {
  it('suggests D20 for 40', () => {
    expect(suggestCheckout(40, 1)).toEqual(['D20']);
  });
  it('suggests Bull for 50', () => {
    expect(suggestCheckout(50, 1)).toEqual(['Bull']);
  });
  it('suggests D8 for 16', () => {
    expect(suggestCheckout(16, 1)).toEqual(['D8']);
  });
  it('returns null for odd 1-dart requests', () => {
    expect(suggestCheckout(3, 1)).toBeNull();
    expect(suggestCheckout(41, 1)).toBeNull();
  });
});

describe('suggestCheckout — canonical preferred finishes (§5.6)', () => {
  it.each([
    [170, ['T20', 'T20', 'Bull']],
    [167, ['T20', 'T19', 'Bull']],
    [164, ['T20', 'T18', 'Bull']],
    [161, ['T20', 'T17', 'Bull']],
    [160, ['T20', 'T20', 'D20']],
    [100, ['T20', 'D20']],
    [81, ['T19', 'D12']],
    [60, ['20', 'D20']],
    [50, ['Bull']],
    [40, ['D20']],
    [32, ['D16']],
    [24, ['D12']],
    [16, ['D8']],
    [8, ['D4']],
    [4, ['D2']],
    [2, ['D1']],
  ] as const)('checkout for %i', (remaining, expected) => {
    expect(suggestCheckout(remaining, 3)).toEqual(expected);
  });
});

describe('suggestCheckout — unachievable 3-dart scores (§5.6 note)', () => {
  it.each([169, 168, 166, 165, 163, 162, 159])(
    '%i is not checkoutable in 3 darts',
    (remaining) => {
      expect(suggestCheckout(remaining, 3)).toBeNull();
      expect(isCheckoutable(remaining)).toBe(false);
    },
  );

  it('170 is the highest 3-dart checkout', () => {
    expect(isCheckoutable(170)).toBe(true);
    expect(isCheckoutable(171)).toBe(false);
  });
});

describe('suggestCheckout — general validity', () => {
  it('always ends on a valid double', () => {
    const doubles = new Set([
      'Bull',
      ...Array.from({ length: 20 }, (_, i) => `D${i + 1}`),
    ]);
    for (let r = 2; r <= 170; r++) {
      const s = suggestCheckout(r, 3);
      if (s === null) continue;
      expect(doubles.has(s[s.length - 1])).toBe(true);
    }
  });

  it('returns null for scores below 2 or above 170', () => {
    expect(suggestCheckout(1, 3)).toBeNull();
    expect(suggestCheckout(0, 3)).toBeNull();
    expect(suggestCheckout(171, 3)).toBeNull();
  });

  it('respects dartsLeft limit', () => {
    expect(suggestCheckout(170, 2)).toBeNull(); // 170 needs 3 darts
    expect(suggestCheckout(100, 1)).toBeNull();
    expect(suggestCheckout(100, 2)).toEqual(['T20', 'D20']);
  });
});
