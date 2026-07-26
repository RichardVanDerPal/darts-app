// IndexedDB-backed persistence for the current match and finished matches.
// Uses idb-keyval so we don't pull a full ORM for a couple of documents.
import { get, set, del, values } from 'idb-keyval';
import type { MatchState } from '../engine/types';

const CURRENT_KEY = 'current-match';
const HISTORY_KEY_PREFIX = 'history-match:';

export async function saveCurrent(state: MatchState | null): Promise<void> {
  if (state === null) {
    await del(CURRENT_KEY);
    return;
  }
  await set(CURRENT_KEY, state);
}

export async function loadCurrent(): Promise<MatchState | null> {
  const v = await get<MatchState | undefined>(CURRENT_KEY);
  return v ?? null;
}

export async function archiveMatch(state: MatchState): Promise<void> {
  await set(`${HISTORY_KEY_PREFIX}${state.createdAt}`, state);
  await del(CURRENT_KEY);
}

export async function listHistory(): Promise<MatchState[]> {
  const all = (await values()) as unknown[];
  const matches: MatchState[] = [];
  for (const v of all) {
    if (isMatchState(v) && v.status === 'FINISHED') matches.push(v);
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

function isMatchState(v: unknown): v is MatchState {
  return (
    typeof v === 'object' &&
    v !== null &&
    'players' in v &&
    'legs' in v &&
    'status' in v
  );
}
