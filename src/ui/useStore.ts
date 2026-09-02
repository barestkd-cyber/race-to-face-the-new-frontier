import { useSyncExternalStore } from 'react';
import { store } from '../state/store';
import type { GameState } from '../engine/types';

/**
 * The store mutates a large GameState in place and bumps a version counter, so
 * the snapshot React compares is that counter rather than the state object.
 * Components read `store.state` fresh on every render.
 */
export function useVersion(): number {
  return useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot);
}

/** The live game state, or null on the title/character-generation screens. */
export function useGame(): GameState | null {
  useVersion();
  return store.state;
}

/** Narrowed accessor for screens that only render with a live run. */
export function useGameRequired(): GameState {
  const state = useGame();
  if (!state) throw new Error('This screen requires an active run');
  return state;
}

export function useDraft() {
  useVersion();
  return store.draft;
}

export function useToasts() {
  useVersion();
  return store.toasts;
}

export function useSaves() {
  useVersion();
  return store.saves;
}

export { store };
