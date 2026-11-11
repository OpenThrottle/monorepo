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
  readonly renderItem: (item: TItem, index: number) => React.ReactNode;
  readonly source: CmsReorderListSource<TItem>;
}

/**
 * @description A vertical list whose rows reorder by dragging their handles. Controlled or
 * uncontrolled per `source`. Needs a `DndProvider` (HTML5 backend) above it.
 * @public
 */
export const ReorderGroup = <TItem,>(
  props: ReorderGroupProps<TItem>,
): React.ReactElement => {
  const { className, getItemId, renderItem, source } = props;

  // Hooks
  const { items, moveItem } = useReorderList({ source });

  // Setup

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <div className={cn('flex flex-col gap-2', className)} role="list">
      {items.map((item, index) => (
        <ReorderItem
          className={undefined}
          id={getItemId(item)}
          index={index}
          key={getItemId(item)}
          onMove={moveItem}
        >
          {renderItem(item, index)}
        </ReorderItem>
      ))}
    </div>
  );
};
