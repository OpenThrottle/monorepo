/**
 * @description Who owns a reorder group's list. `controlled`: the caller holds `items` and must
 * apply each new order from `onReorder`. `uncontrolled`: the group holds its own copy, seeded from
 * `defaultItems`, and `onReorder` only observes.
 * @public
 */
export type CmsReorderListSource<TItem> =
  CmsReorderListControlled<TItem> | CmsReorderListUncontrolled<TItem>;

/**
 * @public
 */
export interface CmsReorderListControlled<TItem> {
  readonly items: readonly TItem[];
  readonly kind: 'controlled';
  readonly onReorder: (items: readonly TItem[]) => void;
}

/**
 * @public
 */
export interface CmsReorderListUncontrolled<TItem> {
  readonly defaultItems: readonly TItem[];
  readonly kind: 'uncontrolled';
  readonly onReorder: ((items: readonly TItem[]) => void) | undefined;
}
