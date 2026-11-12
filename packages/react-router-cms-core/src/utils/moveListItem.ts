/**
 * @public
 */
export interface MoveListItemOptions<TItem> {
  readonly fromIndex: number;
  readonly list: readonly TItem[];
  readonly toIndex: number;
}

/**
 * @description Returns a copy of `list` with the item at `fromIndex` moved to `toIndex`. The
 * input is returned unchanged when the indices match or either is out of range.
 * @public
 */
export const moveListItem = <TItem>(
  options: MoveListItemOptions<TItem>,
): readonly TItem[] => {
  const { fromIndex, list, toIndex } = options;
  const isInRange = (index: number): boolean => {
    return Number.isInteger(index) && index >= 0 && index < list.length;
  };

  if (fromIndex === toIndex || !isInRange(fromIndex) || !isInRange(toIndex)) {
    return list;
  }

  const item = list[fromIndex];
  if (item === undefined) {
    return list;
  }

  const rest = list.filter((_, index) => index !== fromIndex);

  return [...rest.slice(0, toIndex), item, ...rest.slice(toIndex)];
};
