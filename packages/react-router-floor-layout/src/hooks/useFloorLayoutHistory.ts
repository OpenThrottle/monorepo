/**
 * useFloorLayoutHistory — snapshot-based undo/redo for a whole layout. The
 * immutable model makes full-layout snapshots cheap at restaurant element
 * counts. `commit` pushes the prior state and clears the redo stack; `reset`
 * swaps in an external value without history (used to sync a controlled value).
 * Live drag does NOT go through here — the editor keeps a transient overlay so
 * dragging never floods the undo stack.
 */

import { useCallback, useRef, useState } from 'react';

import { type FloorLayout } from '../types';

interface HistoryState {
  readonly future: readonly FloorLayout[];
  readonly past: readonly FloorLayout[];
  readonly present: FloorLayout;
}

/**
 * The history controller returned by {@link useFloorLayoutHistory}.
 *
 * @public
 */
export interface UseFloorLayoutHistoryResult {
  /** Whether a redo is available. */
  readonly canRedo: boolean;
  /** Whether an undo is available. */
  readonly canUndo: boolean;
  /** Commit a new layout (pushes the prior onto the undo stack). */
  readonly commit: (next: FloorLayout) => void;
  /** The current layout. */
  readonly layout: FloorLayout;
  /** Redo; returns the restored layout, or null if nothing to redo. */
  readonly redo: () => FloorLayout | null;
  /** Replace the layout and clear history (e.g. external value sync). */
  readonly reset: (next: FloorLayout) => void;
  /** Undo; returns the restored layout, or null if nothing to undo. */
  readonly undo: () => FloorLayout | null;
}

/**
 * Manage undo/redo history for a layout.
 *
 * @public
 */
export function useFloorLayoutHistory(
  initial: FloorLayout,
): UseFloorLayoutHistoryResult {
  const [state, setState] = useState<HistoryState>({
    future: [],
    past: [],
    present: initial,
  });
  // Mirror for synchronous reads in the imperative callbacks.
  const stateRef = useRef(state);
  stateRef.current = state;

  const commit = useCallback((next: FloorLayout) => {
    const current = stateRef.current;
    setState({
      future: [],
      past: [...current.past, current.present],
      present: next,
    });
  }, []);

  const reset = useCallback((next: FloorLayout) => {
    setState({ future: [], past: [], present: next });
  }, []);

  const undo = useCallback((): FloorLayout | null => {
    const current = stateRef.current;
    const previous = current.past.at(-1);
    if (previous === undefined) return null;
    setState({
      future: [current.present, ...current.future],
      past: current.past.slice(0, -1),
      present: previous,
    });
    return previous;
  }, []);

  const redo = useCallback((): FloorLayout | null => {
    const current = stateRef.current;
    const next = current.future.at(0);
    if (next === undefined) return null;
    setState({
      future: current.future.slice(1),
      past: [...current.past, current.present],
      present: next,
    });
    return next;
  }, []);

  return {
    canRedo: state.future.length > 0,
    canUndo: state.past.length > 0,
    commit,
    layout: state.present,
    redo,
    reset,
    undo,
  };
}
