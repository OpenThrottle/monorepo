/**
 * useSelectionKeyboard — pragmatic keyboard editing for the selected element.
 *
 * Delete/Backspace deletes, arrow keys nudge by one grid step (Shift = a larger
 * jump), `[`/`]` rotate, Escape deselects. Guards against firing while the user
 * is typing in an input/textarea/select or contentEditable element. Undo/redo
 * are intentionally NOT handled here — the editor/history layer owns those.
 */

import { useEffect } from 'react';

/**
 * Configuration for {@link useSelectionKeyboard}.
 *
 * @public
 */
export interface UseSelectionKeyboardOptions {
  /** Disable all handling (e.g. when nothing is selected). Default true. */
  readonly enabled?: boolean;
  /** Base nudge distance in inches (one grid step). */
  readonly gridSize: number;
  /** Delete the selection. */
  readonly onDelete: () => void;
  /** Clear the selection (Escape). */
  readonly onDeselect: () => void;
  /** Nudge the selection by a world delta (inches). */
  readonly onNudge: (dx: number, dy: number) => void;
  /** Rotate the selection by a delta in degrees. */
  readonly onRotate: (deltaDegrees: number) => void;
  /** Degrees per `[`/`]` press (default 15). */
  readonly rotateStep?: number;
  /** Multiplier applied to the nudge when Shift is held (default 4). */
  readonly shiftMultiplier?: number;
}

function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  return (
    target.isContentEditable ||
    tag === 'INPUT' ||
    tag === 'SELECT' ||
    tag === 'TEXTAREA'
  );
}

/**
 * Attach window keydown handling for the current selection.
 *
 * @public
 */
export function useSelectionKeyboard(
  options: UseSelectionKeyboardOptions,
): void {
  const {
    enabled = true,
    gridSize,
    onDelete,
    onDeselect,
    onNudge,
    onRotate,
    rotateStep = 15,
    shiftMultiplier = 4,
  } = options;

  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (event: KeyboardEvent): void => {
      // Escape works even from inputs (blur-and-deselect affordance).
      if (event.key === 'Escape') {
        onDeselect();
        return;
      }
      if (isEditableTarget(event.target)) return;

      const step = gridSize * (event.shiftKey ? shiftMultiplier : 1);

      switch (event.key) {
        case 'ArrowDown':
          event.preventDefault();
          onNudge(0, step);
          return;
        case 'ArrowLeft':
          event.preventDefault();
          onNudge(-step, 0);
          return;
        case 'ArrowRight':
          event.preventDefault();
          onNudge(step, 0);
          return;
        case 'ArrowUp':
          event.preventDefault();
          onNudge(0, -step);
          return;
        case 'Backspace':
        case 'Delete':
          event.preventDefault();
          onDelete();
          return;
        case '[':
          event.preventDefault();
          onRotate(-rotateStep);
          return;
        case ']':
          event.preventDefault();
          onRotate(rotateStep);
          return;
        default:
          return;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    enabled,
    gridSize,
    onDelete,
    onDeselect,
    onNudge,
    onRotate,
    rotateStep,
    shiftMultiplier,
  ]);
}
