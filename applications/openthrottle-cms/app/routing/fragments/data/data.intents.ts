/**
 * @description The `intent` values the fragment route's action accepts.
 */
export const FRAGMENT_INTENT = {
  ADD_CHILD: 'addChild',
  CREATE_CHILD: 'createChild',
  REMOVE_CHILD: 'removeChild',
  REORDER_CHILDREN: 'reorderChildren',
  UPDATE: 'updateFragment',
} as const;

/**
 * @public
 */
export type FragmentIntent =
  (typeof FRAGMENT_INTENT)[keyof typeof FRAGMENT_INTENT];
