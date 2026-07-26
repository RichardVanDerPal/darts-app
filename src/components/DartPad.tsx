import { useState } from 'react';
import type { Dart, Multiplier, Segment } from '../engine/types';
import { dartValue } from '../engine/dart';

interface Props {
  remaining: number;
  onSubmitVisit: (darts: Dart[]) => void;
}

const NUMBERS: readonly number[] = [
  20, 19, 18, 17, 16, 15, 14, 13, 12, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1,
];

/**
 * Per-dart entry pad: pick multiplier (S/D/T), then tap a segment. Bull /
 * Outer Bull / Miss are always treated as multiplier 1.
 */
export function DartPad({ remaining, onSubmitVisit }: Props) {
  const [multiplier, setMultiplier] = useState<Multiplier>(1);
  const [pending, setPending] = useState<Dart[]>([]);

  const pushDart = (segment: Segment, mult: Multiplier) => {
    if (pending.length >= 3) return;
    const dart: Dart = { segment, multiplier: mult };
    setPending([...pending, dart]);
    setMultiplier(1); // reset after each dart, like a pro scorer
  };

  const tapNumber = (n: number) => {
    pushDart(n as Segment, multiplier);
  };

  const undoLast = () => setPending(pending.slice(0, -1));

  const submit = () => {
    if (pending.length === 0) return;
    onSubmitVisit(pending);
    setPending([]);
    setMultiplier(1);
  };

  const runningTotal = pending.reduce((a, d) => a + dartValue(d), 0);
  const projected = remaining - runningTotal;

  return (
    <div className="flex flex-col gap-3">
      <PendingRow pending={pending} onUndo={undoLast} projected={projected} />

      <div className="flex gap-2">
        {(['S', 'D', 'T'] as const).map((label, i) => {
          const m = (i + 1) as Multiplier;
          return (
            <button
              key={label}
              type="button"
              onClick={() => setMultiplier(m)}
              className={
                'flex-1 rounded-md py-2 text-sm font-semibold ' +
                (multiplier === m
                  ? 'bg-red-600 text-white'
                  : 'bg-slate-200 dark:bg-slate-800')
              }
            >
              {label}
              {multiplier === m && <span className="ml-1 opacity-70">×{m}</span>}
            </button>
          );
        })}
      </div>

      <div className="grid grid-cols-5 gap-1.5">
        {NUMBERS.map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => tapNumber(n)}
            disabled={pending.length >= 3}
            className="rounded-md bg-slate-200 py-3 text-base font-semibold hover:bg-slate-300 disabled:opacity-40 dark:bg-slate-800 dark:hover:bg-slate-700"
          >
            {n}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-3 gap-1.5">
        <button
          type="button"
          onClick={() => pushDart('OUTER_BULL', 1)}
          disabled={pending.length >= 3}
          className="rounded-md bg-slate-200 py-3 text-sm font-semibold disabled:opacity-40 dark:bg-slate-800"
        >
          25
        </button>
        <button
          type="button"
          onClick={() => pushDart('BULL', 1)}
          disabled={pending.length >= 3}
          className="rounded-md bg-red-100 py-3 text-sm font-semibold text-red-700 disabled:opacity-40 dark:bg-red-950/60 dark:text-red-300"
        >
          Bull
        </button>
        <button
          type="button"
          onClick={() => pushDart('MISS', 1)}
          disabled={pending.length >= 3}
          className="rounded-md bg-slate-200 py-3 text-sm font-semibold disabled:opacity-40 dark:bg-slate-800"
        >
          Miss
        </button>
      </div>

      <button
        type="button"
        onClick={submit}
        disabled={pending.length === 0}
        className="mt-1 rounded-lg bg-red-600 py-3 font-semibold text-white shadow disabled:opacity-40"
      >
        Submit visit ({pending.length}/3)
      </button>
    </div>
  );
}

function PendingRow({
  pending,
  onUndo,
  projected,
}: {
  pending: Dart[];
  onUndo: () => void;
  projected: number;
}) {
  return (
    <div className="flex items-center gap-2 rounded-md bg-slate-100 p-2 dark:bg-slate-900">
      {[0, 1, 2].map((i) => {
        const d = pending[i];
        return (
          <div
            key={i}
            className={
              'flex-1 rounded-md py-2 text-center text-sm font-medium ' +
              (d
                ? 'bg-white shadow-sm dark:bg-slate-800'
                : 'border border-dashed border-slate-300 opacity-60 dark:border-slate-700')
            }
          >
            {d ? dartLabel(d) : '—'}
          </div>
        );
      })}
      <button
        type="button"
        onClick={onUndo}
        disabled={pending.length === 0}
        aria-label="Undo last dart"
        className="rounded-md border border-slate-300 px-2 py-2 text-sm disabled:opacity-40 dark:border-slate-700"
      >
        ⌫
      </button>
      <div className="w-14 text-right text-sm tabular-nums">= {projected}</div>
    </div>
  );
}

function dartLabel(d: Dart): string {
  if (d.segment === 'BULL') return 'Bull';
  if (d.segment === 'OUTER_BULL') return '25';
  if (d.segment === 'MISS') return 'Miss';
  const prefix = d.multiplier === 3 ? 'T' : d.multiplier === 2 ? 'D' : '';
  return `${prefix}${d.segment}`;
}
