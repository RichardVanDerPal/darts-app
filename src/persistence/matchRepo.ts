// IndexedDB-backed persistence for the current match and finished matches.
// Uses idb-keyval so we don't pull a full ORM for a couple of documents.
import { get, set, del, values } from 'idb-keyval';
import type { AnyMatchState } from '../engine/halveIt';

const CURRENT_KEY = 'current-match';
const HISTORY_KEY_PREFIX = 'history-match:';

export async function saveCurrent(state: AnyMatchState | null): Promise<void> {
  if (state === null) {
    await del(CURRENT_KEY);
    return;
  }
  await set(CURRENT_KEY, state);
}

export async function loadCurrent(): Promise<AnyMatchState | null> {
  const v = await get<AnyMatchState | undefined>(CURRENT_KEY);
  return v ? normalize(v) : null;
}

export async function archiveMatch(state: AnyMatchState): Promise<void> {
  await set(`${HISTORY_KEY_PREFIX}${state.createdAt}`, state);
  await del(CURRENT_KEY);
}

export async function listHistory(): Promise<AnyMatchState[]> {
  const all = (await values()) as unknown[];
  const matches: AnyMatchState[] = [];
  for (const v of all) {
    if (isMatchState(v) && v.status === 'FINISHED') matches.push(normalize(v));
  }
  return matches.sort((a, b) => b.updatedAt - a.updatedAt);
}

export async function clearHistory(): Promise<void> {
  // idb-keyval doesn't offer a prefix delete; we walk the store.
  const all = (await values()) as unknown[];
  for (const v of all) {
    if (isMatchState(v) && v.status === 'FINISHED') {
      await del(`${HISTORY_KEY_PREFIX}${v.createdAt}`);
    }
  }
}

/** Back-fill the discriminator on any legacy 501/301 state persisted before the union existed. */
function normalize(state: AnyMatchState): AnyMatchState {
  if ((state as { kind?: string }).kind === 'halve-it') return state;
  // Countdown match — ensure config.kind is set.
  const cfg = state.config as { kind?: 'countdown' };
  if (cfg.kind === 'countdown') return state;
  return {
    ...state,
    config: { ...state.config, kind: 'countdown' },
  } as AnyMatchState;
}

function isMatchState(v: unknown): v is AnyMatchState {
  if (typeof v !== 'object' || v === null) return false;
  if (!('players' in v) || !('status' in v)) return false;
  // Countdown has `legs`; halve-it has `rounds`.
  return 'legs' in v || 'rounds' in v;
}
