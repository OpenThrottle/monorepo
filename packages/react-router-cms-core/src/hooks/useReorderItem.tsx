import type { Identifier } from 'dnd-core';
import * as React from 'react';
import { useDrag, useDrop } from 'react-dnd';

import { CMS_REORDER_DRAG_TYPE } from '../data/data.reorder';
import { shouldReorderOnHover } from '../utils/shouldReorderOnHover';

/**
 * @public
 */
export interface UseReorderItemOptions {
  readonly id: string;
  readonly index: number;
  /** Called once when a drag of this row ends, dropped or not — after every `onMove` it caused. */
  readonly onDrop: (() => void) | undefined;
  readonly onMove: (dragIndex: number, hoverIndex: number) => void;
}

/**
 * @public
 */
export interface UseReorderItemResult {
  readonly handleRef: React.RefCallback<HTMLElement>;
  readonly handlerId: Identifier | null;
  readonly isDragging: boolean;
  readonly rowRef: React.RefCallback<HTMLElement>;
}

/**
 * @description Wires one row of a reorder group into react-dnd. Attach `rowRef` to the row (the
 * drop target and drag preview) and `handleRef` to its grab handle (the only drag source), so the
 * rest of the row stays clickable and selectable. `onMove` fires on every hover swap; `onDrop`
 * fires once when the drag ends, so a caller that persists the order saves once per drag. Needs a
 * `DndProvider` above it.
 * @public
 */
export const useReorderItem = (
  options: UseReorderItemOptions,
): UseReorderItemResult => {
  const { id, index, onDrop, onMove } = options;

  // Hooks
  const rowNode = React.useRef<HTMLElement | null>(null);

  const [{ handlerId }, drop] = useDrop<
    { id: string; index: number },
    void,
    { handlerId: Identifier | null }
  >({
    accept: CMS_REORDER_DRAG_TYPE,
    collect: (monitor) => ({ handlerId: monitor.getHandlerId() }),
    hover: (item, monitor) => {
      if (!rowNode.current) {
        return;
      }

      const isCrossing = shouldReorderOnHover({
        clientY: monitor.getClientOffset()?.y,
        dragIndex: item.index,
        hoverIndex: index,
        hoverRect: rowNode.current.getBoundingClientRect(),
      });

      if (!isCrossing) {
        return;
      }

      onMove(item.index, index);
      // react-dnd's documented pattern: keep the dragged item's index in step with where it now
      // sits, so the next hover compares against its new position rather than re-finding it.

      item.index = index;
    },
  });

  const [{ isDragging }, drag, preview] = useDrag({
    collect: (monitor) => ({ isDragging: monitor.isDragging() }),
    end: () => {
      onDrop?.();
    },
    item: () => ({ id, index }),
    type: CMS_REORDER_DRAG_TYPE,
  });

  // Setup
  // react-dnd connectors are ref-callback-shaped already; wrap them in real RefCallbacks rather
  // than casting past the typing gap.
  const rowRef: React.RefCallback<HTMLElement> = (node) => {
    rowNode.current = node;
    drop(node);
    preview(node);
  };

  const handleRef: React.RefCallback<HTMLElement> = (node) => {
    drag(node);
  };

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return { handleRef, handlerId, isDragging, rowRef };
};
