import type {
  SORT_ORDER_DIRECTION,
  SORT_ORDER_EDGE,
  SORT_ORDER_SIDE,
} from './sort-order.constants.ts';

/**
 * @description Where a gapped order lives: an integer `orderColumn` on `table`, unique per
 * `scopeColumn` among live rows (`liveCondition`), with `tiebreakColumn` deciding between equal
 * values when the scope is renumbered. Every name is a trusted SQL identifier declared next to
 * the repository, never user input. `liveCondition` is a raw SQL predicate on the table's own
 * columns, e.g. `deleted_at IS NULL`.
 * @public
 */
export interface SortOrderScope {
  readonly gap: number;
  readonly idColumn: string;
  readonly liveCondition: string;
  readonly orderColumn: string;
  readonly scopeColumn: string;
  readonly table: string;
  readonly tiebreakColumn: string;
}

/**
 * @description `UP` (earlier) or `DOWN` (later).
 * @public
 */
export type SortOrderDirection =
  (typeof SORT_ORDER_DIRECTION)[keyof typeof SORT_ORDER_DIRECTION];

/**
 * @description `before` or `after` an anchor row.
 * @public
 */
export type SortOrderSide =
  (typeof SORT_ORDER_SIDE)[keyof typeof SORT_ORDER_SIDE];

/**
 * @description `start` (lowest value) or `end` (highest value) of a scope.
 * @public
 */
export type SortOrderEdge =
  (typeof SORT_ORDER_EDGE)[keyof typeof SORT_ORDER_EDGE];

/**
 * @description One row's new sort value.
 * @public
 */
export interface SortOrderAssignment {
  readonly id: string;
  readonly sortOrder: number;
}

/**
 * @description Outcome of `rebalanceScope`.
 * @public
 */
export interface SortOrderRebalanced {
  readonly kind: 'rebalanced';
  readonly rowCount: number;
}

/**
 * @description A free sort value beside the anchor.
 * @public
 */
export interface SortOrderSlot {
  readonly kind: 'slot';
  readonly sortOrder: number;
}

/**
 * @description The anchor row is not a live row of the scope.
 * @public
 */
export interface SortOrderAnchorNotFound {
  readonly kind: 'anchor-not-found';
}

/**
 * @description No integer was free beside the anchor even after a rebalance (only possible
 * with a gap of 1).
 * @public
 */
export interface SortOrderNoRoom {
  readonly kind: 'no-room';
}

/**
 * @description Outcome of `insertBeside`.
 * @public
 */
export type SortOrderInsertResult =
  SortOrderAnchorNotFound | SortOrderNoRoom | SortOrderSlot;

/**
 * @description The listed ids now occupy, in list order, the values they held before.
 * @public
 */
export interface SortOrderReordered {
  readonly assignments: readonly SortOrderAssignment[];
  readonly kind: 'reordered';
}

/**
 * @description The id list repeats an id.
 * @public
 */
export interface SortOrderDuplicateIds {
  readonly duplicateIds: readonly string[];
  readonly kind: 'duplicate-ids';
}

/**
 * @description Some listed ids are not live rows of the scope.
 * @public
 */
export interface SortOrderIdsNotInScope {
  readonly kind: 'ids-not-in-scope';
  readonly missingIds: readonly string[];
}

/**
 * @description Outcome of `reorderInScope`.
 * @public
 */
export type SortOrderReorderResult =
  SortOrderDuplicateIds | SortOrderIdsNotInScope | SortOrderReordered;

/**
 * @description The row swapped values with its neighbour.
 * @public
 */
export interface SortOrderMoved {
  readonly kind: 'moved';
  readonly neighbourId: string;
  readonly scopeId: string;
}

/**
 * @description The row is already first (`UP`) or last (`DOWN`) in its scope.
 * @public
 */
export interface SortOrderAtEdge {
  readonly kind: 'at-edge';
  readonly scopeId: string;
}

/**
 * @description No live row has that id.
 * @public
 */
export interface SortOrderRowNotFound {
  readonly kind: 'not-found';
}

/**
 * @description The row exists but its scope column is null, so it has no order.
 * @public
 */
export interface SortOrderRowNotInScope {
  readonly kind: 'not-in-scope';
}

/**
 * @description Outcome of `moveInScope`.
 * @public
 */
export type SortOrderMoveResult =
  | SortOrderAtEdge
  | SortOrderMoved
  | SortOrderRowNotFound
  | SortOrderRowNotInScope;
