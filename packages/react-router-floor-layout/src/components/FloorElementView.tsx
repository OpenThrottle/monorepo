import { cn } from '@openthrottle/react-router-shadcn';
import * as React from 'react';

import { type FloorElement, FloorElementType } from '../types';
import { describeFloorElement } from '../utils/elements';
import { seatPositions } from '../utils/seats';

/**
 * Props for {@link FloorElementView}.
 *
 * @public
 */
export interface FloorElementViewProps {
  /** The element to render. */
  readonly element: FloorElement;
  /** Whether this element is the current single selection. */
  readonly isSelected?: boolean;
  /** Pointer-down on the element (drives selection + move drag). */
  readonly onPointerDown?: (event: React.PointerEvent) => void;
}

/**
 * @description SVG view of a single floor element. Renders the right primitive
 * per type (ellipse for round tables, rect for square/rectangle tables, walls
 * and stools, a translucent region for zones), rotated about its center, with a
 * centered label and best-effort a11y (`role`/`aria-label`/`<title>`). Seat
 * glyphs for tables are layered on in the element-shapes task. Stateless: all
 * interaction is reported via `onPointerDown`.
 */
const FloorElementViewImpl = (
  props: FloorElementViewProps,
): React.ReactElement => {
  const { element, isSelected = false, onPointerDown } = props;

  // Hooks

  // Setup
  const { height, label, rotation, type, width, x, y } = element;
  const elementSeats = 'seats' in element ? element.seats : undefined;
  // Keyed on the table geometry/seat-count that drive placement, so the pure
  // `seatPositions` walk only re-runs when one of them changes (not on every
  // unrelated parent render or live-drag frame).
  const seats = React.useMemo(
    () => ('seats' in element ? seatPositions(element) : []),
    [elementSeats, height, type, width, x, y],
  );
  const left = x - width / 2;
  const top = y - height / 2;
  const isZone = type === FloorElementType.ZONE;
  const isRound = type === FloorElementType.TABLE_ROUND;
  const isStool = type === FloorElementType.STOOL;

  const shapeClass = cn(
    'transition-[stroke,fill] [vector-effect:non-scaling-stroke]',
    isZone && 'fill-muted/30 stroke-muted-foreground/40 [stroke-dasharray:6_4]',
    !isZone &&
      type === FloorElementType.WALL &&
      'fill-foreground/80 stroke-foreground',
    !isZone &&
      type !== FloorElementType.WALL &&
      'fill-card stroke-foreground/60',
    isSelected && 'stroke-primary',
  );

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <g
      aria-label={describeFloorElement(element)}
      onPointerDown={onPointerDown}
      role="img"
      style={{ cursor: 'grab' }}
      transform={`rotate(${rotation} ${x} ${y})`}
    >
      <title>{describeFloorElement(element)}</title>
      {seats.map((seat, index) => (
        <circle
          className="fill-muted stroke-muted-foreground/50"
          cx={seat.x}
          cy={seat.y}
          // Positional + stable per render; coords can collide on degenerate
          // (near-zero-size) tables, so an index key avoids duplicate-key glitches.
          key={index}
          pointerEvents="none"
          r={7}
          strokeWidth={1}
          vectorEffect="non-scaling-stroke"
        />
      ))}
      {isRound || isStool ? (
        <ellipse
          className={shapeClass}
          cx={x}
          cy={y}
          rx={width / 2}
          ry={height / 2}
          strokeWidth={isSelected ? 3 : 2}
        />
      ) : (
        <rect
          className={shapeClass}
          height={height}
          rx={isZone ? 4 : 2}
          strokeWidth={isSelected ? 3 : 2}
          width={width}
          x={left}
          y={top}
        />
      )}
      {label ? (
        <text
          className="fill-foreground"
          dominantBaseline="middle"
          fontSize={12}
          pointerEvents="none"
          textAnchor="middle"
          x={x}
          y={isZone ? top + 14 : y}
        >
          {label}
        </text>
      ) : null}
    </g>
  );
};

/**
 * @description Memoized SVG view of a single floor element. Memoizing keeps the
 * O(n) per-pointermove cost of a live drag down to just the element(s) whose
 * props actually changed: during a move only the dragged element's geometry
 * changes, so the other 50–150 elements skip re-render entirely.
 *
 * @public
 */
export const FloorElementView = React.memo(FloorElementViewImpl);
