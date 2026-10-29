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
  addElement,
  type ElementPatch,
  moveElement,
  removeElement,
  updateElement,
} from '../utils/layout-operations';

/**
 * The layout controller returned by {@link useFloorLayout}.
 *
 * @public
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
 * @public
 */
export function useFloorLayout(initial: FloorLayout): UseFloorLayoutResult {
  // Hooks
  const [layout, setLayout] = useState<FloorLayout>(initial);

  // Setup

  // Handlers
  const handleAddElement = useCallback(
    (element: FloorElement) =>
      setLayout((current) => addElement(current, element)),
    [],
  );
  const handleMoveElement = useCallback(
    (id: string, center: Point) =>
      setLayout((current) => moveElement(current, id, center)),
    [],
  );
  const handleRemoveElement = useCallback(
    (id: string) => setLayout((current) => removeElement(current, id)),
    [],
  );
  const handleUpdateElement = useCallback(
    (id: string, patch: ElementPatch) =>
      setLayout((current) => updateElement(current, id, patch)),
    [],
  );

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return {
    addElement: handleAddElement,
    layout,
    moveElement: handleMoveElement,
    removeElement: handleRemoveElement,
    setLayout,
    updateElement: handleUpdateElement,
  };
}
