import { cn } from '@openthrottle/react-router-shadcn';
import * as React from 'react';

import { useReorderList } from '../hooks/useReorderList';
import type { CmsReorderListSource } from '../types/cms-reorder-list';
import { ReorderItem } from './ReorderItem';

/**
 * @public
 */
export interface ReorderGroupProps<TItem> {
  readonly className: string | undefined;
  readonly getItemId: (item: TItem) => string;
  /**
   * Called once per finished drag with the order it left, where `source.onReorder` fires on every
   * hover swap. Persist the order here to save once per drop.
   */
  readonly onDrop: ((items: readonly TItem[]) => void) | undefined;
  readonly renderItem: (item: TItem, index: number) => React.ReactNode;
  readonly source: CmsReorderListSource<TItem>;
}

/**
 * @description A vertical list whose rows reorder by dragging their handles. Controlled or
 * uncontrolled per `source`; `onDrop` reports each finished drag once. Needs a `DndProvider` (HTML5
 * backend) above it.
 * @public
 */
export const ReorderGroup = <TItem,>(
  props: ReorderGroupProps<TItem>,
): React.ReactElement => {
  const { className, getItemId, onDrop, renderItem, source } = props;

  // Hooks
  const { items, moveItem } = useReorderList({ source });
  // The drag-end callback can be a render behind the last swap; the ref always has the latest order.
  const latestItems = React.useRef(items);

  // Setup

  // Handlers
  const onItemDrop = (): void => {
    onDrop?.(latestItems.current);
  };

  // Markup

  // Life Cycle
  React.useLayoutEffect(() => {
    latestItems.current = items;
  }, [items]);

  // 🔌 Short Circuit

  return (
    <div className={cn('flex flex-col gap-2', className)} role="list">
      {items.map((item, index) => (
        <ReorderItem
          className={undefined}
          id={getItemId(item)}
          index={index}
          key={getItemId(item)}
          onDrop={onDrop ? onItemDrop : undefined}
          onMove={moveItem}
        >
          {renderItem(item, index)}
        </ReorderItem>
      ))}
    </div>
  );
};
