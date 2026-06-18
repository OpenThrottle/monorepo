/**
 * useFloorLayout — immutable layout state with add/move/update/remove mutators.
 * A thin `useState` wrapper over the pure layout operations; no history (see
 * {@link useFloorLayoutHistory} for undo/redo).
 */

import {
  type Dispatch,
  type SetStateAction,
  useCallback,
  useState,
} from 'react';

import { type FloorElement, type FloorLayout } from '../types';
import { type Point } from '../utils/geometry';
import {
  type ElementPatch,
  addElement,
  moveElement,
  removeElement,
  updateElement,
} from '../utils/layout-operations';

/**
 * The layout controller returned by {@link useFloorLayout}.
 *
 * @publicApi
 */
export interface UseFloorLayoutResult {
  /** Append an element. */
  readonly addElement: (element: FloorElement) => void;
  /** The current layout. */
  readonly layout: FloorLayout;
  /** Move an element's center. */
  readonly moveElement: (id: string, center: Point) => void;
  /** Remove an element. */
  readonly removeElement: (id: string) => void;
  /** Replace the whole layout. */
  readonly setLayout: Dispatch<SetStateAction<FloorLayout>>;
  /** Patch an element's editable fields. */
  readonly updateElement: (id: string, patch: ElementPatch) => void;
}

/**
 * Manage a single floor layout with immutable mutators.
 *
 * @publicApi
 */
export function useFloorLayout(initial: FloorLayout): UseFloorLayoutResult {
  const [layout, setLayout] = useState<FloorLayout>(initial);

  return {
    addElement: useCallback(
      (element) => setLayout((current) => addElement(current, element)),
      [],
    ),
    layout,
    moveElement: useCallback(
      (id, center) => setLayout((current) => moveElement(current, id, center)),
      [],
    ),
    removeElement: useCallback(
      (id) => setLayout((current) => removeElement(current, id)),
      [],
    ),
    setLayout,
    updateElement: useCallback(
      (id, patch) => setLayout((current) => updateElement(current, id, patch)),
      [],
    ),
  };
}
