import * as React from 'react';

import type { CmsReorderListSource } from '../types/cms-reorder-list';
import { moveListItem } from '../utils/moveListItem';

/**
 * @public
 */
export interface UseReorderListOptions<TItem> {
  readonly source: CmsReorderListSource<TItem>;
}

/**
 * @public
 */
export interface UseReorderListResult<TItem> {
  readonly items: readonly TItem[];
  readonly moveItem: (dragIndex: number, hoverIndex: number) => void;
}

/**
 * @description List state for a drag-to-reorder group, controlled or uncontrolled per
 * {@link CmsReorderListSource}.
 * @public
 */
export const useReorderList = <TItem,>(
  options: UseReorderListOptions<TItem>,
): UseReorderListResult<TItem> => {
  const { source } = options;

  // Hooks
  // Seeded once; ignored while controlled.
  const [ownItems, setOwnItems] = React.useState<readonly TItem[]>(
    source.kind === 'uncontrolled' ? source.defaultItems : [],
  );

  // Setup
  const items = source.kind === 'controlled' ? source.items : ownItems;

  // Handlers
  const moveItem = React.useCallback(
    (dragIndex: number, hoverIndex: number): void => {
      const next = moveListItem({
        fromIndex: dragIndex,
        list: items,
        toIndex: hoverIndex,
      });

      if (next === items) {
        return;
      }

      if (source.kind === 'uncontrolled') {
        setOwnItems(next);
      }

      source.onReorder?.(next);
    },
    [items, source],
  );

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return { items, moveItem };
};
