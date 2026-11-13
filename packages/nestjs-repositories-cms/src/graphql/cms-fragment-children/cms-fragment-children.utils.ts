import { CMS_FRAGMENT_TREE_MAX_DEPTH } from '../cms-fragment-tree/cms-fragment-tree.constants.ts';

/**
 * @description Why adding a parent → child edge is refused, or `null` when it is allowed.
 *
 * - `parentDepth`: the longest chain of ancestors above the parent (0 for a root).
 * - `childHeight`: the longest chain of descendants below the child (0 for a leaf).
 * - `childReachesParent`: the parent is the child or one of its descendants, so the edge would
 *   close a cycle.
 */
export function getCmsChildEdgeRefusal(options: {
  readonly childHeight: number;
  readonly childReachesParent: boolean;
  readonly parentDepth: number;
}): string | null {
  const { childHeight, childReachesParent, parentDepth } = options;

  if (childReachesParent) {
    return `would make a fragment its own descendant`;
  }

  const deepest = parentDepth + 1 + childHeight;

  if (deepest > CMS_FRAGMENT_TREE_MAX_DEPTH) {
    return `would put a fragment at depth ${deepest}, past the limit of ${CMS_FRAGMENT_TREE_MAX_DEPTH}`;
  }

  return null;
}

/**
 * @description Why a reorder is refused, or `null` when `requested` is exactly the parent's
 * current children (same members, each once) in a new order.
 */
export function getCmsReorderRefusal(
  current: readonly string[],
  requested: readonly string[],
): string | null {
  const currentSet = new Set(current);
  const requestedSet = new Set(requested);

  if (requestedSet.size !== requested.length) {
    return `lists a child more than once`;
  }

  const missing = current.filter((uuid) => !requestedSet.has(uuid));
  const extra = requested.filter((uuid) => !currentSet.has(uuid));

  if (missing.length > 0 || extra.length > 0) {
    return `must list exactly the current children (missing: ${missing.join(', ') || 'none'}; not children: ${extra.join(', ') || 'none'})`;
  }

  return null;
}
