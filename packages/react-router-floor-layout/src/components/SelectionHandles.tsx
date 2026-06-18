import { type ReactElement } from 'react';

import { usePointerDrag } from '../hooks/usePointerDrag';
import { type UseViewportResult } from '../hooks/useViewport';
import { type FloorElement } from '../types';
import {
  type Point,
  angleBetween,
  rotatePoint,
  snapValueToGrid,
} from '../utils/geometry';

const MIN_SIZE = 6;
const ROTATE_SNAP_DEGREES = 15;

/**
 * A patch produced by dragging a handle.
 *
 * @publicApi
 */
export type SelectionTransform = Partial<{
  readonly height: number;
  readonly rotation: number;
  readonly width: number;
}>;

/**
 * Props for {@link SelectionHandles}.
 *
 * @publicApi
 */
export interface SelectionHandlesProps {
  /** The selected element to decorate. */
  readonly element: FloorElement;
  /** Grid step (inches) for snapping size + rotation when enabled. */
  readonly gridSize: number;
  /** Live (`move`) + committed (`commit`) resize/rotate patches. */
  readonly onTransform: (
    patch: SelectionTransform,
    phase: 'commit' | 'move',
  ) => void;
  /** Whether resize snaps to the grid + rotation snaps to 15° (default true). */
  readonly snapEnabled?: boolean;
  /** Viewport controller (for client→world + zoom-aware handle sizing). */
  readonly viewport: UseViewportResult;
}

/**
 * @description SVG overlay for the single selected element: a dashed bounding
 * box, a bottom-right resize handle, and a rotate handle on a stalk above the
 * top edge. Both handles drive live, snapping-aware transforms via
 * `usePointerDrag`; resize works in the element's local (un-rotated) frame so it
 * stays intuitive at any rotation. Handles are sized in world units scaled to
 * the current zoom so they stay roughly screen-constant.
 *
 * @publicApi
 */
export function SelectionHandles(props: SelectionHandlesProps): ReactElement {
  const {
    element,
    gridSize,
    onTransform,
    snapEnabled = true,
    viewport,
  } = props;

  // Hooks

  // Setup

  const { height, rotation, width, x, y } = element;
  const halfW = width / 2;
  const halfH = height / 2;
  const handle = Math.max(6, viewport.viewBox.width * 0.014);
  const stalk = handle * 2;

  const computeSize = (pointer: Point): SelectionTransform => {
    const local = rotatePoint(
      { x: pointer.x - x, y: pointer.y - y },
      -rotation,
    );
    const rawW = Math.abs(local.x) * 2;
    const rawH = Math.abs(local.y) * 2;
    const snappedW = snapEnabled ? snapValueToGrid(rawW, gridSize) : rawW;
    const snappedH = snapEnabled ? snapValueToGrid(rawH, gridSize) : rawH;
    return {
      height: Math.max(MIN_SIZE, snappedH),
      width: Math.max(MIN_SIZE, snappedW),
    };
  };

  const computeRotation = (pointer: Point): SelectionTransform => {
    const raw = angleBetween({ x, y }, pointer) + 90;
    const normalized = ((raw % 360) + 360) % 360;
    return {
      rotation: snapEnabled
        ? snapValueToGrid(normalized, ROTATE_SNAP_DEGREES)
        : normalized,
    };
  };

  const resize = usePointerDrag({
    clientToWorld: viewport.clientToWorld,
    onEnd: (context) => onTransform(computeSize(context.rawWorld), 'commit'),
    onMove: (context) => onTransform(computeSize(context.rawWorld), 'move'),
  });

  const rotate = usePointerDrag({
    clientToWorld: viewport.clientToWorld,
    onEnd: (context) =>
      onTransform(computeRotation(context.rawWorld), 'commit'),
    onMove: (context) => onTransform(computeRotation(context.rawWorld), 'move'),
  });

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <g transform={`rotate(${rotation} ${x} ${y})`}>
      <rect
        className="stroke-primary fill-none"
        height={height}
        pointerEvents="none"
        strokeDasharray="4 3"
        strokeWidth={1.5}
        vectorEffect="non-scaling-stroke"
        width={width}
        x={x - halfW}
        y={y - halfH}
      />
      <line
        className="stroke-primary"
        pointerEvents="none"
        strokeWidth={1.5}
        vectorEffect="non-scaling-stroke"
        x1={x}
        x2={x}
        y1={y - halfH}
        y2={y - halfH - stalk}
      />
      <circle
        aria-label="Rotate"
        className="fill-background stroke-primary"
        cx={x}
        cy={y - halfH - stalk}
        onPointerDown={rotate.start}
        r={handle / 1.5}
        role="button"
        strokeWidth={1.5}
        style={{ cursor: 'grab' }}
        vectorEffect="non-scaling-stroke"
      />
      <rect
        aria-label="Resize"
        className="fill-background stroke-primary"
        height={handle}
        onPointerDown={resize.start}
        role="button"
        strokeWidth={1.5}
        style={{ cursor: 'nwse-resize' }}
        vectorEffect="non-scaling-stroke"
        width={handle}
        x={x + halfW - handle / 2}
        y={y + halfH - handle / 2}
      />
    </g>
  );
}
