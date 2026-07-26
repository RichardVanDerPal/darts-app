// Dart-level helpers. Mirrors §4.2, §4.3, §4.4 of Darts-rules.md.
import type { Dart, NumberSegment, Segment, Multiplier } from './types';

const NUMBER_SEGMENTS: readonly NumberSegment[] = [
  1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20,
];

export function isNumberSegment(s: Segment): s is NumberSegment {
  return typeof s === 'number' && (NUMBER_SEGMENTS as readonly number[]).includes(s);
}

export function dartValue(dart: Dart): number {
  switch (dart.segment) {
    case 'MISS':
      return 0;
    case 'OUTER_BULL':
      return 25;
    case 'BULL':
      return 50;
    default:
      return dart.segment * dart.multiplier;
  }
}

export function isDouble(dart: Dart): boolean {
  if (dart.segment === 'BULL') return true;
  if (dart.segment === 'OUTER_BULL' || dart.segment === 'MISS') return false;
  return dart.multiplier === 2;
}

export function visitScore(darts: Dart[]): number {
  let total = 0;
  for (const d of darts) total += dartValue(d);
  return total;
}

/**
 * Validate a dart per §9.3. Throws on structural errors so bad input can never
 * silently corrupt the match state.
 */
export function validateDart(dart: Dart): void {
  const { segment, multiplier } = dart;
  const validMultiplier: Multiplier[] = [1, 2, 3];
  if (!validMultiplier.includes(multiplier)) {
    throw new Error(`Invalid multiplier: ${multiplier}`);
  }
  if (segment === 'BULL' || segment === 'OUTER_BULL' || segment === 'MISS') {
    if (multiplier !== 1) {
      throw new Error(`Segment ${segment} must have multiplier 1, got ${multiplier}`);
    }
    return;
  }
  if (!isNumberSegment(segment)) {
    throw new Error(`Invalid segment: ${String(segment)}`);
  }
}

export function makeDart(segment: Segment, multiplier: Multiplier = 1): Dart {
  const dart: Dart = { segment, multiplier };
  validateDart(dart);
  return dart;
}
