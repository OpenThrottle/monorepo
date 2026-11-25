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

export type FragmentIntentKey = keyof typeof FRAGMENT_INTENT;
/**
 * @public
 */
export type FragmentIntentValue = (typeof FRAGMENT_INTENT)[FragmentIntentKey];
