import { Card, cn } from '@openthrottle/react-router-shadcn';
import * as React from 'react';

import { useReorderItem } from '../hooks';
import { ReorderHandle } from './ReorderHandle';

/**
 * @public
 */
export interface ReorderItemProps {
  readonly children: React.ReactNode;
  readonly className: string | undefined;
  readonly id: string;
  readonly index: number;
  readonly onMove: (dragIndex: number, hoverIndex: number) => void;
}

/**
 * @description One draggable row of a {@link ReorderGroup}: a card with a grab handle and the
 * caller's content. Needs a `DndProvider` above it.
 * @public
 */
export const ReorderItem = (props: ReorderItemProps): React.ReactElement => {
  const { children, className, id, index, onMove } = props;

  // Hooks
  const { handleRef, handlerId, isDragging, rowRef } = useReorderItem({
    id,
    index,
    onMove,
  });

  // Setup

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <Card
      className={cn(
        'flex-row items-center gap-3 px-3 py-3 transition-opacity',
        isDragging && 'opacity-40',
        className,
      )}
      data-dragging={isDragging}
      data-handler-id={handlerId ?? undefined}
      ref={rowRef}
      role="listitem"
    >
      <ReorderHandle className={undefined} handleRef={handleRef} />
      <div className="min-w-0 flex-1">{children}</div>
    </Card>
  );
};
