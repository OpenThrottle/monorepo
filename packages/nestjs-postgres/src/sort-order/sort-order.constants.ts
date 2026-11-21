/**
 * @description Stride between neighbouring sort values (1000, 2000, …), leaving integer room
 * to insert between two rows without renumbering the scope.
 * @public
 */
export const SORT_ORDER_GAP = 1000;

/**
 * @description Which neighbour {@link moveInScope} swaps with: `UP` is the earlier row (lower
 * sort value), `DOWN` the later one.
 * @public
 */
export const SORT_ORDER_DIRECTION = {
  DOWN: 'DOWN',
  UP: 'UP',
} as const;

/**
 * @description Which side of an anchor row {@link insertBeside} places a new row.
 * @public
 */
export const SORT_ORDER_SIDE = {
  AFTER: 'after',
  BEFORE: 'before',
} as const;

/**
 * @description Which end of a scope `edgeSortOrder` reads.
 * @public
 */
export const SORT_ORDER_EDGE = {
  END: 'end',
  START: 'start',
} as const;
