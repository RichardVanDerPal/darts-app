// Checkout suggestions. Encodes §5.6 preferences and falls back to a search
// for less-common scores. All suggestions guarantee the final dart is a
// double (or bull), so they are always valid double-out finishes.

interface ScoringDart {
  label: string;
  value: number;
  isDouble: boolean;
}

const NUMBERS: readonly number[] = [
  20, 19, 18, 17, 16, 15, 14, 13, 12, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1,
];

const DOUBLES: readonly ScoringDart[] = [
  ...NUMBERS.map((n) => ({ label: `D${n}`, value: n * 2, isDouble: true })),
  { label: 'Bull', value: 50, isDouble: true },
];

const TREBLES: readonly ScoringDart[] = NUMBERS.map((n) => ({
  label: `T${n}`,
  value: n * 3,
  isDouble: false,
}));

const SINGLES: readonly ScoringDart[] = [
  ...NUMBERS.map((n) => ({ label: `${n}`, value: n, isDouble: false })),
  { label: '25', value: 25, isDouble: false },
];

/**
 * Scoring darts (non-final) tried in preference order. T20 first, then the
 * classic setup darts, then singles from high to low, then non-preferred
 * trebles and doubles. Doubles come last because using a double mid-visit
 * usually implies suboptimal play.
 */
const SCORING_ORDER: readonly ScoringDart[] = [
  { label: 'T20', value: 60, isDouble: false },
  { label: 'T19', value: 57, isDouble: false },
  { label: 'T18', value: 54, isDouble: false },
  { label: 'T17', value: 51, isDouble: false },
  { label: 'Bull', value: 50, isDouble: true },
  { label: 'T16', value: 48, isDouble: false },
  { label: 'T15', value: 45, isDouble: false },
  { label: 'T14', value: 42, isDouble: false },
  { label: 'T13', value: 39, isDouble: false },
  { label: 'T12', value: 36, isDouble: false },
  { label: 'T11', value: 33, isDouble: false },
  { label: 'T10', value: 30, isDouble: false },
  ...SINGLES,
  ...TREBLES.filter((t) => t.value < 30),
  ...DOUBLES,
];

/**
 * Preferred 1-dart finishes for even scores 2..40 and 50.
 * These are the only valid single-dart checkouts.
 */
function oneDartFinish(remaining: number): ScoringDart | null {
  if (remaining === 50) return { label: 'Bull', value: 50, isDouble: true };
  if (remaining > 0 && remaining <= 40 && remaining % 2 === 0) {
    return { label: `D${remaining / 2}`, value: remaining, isDouble: true };
  }
  return null;
}

/**
 * Hand-picked overrides from §5.6 so common scores match the classic table
 * rather than whatever the search finds first.
 */
