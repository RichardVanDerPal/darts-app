import { describe, it, expect } from 'vitest';
import { dartValue, isDouble, visitScore, validateDart, makeDart } from './dart';
import type { Dart } from './types';

describe('dart', () => {
  it('scores misses as 0', () => {
    expect(dartValue({ segment: 'MISS', multiplier: 1 })).toBe(0);
  });

  it('scores outer bull as 25 and bull as 50', () => {
    expect(dartValue({ segment: 'OUTER_BULL', multiplier: 1 })).toBe(25);
    expect(dartValue({ segment: 'BULL', multiplier: 1 })).toBe(50);
  });

  it.each([
    [1, 1, 1],
    [20, 1, 20],
    [20, 2, 40],
    [20, 3, 60],
    [19, 3, 57],
  ] as const)('scores segment %i × %i = %i', (seg, mult, expected) => {
    expect(dartValue({ segment: seg, multiplier: mult })).toBe(expected);
  });

  it('treats bullseye as a double (§4.3)', () => {
    expect(isDouble({ segment: 'BULL', multiplier: 1 })).toBe(true);
  });

  it('does not treat outer bull or miss as a double', () => {
    expect(isDouble({ segment: 'OUTER_BULL', multiplier: 1 })).toBe(false);
    expect(isDouble({ segment: 'MISS', multiplier: 1 })).toBe(false);
  });

  it('treats only ×2 numeric segments as doubles', () => {
    expect(isDouble({ segment: 16, multiplier: 2 })).toBe(true);
    expect(isDouble({ segment: 16, multiplier: 1 })).toBe(false);
    expect(isDouble({ segment: 16, multiplier: 3 })).toBe(false);
  });

  it('sums visit score', () => {
    const darts: Dart[] = [
      { segment: 20, multiplier: 3 },
      { segment: 20, multiplier: 3 },
      { segment: 20, multiplier: 3 },
    ];
    expect(visitScore(darts)).toBe(180);
  });

  it('rejects invalid combinations', () => {
    expect(() => validateDart({ segment: 'BULL', multiplier: 2 } as Dart)).toThrow();
    expect(() => validateDart({ segment: 'MISS', multiplier: 3 } as Dart)).toThrow();
    expect(() => validateDart({ segment: 21 as unknown as 20, multiplier: 1 })).toThrow();
    expect(() => validateDart({ segment: 20, multiplier: 4 as unknown as 3 })).toThrow();
  });

  it('makeDart validates', () => {
    expect(makeDart(20, 3)).toEqual({ segment: 20, multiplier: 3 });
    expect(() => makeDart('BULL', 2 as unknown as 1)).toThrow();
  });
});
