import { cn } from '@openthrottle/react-router-shadcn';
import * as React from 'react';

import { usePerElementPointerDown } from '../hooks/usePerElementPointerDown';
import { usePointerDrag } from '../hooks/usePointerDrag';
import { type UseViewportResult } from '../hooks/useViewport';
import { type FloorLayout } from '../types';
import { floorBounds, sortElementsByLayer } from '../utils/elements';
import {
  type Point,
  clampPointToRect,
  snapPointToGrid,
} from '../utils/geometry';
import { FloorElementView } from './FloorElementView';
import { FloorGrid } from './FloorGrid';

/**
 * Props for {@link FloorCanvas}.
 *
 * @public
 */
export interface FloorCanvasProps {
  /** Optional overlay drawn above elements (e.g. selection handles). */
  readonly children?: React.ReactNode;
  /** Class applied to the root `<svg>`. */
  readonly className?: string;
  /** The layout to render (floor size, grid, elements). */
  readonly layout: FloorLayout;
  /** Pointer-down on empty canvas (drives deselect). */
  readonly onBackgroundPointerDown?: (event: React.PointerEvent) => void;
  /** Live element move — fires every frame during a drag (no commit). */
  readonly onElementDrag?: (id: string, center: Point) => void;
  /** Committed element move — fires once on pointerup if the element moved. */
  readonly onElementDragEnd?: (id: string, center: Point) => void;
  /** Pointer-down on an element (drives selection); fires before move starts. */
  readonly onElementPointerDown?: (
    id: string,
    event: React.PointerEvent,
  ) => void;
  /** The currently selected element id, if any. */
  readonly selectedId?: string | null;
  /** Whether moves snap to the grid (default true). */
  readonly snapEnabled?: boolean;
  /** Viewport controller (owns the viewBox + pan/zoom). */
  readonly viewport: UseViewportResult;
}

interface ActiveMove {
  grabOffset: Point;
  id: string;
  moved: boolean;
}

/**
 * @description The interactive SVG floor surface. Renders the grid + every
 * element in z-order layers (zones < walls < tables/stools, so zones sit behind
 * and never steal pointer hits), wires pan/zoom from `useViewport`, and moves
 * elements via a single `usePointerDrag` gesture that tracks the grabbed
 * element by id. Moves snap to the grid and soft-clamp the element center
 * inside the floor (no collision detection — elements may overlap). Holds no
 * element state: drags are reported up via callbacks so the parent stays the
 * single source of truth.
 *
 * @public
 */
export const FloorCanvas = (props: FloorCanvasProps): React.ReactElement => {
  const {
    children,
    className,
    layout,
    onBackgroundPointerDown,
    onElementDrag,
    onElementDragEnd,
    onElementPointerDown,
    selectedId,
    snapEnabled = true,
    viewport,
  } = props;

  // Hooks
  const active = React.useRef<ActiveMove | null>(null);

  // Setup
  const bounds = React.useMemo(() => floorBounds(layout), [layout]);
  const ordered = React.useMemo(
    () => sortElementsByLayer(layout.elements),
    [layout.elements],
  );

  const resolveCenter = React.useCallback(
    (rawWorld: Point, grabOffset: Point): Point => {
      const raw = {
        x: rawWorld.x + grabOffset.x,
        y: rawWorld.y + grabOffset.y,
      };
      const snapped = snapEnabled ? snapPointToGrid(raw, layout.gridSize) : raw;
      return clampPointToRect(snapped, bounds);
    },
    [bounds, layout.gridSize, snapEnabled],
  );

  const move = usePointerDrag({
    clientToWorld: viewport.clientToWorld,
    onEnd: (context) => {
      const current = active.current;
      active.current = null;
      if (!current || !current.moved) return;

      onElementDragEnd?.(
        current.id,
        resolveCenter(context.rawWorld, current.grabOffset),
      );
    },
    onMove: (context) => {
      const current = active.current;
      if (!current) return;

      current.moved = true;
      onElementDrag?.(
        current.id,
        resolveCenter(context.rawWorld, current.grabOffset),
      );
    },
  });

  // Handlers
  const handleElementPointerDown = React.useCallback(
    (id: string, event: React.PointerEvent): void => {
      onElementPointerDown?.(id, event);
      const element = layout.elements.find((candidate) => candidate.id === id);
      if (!element) return;

      const start = viewport.clientToWorld({
        x: event.clientX,
        y: event.clientY,
      });

      active.current = {
        grabOffset: { x: element.x - start.x, y: element.y - start.y },
        id,
        moved: false,
      };

      move.start(event);
    },
    [layout.elements, move, onElementPointerDown, viewport],
  );

  // Per-element pointer-down closures, cached by id so each `FloorElementView`
  // receives a referentially stable `onPointerDown` (see the hook's docs).
  const { getPointerDown } = usePerElementPointerDown({
    handler: handleElementPointerDown,
  });

  const handleBackgroundPointerDown = React.useCallback(
    (event: React.PointerEvent): void => {
      onBackgroundPointerDown?.(event);
      viewport.panHandlers.onPointerDown(event);
    },
    [onBackgroundPointerDown, viewport.panHandlers],
  );

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <svg
      className={cn('h-full w-full touch-none select-none', className)}
      onPointerDown={handleBackgroundPointerDown}
      onPointerMove={viewport.panHandlers.onPointerMove}
      onPointerUp={viewport.panHandlers.onPointerUp}
      onWheel={viewport.onWheel}
      ref={viewport.svgRef}
      viewBox={viewport.viewBoxString}
    >
      <FloorGrid
        gridSize={layout.gridSize}
        height={layout.height}
        width={layout.width}
      />
      {ordered.map((element) => (
        <FloorElementView
          element={element}
          isSelected={element.id === selectedId}
          key={element.id}
          onPointerDown={getPointerDown(element.id)}
        />
      ))}
      {children}
    </svg>
  );
};
