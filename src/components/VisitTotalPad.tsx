import { useMemo, useState } from 'react';
import type { VisitTotalOptions } from '../engine/engine';

interface Props {
  remaining: number;
  onSubmit: (opts: VisitTotalOptions) => void;
}

// Totals that cannot be scored with 3 darts. See §5.6 note.
const IMPOSSIBLE_TOTALS = new Set([179, 178, 176, 175, 173, 172, 169]);

export function VisitTotalPad({ remaining, onSubmit }: Props) {
  const [text, setText] = useState('');
  const [pendingCheckout, setPendingCheckout] = useState<number | null>(null);

  const parsed = useMemo(() => parseTotal(text), [text]);
  const error = useMemo(() => validateTotal(parsed, remaining), [parsed, remaining]);
  const wouldCheckout = parsed !== null && !error && remaining - parsed === 0;

  const submit = () => {
    if (parsed === null || error) return;
    if (wouldCheckout) {
      setPendingCheckout(parsed);
      return;
    }
    onSubmit({ total: parsed, finishedOnDouble: false });
    setText('');
  };

  const confirmCheckout = (finishedOnDouble: boolean) => {
    if (pendingCheckout === null) return;
    onSubmit({ total: pendingCheckout, finishedOnDouble });
    setPendingCheckout(null);
    setText('');
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="rounded-md bg-slate-100 p-3 dark:bg-slate-900">
        <div className="flex items-baseline justify-between">
          <label className="text-sm opacity-70">Visit total (0–180)</label>
          <span className="text-sm tabular-nums opacity-70">
            = {parsed !== null && !error ? remaining - parsed : '—'}
          </span>
        </div>
        <input
          value={text}
          onChange={(e) => setText(e.target.value.replace(/[^0-9]/g, ''))}
          inputMode="numeric"
          pattern="[0-9]*"
          placeholder="e.g. 100"
          className="mt-2 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-2xl tabular-nums dark:border-slate-700 dark:bg-slate-950"
        />
        {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
      </div>

      <div className="grid grid-cols-3 gap-2">
        {['1', '2', '3', '4', '5', '6', '7', '8', '9', '⌫', '0', '⏎'].map((key) => (
          <button
            key={key}
            type="button"
            onClick={() => {
              if (key === '⌫') setText(text.slice(0, -1));
              else if (key === '⏎') submit();
              else setText(text + key);
            }}
            className={
              'rounded-md py-4 text-lg font-semibold ' +
              (key === '⏎'
                ? 'bg-red-600 text-white'
                : 'bg-slate-200 dark:bg-slate-800')
            }
          >
            {key}
          </button>
        ))}
      </div>

      {pendingCheckout !== null && (
        <div className="rounded-md border border-red-600 bg-red-50 p-3 dark:bg-red-950/30">
          <p className="mb-2 text-sm font-semibold">
            You scored {pendingCheckout} to reach 0. Was the final dart a double?
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => confirmCheckout(true)}
              className="flex-1 rounded-md bg-red-600 py-2 font-semibold text-white"
            >
              Yes — checkout
            </button>
            <button
              type="button"
              onClick={() => confirmCheckout(false)}
              className="flex-1 rounded-md border border-red-600 py-2 font-semibold text-red-600"
            >
              No — bust
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function parseTotal(text: string): number | null {
  if (text === '') return null;
  const n = Number(text);
  return Number.isFinite(n) ? n : null;
}

function validateTotal(total: number | null, _remaining: number): string | null {
  if (total === null) return null;
  if (total < 0 || total > 180) return 'Total must be between 0 and 180.';
  if (IMPOSSIBLE_TOTALS.has(total)) {
    return `${total} is not achievable with 3 darts.`;
  }
  return null;
}
