// Zustand store: the single source of truth for the running match.
// Wraps the engine and layers on undo + auto-persistence.
import { create } from 'zustand';
import { createMatch, submitVisit, submitVisitTotal } from '../engine/match';
import {
  createHalveItMatch,
  isHalveItMatch,
  submitHalveItVisit,
  type AnyMatchState,
  type HalveItConfig,
} from '../engine/halveIt';
import type {
  Dart,
  MatchConfig,
  Player,
} from '../engine/types';
import type { VisitTotalOptions } from '../engine/engine';
import { archiveMatch, loadCurrent, saveCurrent } from '../persistence/matchRepo';

const UNDO_LIMIT = 20;

interface MatchStore {
  match: AnyMatchState | null;
  undoStack: AnyMatchState[];
  hydrated: boolean;

  hydrate: () => Promise<void>;
  startMatch: (config: MatchConfig, players: Player[]) => void;
  startHalveItMatch: (config: HalveItConfig, players: Player[]) => void;
  submitVisit: (darts: Dart[]) => void;
  submitVisitTotal: (opts: VisitTotalOptions) => void;
  submitHalveItVisit: (darts: Dart[]) => void;
  undo: () => void;
  abandon: () => Promise<void>;
  archiveIfFinished: () => Promise<void>;
}

let saveTimer: ReturnType<typeof setTimeout> | null = null;
function scheduleSave(state: AnyMatchState | null) {
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    void saveCurrent(state);
  }, 200);
}

export const useMatchStore = create<MatchStore>((set, get) => ({
  match: null,
  undoStack: [],
  hydrated: false,

  hydrate: async () => {
    const loaded = await loadCurrent();
    set({ match: loaded, hydrated: true, undoStack: [] });
  },

  startMatch: (config, players) => {
    const match = createMatch(config, players);
    set({ match, undoStack: [] });
    scheduleSave(match);
  },

  startHalveItMatch: (config, players) => {
    const match = createHalveItMatch(config, players);
    set({ match, undoStack: [] });
    scheduleSave(match);
  },

  submitVisit: (darts) => {
    const { match, undoStack } = get();
    if (!match) throw new Error('No active match');
    if (isHalveItMatch(match)) {
      throw new Error('submitVisit is countdown-only; use submitHalveItVisit');
    }
    const next = submitVisit(match, darts);
    const newStack = [...undoStack, match].slice(-UNDO_LIMIT);
    set({ match: next, undoStack: newStack });
    scheduleSave(next);
  },

  submitVisitTotal: (opts) => {
    const { match, undoStack } = get();
    if (!match) throw new Error('No active match');
    if (isHalveItMatch(match)) {
      throw new Error('submitVisitTotal is countdown-only');
    }
    const next = submitVisitTotal(match, opts);
    const newStack = [...undoStack, match].slice(-UNDO_LIMIT);
    set({ match: next, undoStack: newStack });
    scheduleSave(next);
  },

  submitHalveItVisit: (darts) => {
    const { match, undoStack } = get();
    if (!match) throw new Error('No active match');
    if (!isHalveItMatch(match)) {
      throw new Error('submitHalveItVisit requires a Halve It match');
    }
    const next = submitHalveItVisit(match, darts);
    const newStack = [...undoStack, match].slice(-UNDO_LIMIT);
    set({ match: next, undoStack: newStack });
    scheduleSave(next);
  },

  undo: () => {
    const { undoStack } = get();
    if (undoStack.length === 0) return;
    const prev = undoStack[undoStack.length - 1];
    set({
      match: prev,
      undoStack: undoStack.slice(0, -1),
    });
    scheduleSave(prev);
  },

  abandon: async () => {
    set({ match: null, undoStack: [] });
    await saveCurrent(null);
  },

  archiveIfFinished: async () => {
    const { match } = get();
    if (match && match.status === 'FINISHED') {
      await archiveMatch(match);
    }
  },
}));
