import { cn } from '@openthrottle/react-router-shadcn';
import {
  type PointerEvent as ReactPointerEvent,
  type ReactElement,
} from 'react';

import { type FloorElement, FloorElementType } from '../types';
import { seatPositions } from '../utils/seats';

/**
 * Props for {@link FloorElementView}.
 *
 * @publicApi
 */
export interface FloorElementViewProps {
  /** The element to render. */
  readonly element: FloorElement;
  /** Whether this element is the current single selection. */
  readonly isSelected?: boolean;
  /** Pointer-down on the element (drives selection + move drag). */
  readonly onPointerDown?: (event: ReactPointerEvent) => void;
}

function describe(element: FloorElement): string {
  const kind = element.type.replace(/-/g, ' ');
  return element.label ? `${kind}: ${element.label}` : kind;
}

/**
 * @description SVG view of a single floor element. Renders the right primitive
 * per type (ellipse for round tables, rect for square/rectangle tables, walls
 * and stools, a translucent region for zones), rotated about its center, with a
 * centered label and best-effort a11y (`role`/`aria-label`/`<title>`). Seat
 * glyphs for tables are layered on in the element-shapes task. Stateless: all
 * interaction is reported via `onPointerDown`.
 *
 * @publicApi
 */
export function FloorElementView(props: FloorElementViewProps): ReactElement {
  // const {} = props;

  // Hooks

  // Setup
  const { element, isSelected = false, onPointerDown } = props;
  const { height, label, rotation, type, width, x, y } = element;
  const left = x - width / 2;
  const top = y - height / 2;
  const isZone = type === FloorElementType.ZONE;
  const isRound = type === FloorElementType.TABLE_ROUND;
  const isStool = type === FloorElementType.STOOL;
  const seats = 'seats' in element ? seatPositions(element) : [];

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
      aria-label={describe(element)}
      onPointerDown={onPointerDown}
      role="img"
      style={{ cursor: 'grab' }}
      transform={`rotate(${rotation} ${x} ${y})`}
    >
      <title>{describe(element)}</title>
      {seats.map((seat) => (
        <circle
          className="fill-muted stroke-muted-foreground/50"
          cx={seat.x}
          cy={seat.y}
          key={`${seat.x}:${seat.y}`}
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
}
