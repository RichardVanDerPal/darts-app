import { useState } from 'react';
import type { HalveItTarget } from '../engine/halveIt';
import { maxHitsForTarget, targetUnitValue } from '../engine/halveIt';

interface Props {
  target: HalveItTarget;
  onSubmit: (hits: number) => void;
}

/**
 * Hits-count entry pad for Halve It. The user selects how many "target hit
 * units" they landed (singles = 1, doubles = 2, trebles = 3; for the Bull
 * round, outer bull = 1 and bull = 2). Range is 0..9 for numbered rounds,
 * 0..6 for the Bull round. Tapping a number selects it; Submit sends it.
 * Tap 0 → the round is halved (§rules).
 */
export function HalveItHitsPad({ target, onSubmit }: Props) {
  const max = maxHitsForTarget(target);
  const unit = targetUnitValue(target);
  const [selected, setSelected] = useState<number | null>(null);

  const submit = () => {
    if (selected === null) return;
    onSubmit(selected);
    setSelected(null);
  };

  const projected = selected === null ? null : selected * unit;
  const willHalve = selected === 0;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between rounded-md bg-slate-100 p-3 dark:bg-slate-900">
        <div className="text-sm">
          <div className="opacity-70">Hits on target</div>
          <div className="mt-0.5 text-3xl font-black tabular-nums">
            {selected ?? '—'}
          </div>
        </div>
        <div className="text-right text-sm">
          <div className="opacity-70">This visit</div>
          <div
            className={
              'mt-0.5 text-3xl font-black tabular-nums ' +
              (willHalve ? 'text-red-600' : '')
            }
          >
            {willHalve ? 'Halve' : projected === null ? '—' : `+${projected}`}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-5 gap-2">
        {Array.from({ length: max + 1 }, (_, i) => i).map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => setSelected(n)}
            className={
              'rounded-md py-4 text-2xl font-black tabular-nums ' +
              (selected === n
                ? 'bg-red-600 text-white'
                : n === 0
                  ? 'bg-slate-200 dark:bg-slate-800'
                  : 'bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700')
            }
          >
            {n}
          </button>
        ))}
      </div>

      <button
        type="button"
        onClick={submit}
        disabled={selected === null}
        className="mt-1 rounded-lg bg-red-600 py-3 font-semibold text-white shadow disabled:opacity-40"
      >
        Submit visit
      </button>

      <p className="text-center text-xs opacity-60">
        Singles = 1 · Doubles = 2 · Trebles = 3
        {target.kind === 'bull' && ' · Outer bull = 1 · Bull = 2'}
      </p>
    </div>
  );
}
