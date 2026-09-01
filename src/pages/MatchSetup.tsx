import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMatchStore } from '../store/matchStore';
import { halveItTargets, type HalveItConfig } from '../engine/halveIt';
import type { MatchConfig, Player, Variant } from '../engine/types';

type GameKind = 'countdown' | 'halve-it';

interface Draft {
  gameKind: GameKind;
  // Countdown fields
  variant: Variant;
  bestOfLegs: number;
  doubleIn: boolean;
  inputMode: MatchConfig['inputMode'];
  // Halve It fields
  rounds: number;
  includeBullRound: boolean;
  // Shared
  names: string[];
}

const DEFAULT_NAMES = ['Player 1', 'Player 2', 'Player 3', 'Player 4'];

export function MatchSetupPage() {
  const navigate = useNavigate();
  const startMatch = useMatchStore((s) => s.startMatch);
  const startHalveItMatch = useMatchStore((s) => s.startHalveItMatch);

  const [draft, setDraft] = useState<Draft>({
    gameKind: 'countdown',
    variant: '501',
    bestOfLegs: 3,
    doubleIn: false,
    inputMode: 'per-dart',
    rounds: 9,
    includeBullRound: false,
    names: [DEFAULT_NAMES[0], DEFAULT_NAMES[1]],
  });

  const canAddPlayer = draft.names.length < 4;
  const canRemovePlayer = draft.names.length > 2;
  const halveItRoundsValid =
    Number.isInteger(draft.rounds) && draft.rounds >= 1 && draft.rounds <= 20;
  const canStart = draft.gameKind === 'countdown' || halveItRoundsValid;

  const start = () => {
    const players: Player[] = draft.names.map((n, i) => ({
      id: `p${i}`,
      name: n.trim() || DEFAULT_NAMES[i],
    }));
    if (draft.gameKind === 'countdown') {
      const config: MatchConfig = {
        kind: 'countdown',
        variant: draft.variant,
        bestOfLegs: draft.bestOfLegs,
        doubleIn: draft.doubleIn,
        inputMode: draft.inputMode,
      };
      startMatch(config, players);
    } else {
      const config: HalveItConfig = {
        kind: 'halve-it',
        rounds: draft.rounds,
        includeBullRound: draft.includeBullRound,
      };
      startHalveItMatch(config, players);
    }
    navigate('/game');
  };

  return (
    <div className="flex flex-col gap-6 py-4">
      <h1 className="text-xl font-semibold">New match</h1>

      <Field label="Game">
        <ChoiceRow
          value={draft.gameKind}
          options={[
            ['countdown', 'Countdown (501 / 301)'],
            ['halve-it', 'Halve It'],
          ]}
          onChange={(v) => setDraft({ ...draft, gameKind: v as GameKind })}
        />
      </Field>

      {draft.gameKind === 'countdown' ? (
        <CountdownFields draft={draft} setDraft={setDraft} />
      ) : (
        <HalveItFields draft={draft} setDraft={setDraft} />
      )}

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
        disabled={!canStart}
        className="mt-2 rounded-lg bg-red-600 px-4 py-3 text-center font-semibold text-white shadow hover:bg-red-500 disabled:cursor-not-allowed disabled:opacity-50"
      >
        Start match
      </button>
    </div>
  );
}

function CountdownFields({
  draft,
  setDraft,
}: {
  draft: Draft;
  setDraft: (d: Draft) => void;
}) {
  return (
    <>
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
    </>
  );
}

function HalveItFields({
  draft,
  setDraft,
}: {
  draft: Draft;
  setDraft: (d: Draft) => void;
}) {
  const roundsValid =
    Number.isInteger(draft.rounds) && draft.rounds >= 1 && draft.rounds <= 20;
  const targets = roundsValid
    ? halveItTargets({
        kind: 'halve-it',
        rounds: draft.rounds,
        includeBullRound: draft.includeBullRound,
      })
    : [];
  const sequence = targets
    .map((t) => (t.kind === 'bull' ? 'Bull' : String(t.segment)))
    .join(' → ');

  return (
    <>
      <Field label="Rounds (1–20)">
        <input
          type="number"
          inputMode="numeric"
          min={1}
          max={20}
          step={1}
          value={draft.rounds}
          onChange={(e) => {
            const raw = e.target.value;
            const parsed = raw === '' ? NaN : Number(raw);
            setDraft({ ...draft, rounds: Number.isNaN(parsed) ? 0 : parsed });
          }}
          className="w-24 rounded-md border border-slate-300 bg-white px-3 py-2 text-base tabular-nums dark:border-slate-700 dark:bg-slate-900"
          aria-label="Number of rounds"
        />
        <div className="mt-1 break-words text-xs opacity-70 tabular-nums">
          {roundsValid ? sequence : 'Enter a number between 1 and 20'}
        </div>
      </Field>

      <Field label="Include Bull round (extra final round)">
        <ChoiceRow
          value={draft.includeBullRound ? 'on' : 'off'}
          options={[
            ['off', 'Off'],
            ['on', 'On'],
          ]}
          onChange={(v) => setDraft({ ...draft, includeBullRound: v === 'on' })}
        />
      </Field>
    </>
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
