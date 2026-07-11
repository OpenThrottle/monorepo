import { Button, cn } from '@openthrottle/react-router-shadcn';
import { type ReactElement } from 'react';

/**
 * Props for {@link FloorToolbar}.
 *
 * @public
 */
export interface FloorToolbarProps {
  /** Whether redo is available. */
  readonly canRedo: boolean;
  /** Whether undo is available. */
  readonly canUndo: boolean;
  /** Class applied to the toolbar root. */
  readonly className?: string;
  /** Fit the whole floor to the viewport. */
  readonly onFit: () => void;
  /** Redo the last undone change. */
  readonly onRedo: () => void;
  /** Toggle grid snapping. */
  readonly onToggleSnap: () => void;
  /** Undo the last committed change. */
  readonly onUndo: () => void;
  /** Zoom in one step. */
  readonly onZoomIn: () => void;
  /** Zoom out one step. */
  readonly onZoomOut: () => void;
  /** Whether snapping is currently on. */
  readonly snapEnabled: boolean;
}

/**
 * @description Editor toolbar: zoom out / in / fit-to-screen (driven by
 * `useViewport`), undo / redo, and a grid-snap toggle. Plain shadcn buttons with
 * aria-labels.
 *
 * @public
 */
export function FloorToolbar(props: FloorToolbarProps): ReactElement {
  const {
    canRedo,
    canUndo,
    className,
    onFit,
    onRedo,
    onToggleSnap,
    onUndo,
    onZoomIn,
    onZoomOut,
    snapEnabled,
  } = props;

  // Hooks

  // Setup

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <div className={cn('flex flex-wrap items-center gap-2', className)}>
      <Button
        aria-label="Zoom out"
        onClick={onZoomOut}
        size="sm"
        variant="outline"
      >
        -
      </Button>
      <Button
        aria-label="Zoom in"
        onClick={onZoomIn}
        size="sm"
        variant="outline"
      >
        +
      </Button>
      <Button
        aria-label="Fit to screen"
        onClick={onFit}
        size="sm"
        variant="outline"
      >
        Fit
      </Button>
      <Button
        aria-label="Undo"
        disabled={!canUndo}
        onClick={onUndo}
        size="sm"
        variant="outline"
      >
        Undo
      </Button>
      <Button
        aria-label="Redo"
        disabled={!canRedo}
        onClick={onRedo}
        size="sm"
        variant="outline"
      >
        Redo
      </Button>
      <Button
        aria-label="Toggle grid snapping"
        aria-pressed={snapEnabled}
        onClick={onToggleSnap}
        size="sm"
        variant={snapEnabled ? 'default' : 'outline'}
      >
        Snap
      </Button>
    </div>
  );
}