const PREFERRED: Readonly<Record<number, readonly string[]>> = {
  170: ['T20', 'T20', 'Bull'],
  167: ['T20', 'T19', 'Bull'],
  164: ['T20', 'T18', 'Bull'],
  161: ['T20', 'T17', 'Bull'],
  160: ['T20', 'T20', 'D20'],
  158: ['T20', 'T20', 'D19'],
  157: ['T20', 'T19', 'D20'],
  156: ['T20', 'T20', 'D18'],
  155: ['T20', 'T19', 'D19'],
  154: ['T20', 'T18', 'D20'],
  153: ['T20', 'T19', 'D18'],
  152: ['T20', 'T20', 'D16'],
  151: ['T20', 'T17', 'D20'],
  150: ['T20', 'T18', 'D18'],
  149: ['T20', 'T19', 'D16'],
  148: ['T20', 'T16', 'D20'],
  147: ['T20', 'T17', 'D18'],
  146: ['T20', 'T18', 'D16'],
  145: ['T20', 'T15', 'D20'],
  144: ['T20', 'T20', 'D12'],
  143: ['T20', 'T17', 'D16'],
  142: ['T20', 'T14', 'D20'],
  141: ['T20', 'T15', 'D18'],
  140: ['T20', 'T20', 'D10'],
  139: ['T19', 'T14', 'D20'],
  138: ['T20', 'T18', 'D12'],
  137: ['T20', 'T15', 'D16'],
  136: ['T20', 'T20', 'D8'],
  135: ['Bull', 'T15', 'D20'],
  134: ['T20', 'T14', 'D16'],
  133: ['T20', 'T19', 'D8'],
  132: ['Bull', 'Bull', 'D16'],
  131: ['T20', 'T13', 'D16'],
  130: ['T20', 'T20', 'D5'],
  129: ['T19', 'T16', 'D12'],
  128: ['T18', 'T14', 'D16'],
  127: ['T20', 'T17', 'D8'],
  126: ['T19', 'T19', 'D6'],
  125: ['T20', 'T15', 'D10'],
  124: ['T20', 'T16', 'D8'],
  123: ['T19', 'T16', 'D9'],
  122: ['T18', 'T18', 'D7'],
  121: ['T20', 'T11', 'D14'],
  120: ['T20', 'S20', 'D20'],
  119: ['T19', 'T12', 'D13'],
  118: ['T20', 'S18', 'D20'],
  117: ['T20', 'S17', 'D20'],
  116: ['T20', 'S16', 'D20'],
  115: ['T20', 'S15', 'D20'],
  114: ['T20', 'S14', 'D20'],
  113: ['T20', 'S13', 'D20'],
  112: ['T20', 'S12', 'D20'],
  111: ['T20', 'S11', 'D20'],
  110: ['T20', 'S10', 'D20'],
  109: ['T20', 'S9', 'D20'],
  108: ['T20', 'S16', 'D16'],
  107: ['T19', 'S10', 'D20'],
  106: ['T20', 'S6', 'D20'],
  105: ['T20', 'S5', 'D20'],
  104: ['T18', 'S18', 'D16'],
  103: ['T20', 'S3', 'D20'],
  102: ['T20', 'S10', 'D16'],
  101: ['T20', 'S9', 'D16'],
  100: ['T20', 'D20'],
  99: ['T19', 'S10', 'D16'],
  98: ['T20', 'D19'],
  97: ['T19', 'D20'],
  96: ['T20', 'D18'],
  95: ['T19', 'D19'],
  94: ['T18', 'D20'],
  93: ['T19', 'D18'],
  92: ['T20', 'D16'],
  91: ['T17', 'D20'],
  90: ['T20', 'D15'],
  89: ['T19', 'D16'],
  88: ['T20', 'D14'],
  87: ['T17', 'D18'],
  86: ['T18', 'D16'],
  85: ['T15', 'D20'],
  84: ['T20', 'D12'],
  83: ['T17', 'D16'],
  82: ['Bull', 'D16'],
  81: ['T19', 'D12'],
  80: ['T20', 'D10'],
  79: ['T19', 'D11'],
  78: ['T18', 'D12'],
  77: ['T19', 'D10'],
  76: ['T20', 'D8'],
  75: ['T17', 'D12'],
  74: ['T14', 'D16'],
  73: ['T19', 'D8'],
  72: ['T16', 'D12'],
  71: ['T13', 'D16'],
  70: ['T18', 'D8'],
  69: ['T19', 'D6'],
  68: ['T20', 'D4'],
  67: ['T17', 'D8'],
  66: ['T10', 'D18'],
  65: ['T19', 'D4'],
  64: ['T16', 'D8'],
  63: ['T13', 'D12'],
  62: ['T10', 'D16'],
  61: ['T15', 'D8'],
  60: ['20', 'D20'],
  50: ['Bull'],
  40: ['D20'],
  32: ['D16'],
  24: ['D12'],
  16: ['D8'],
  8: ['D4'],
  4: ['D2'],
  2: ['D1'],
};

/**
 * Depth-first search for a valid checkout. Guarantees the last dart is a
 * double. Returns the sequence of dart labels or null if unachievable in the
 * given number of darts.
 */
function searchCheckout(remaining: number, dartsLeft: number): string[] | null {
  if (remaining <= 0 || dartsLeft < 1) return null;

  const one = oneDartFinish(remaining);
  if (one) return [one.label];
  if (dartsLeft === 1) return null;

  for (const s of SCORING_ORDER) {
    if (s.value === 0 || s.value >= remaining) continue;
    const rest = searchCheckout(remaining - s.value, dartsLeft - 1);
    if (rest) return [s.label, ...rest];
  }
  return null;
}

/**
 * Suggest a preferred checkout for `remaining` in at most `dartsLeft` darts.
 * Returns null when the score is not checkoutable in that many darts (e.g. 169
 * is not a 3-dart finish, so `suggestCheckout(169, 3)` → null; but the caller
 * can still show a hint after the next scoring dart).
 */
export function suggestCheckout(
  remaining: number,
  dartsLeft: number,
): string[] | null {
  if (dartsLeft < 1 || dartsLeft > 3) return null;
  if (remaining < 2) return null;

  const preferred = PREFERRED[remaining];
  if (preferred && preferred.length <= dartsLeft) {
    return [...preferred];
  }
  return searchCheckout(remaining, dartsLeft);
}

/**
 * True iff `remaining` can be checked out in at most 3 darts.
 */
export function isCheckoutable(remaining: number): boolean {
  return suggestCheckout(remaining, 3) !== null;
}
