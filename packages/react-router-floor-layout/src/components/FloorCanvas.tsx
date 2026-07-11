import { cn } from '@openthrottle/react-router-shadcn';
import {
  type PointerEvent as ReactPointerEvent,
  type ReactElement,
  type ReactNode,
  useCallback,
  useMemo,
  useRef,
} from 'react';
import { usePointerDrag } from '../hooks/usePointerDrag';
import { type UseViewportResult } from '../hooks/useViewport';
import { type FloorLayout } from '../types';
import {
  type Point,
  clampPointToRect,
  snapPointToGrid,
} from '../utils/geometry';
import { floorBounds, sortElementsByLayer } from '../utils/elements';
import { FloorElementView } from './FloorElementView';
import { FloorGrid } from './FloorGrid';

/**
 * Props for {@link FloorCanvas}.
 *
 * @public
 */
export interface FloorCanvasProps {
  /** Optional overlay drawn above elements (e.g. selection handles). */
  readonly children?: ReactNode;
  /** Class applied to the root `<svg>`. */
  readonly className?: string;
  /** The layout to render (floor size, grid, elements). */
  readonly layout: FloorLayout;
  /** Pointer-down on empty canvas (drives deselect). */
  readonly onBackgroundPointerDown?: (event: ReactPointerEvent) => void;
  /** Live element move — fires every frame during a drag (no commit). */
  readonly onElementDrag?: (id: string, center: Point) => void;
  /** Committed element move — fires once on pointerup if the element moved. */
  readonly onElementDragEnd?: (id: string, center: Point) => void;
  /** Pointer-down on an element (drives selection); fires before move starts. */
  readonly onElementPointerDown?: (
    id: string,
    event: ReactPointerEvent,
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
export function FloorCanvas(props: FloorCanvasProps): ReactElement {
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
  const active = useRef<ActiveMove | null>(null);

  // Setup
  const bounds = useMemo(() => floorBounds(layout), [layout]);
  const ordered = useMemo(
    () => sortElementsByLayer(layout.elements),
    [layout.elements],
  );

  const resolveCenter = useCallback(
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
  const handleElementPointerDown = useCallback(
    (id: string, event: ReactPointerEvent): void => {
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
  // receives a referentially stable `onPointerDown`. Without this, a fresh
  // inline arrow per element per render would defeat `FloorElementView`'s
  // `React.memo` and re-render every element on every live-drag frame. The
  // cached closures read the latest handler through a ref, so they stay stable
  // even though `handleElementPointerDown` changes identity every frame (the
  // live `layout` is rebuilt during a drag).
  const handlerRef = useRef(handleElementPointerDown);
  handlerRef.current = handleElementPointerDown;
  const pointerDownCache = useRef(
    new Map<string, (event: ReactPointerEvent) => void>(),
  );
  const elementPointerDown = useCallback(
    (id: string): ((event: ReactPointerEvent) => void) => {
      const cache = pointerDownCache.current;
      const existing = cache.get(id);
      if (existing) return existing;
      const handler = (event: ReactPointerEvent): void =>
        handlerRef.current(id, event);
      cache.set(id, handler);
      return handler;
    },
    [],
  );

  const handleBackgroundPointerDown = useCallback(
    (event: ReactPointerEvent): void => {
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
          onPointerDown={elementPointerDown(element.id)}
        />
      ))}
      {children}
    </svg>
  );
}
