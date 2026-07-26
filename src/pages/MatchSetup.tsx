import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMatchStore } from '../store/matchStore';
import type { MatchConfig, Player, Variant } from '../engine/types';

interface Draft {
  variant: Variant;
  bestOfLegs: number;
  doubleIn: boolean;
  inputMode: MatchConfig['inputMode'];
  names: string[];
}

const DEFAULT_NAMES = ['Player 1', 'Player 2', 'Player 3', 'Player 4'];

export function MatchSetupPage() {
  const navigate = useNavigate();
  const startMatch = useMatchStore((s) => s.startMatch);

  const [draft, setDraft] = useState<Draft>({
    variant: '501',
    bestOfLegs: 3,
    doubleIn: false,
    inputMode: 'per-dart',
    names: [DEFAULT_NAMES[0], DEFAULT_NAMES[1]],
  });

  const canAddPlayer = draft.names.length < 4;
  const canRemovePlayer = draft.names.length > 2;

  const start = () => {
    const players: Player[] = draft.names.map((n, i) => ({
      id: `p${i}`,
      name: n.trim() || DEFAULT_NAMES[i],
    }));
    const config: MatchConfig = {
      variant: draft.variant,
      bestOfLegs: draft.bestOfLegs,
      doubleIn: draft.doubleIn,
      inputMode: draft.inputMode,
    };
    startMatch(config, players);
    navigate('/game');
  };

  return (
    <div className="flex flex-col gap-6 py-4">
      <h1 className="text-xl font-semibold">New match</h1>

      <Field label="Variant">
        <ChoiceRow
          value={draft.variant}
          options={[
            ['501', '501'],
            ['301', '301'],
          ]}
          onChange={(v) => setDraft({ ...draft, variant: v as Variant })}
        />
      </Field>

      <Field label="Best of legs">
        <ChoiceRow
          value={String(draft.bestOfLegs)}
          options={[
            ['1', '1'],
            ['3', '3'],
            ['5', '5'],
            ['7', '7'],
          ]}
          onChange={(v) => setDraft({ ...draft, bestOfLegs: Number(v) })}
        />
      </Field>

      <Field label="Input mode">
        <ChoiceRow
          value={draft.inputMode}
          options={[
            ['per-dart', 'Per dart'],
            ['visit-total', 'Visit total'],
          ]}
          onChange={(v) =>
            setDraft({ ...draft, inputMode: v as MatchConfig['inputMode'] })
          }
        />
      </Field>

      <Field label="Double-in (start on a double)">
        <ChoiceRow
          value={draft.doubleIn ? 'on' : 'off'}
          options={[
            ['off', 'Off'],
            ['on', 'On'],
          ]}
          onChange={(v) => setDraft({ ...draft, doubleIn: v === 'on' })}
        />
      </Field>

      <Field label="Players">
        <div className="flex flex-col gap-2">
          {draft.names.map((name, i) => (
            <div key={i} className="flex items-center gap-2">
              <span className="w-6 text-sm opacity-60">{i + 1}.</span>
              <input
                value={name}
                onChange={(e) => {
                  const names = [...draft.names];
                  names[i] = e.target.value;
                  setDraft({ ...draft, names });
                }}
                className="flex-1 rounded-md border border-slate-300 bg-white px-3 py-2 text-base dark:border-slate-700 dark:bg-slate-900"
                placeholder={DEFAULT_NAMES[i]}
              />
              {canRemovePlayer && (
                <button
                  type="button"
                  onClick={() =>
                    setDraft({
                      ...draft,
                      names: draft.names.filter((_, j) => j !== i),
                    })
                  }
                  className="rounded-md border border-slate-300 px-2 py-2 text-sm dark:border-slate-700"
                  aria-label={`Remove player ${i + 1}`}
                >
                  ✕
                </button>
              )}
            </div>
          ))}
          {canAddPlayer && (
            <button
              type="button"
              onClick={() =>
                setDraft({
                  ...draft,
                  names: [...draft.names, DEFAULT_NAMES[draft.names.length]],
                })
              }
              className="rounded-md border border-dashed border-slate-400 px-3 py-2 text-sm dark:border-slate-600"
            >
              + Add player
            </button>
          )}
        </div>
      </Field>

      <button
        type="button"
        onClick={start}
        className="mt-2 rounded-lg bg-red-600 px-4 py-3 text-center font-semibold text-white shadow hover:bg-red-500"
      >
        Start match
      </button>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-2">
      <span className="text-sm font-semibold opacity-70">{label}</span>
      {children}
    </label>
  );
}

function ChoiceRow({
  value,
  options,
  onChange,
}: {
  value: string;
  options: readonly [string, string][];
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map(([v, label]) => (
        <button
          key={v}
          type="button"
          onClick={() => onChange(v)}
          className={
            'rounded-md border px-3 py-2 text-sm ' +
            (v === value
              ? 'border-red-600 bg-red-600 text-white'
              : 'border-slate-300 bg-white dark:border-slate-700 dark:bg-slate-900')
          }
        >
          {label}
        </button>
      ))}
    </div>
  );
}
