import { Button, cn } from '@openthrottle/react-router-shadcn';
import * as React from 'react';

import { PALETTE_ITEMS, type PaletteItem } from '../data/elements';
import { usePointerDrag } from '../hooks/usePointerDrag';
import { type FloorElementType } from '../types';
import { type Point, type Rect } from '../utils/geometry';

/**
 * Props for {@link ElementPalette}.
 *
 * @public
 */
export interface ElementPaletteProps {
  /** Floor bounds (inches) to clamp the create point into. */
  readonly bounds?: Rect;
  /** Class applied to the palette root. */
  readonly className?: string;
  /** Map a client (screen) point to world inches (from `useViewport`). */
  readonly clientToWorld: (client: Point) => Point;
  /** Grid spacing for snapping the create point (default 12). */
  readonly gridSize?: number;
  /** Placeable items (defaults to the full element catalog). */
  readonly items?: readonly PaletteItem[];
  /** Commit: a new element of `type` should be created centered at `center`. */
  readonly onCreateCommit: (type: FloorElementType, center: Point) => void;
  /** Live preview of the proto-element following the pointer; `null` clears it. */
  readonly onCreatePreview?: (
    type: FloorElementType | null,
    center: Point | null,
  ) => void;
  /** Whether the create point snaps to the grid (default true). */
  readonly snapEnabled?: boolean;
}

/**
 * @description The element catalog as shadcn DOM buttons (outside the SVG).
 * Pressing a palette item starts a `usePointerDrag` "create" gesture: as the
 * pointer moves over the canvas it reports a live proto-element center via
 * `onCreatePreview` (the editor draws the ghost), and on pointerup it commits a
 * new element at the snapped, in-bounds drop point via `onCreateCommit`.
 *
 * @public
 */
export const ElementPalette = (
  props: ElementPaletteProps,
): React.ReactElement => {
  const {
    bounds,
    className,
    clientToWorld,
    gridSize = 12,
    items = PALETTE_ITEMS,
    onCreateCommit,
    onCreatePreview,
    snapEnabled = true,
  } = props;

  // Hooks
  const activeType = React.useRef<FloorElementType | null>(null);
  const create = usePointerDrag({
    bounds,
    clientToWorld,
    onEnd: (context) => {
      const type = activeType.current;
      activeType.current = null;
      onCreatePreview?.(null, null);
      if (type) onCreateCommit(type, context.world);
    },
    onMove: (context) => {
      const type = activeType.current;
      if (type) onCreatePreview?.(type, context.world);
    },
    snapGrid: snapEnabled ? gridSize : 0,
  });

  // Setup

  // Handlers
  const handleItemPointerDown = (
    type: FloorElementType,
    event: React.PointerEvent,
  ): void => {
    activeType.current = type;
    create.start(event);
  };

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <div
      aria-label="Floor elements"
      className={cn('flex flex-wrap gap-2', className)}
      role="toolbar"
    >
      {items.map((item) => (
        <Button
          className="cursor-grab touch-none"
          key={item.type}
          onPointerDown={(event) => handleItemPointerDown(item.type, event)}
          type="button"
          variant="outline"
        >
          {item.label}
        </Button>
      ))}
    </div>
  );
};
