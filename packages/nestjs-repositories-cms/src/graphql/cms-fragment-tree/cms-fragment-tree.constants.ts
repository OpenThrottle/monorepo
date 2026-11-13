/**
 * @description Deepest level of a layout's fragment tree the server returns, counting the root
 * as depth 0. Nodes below it are cut, and recursion stops there, so a cycle that slipped past
 * the path guard still terminates.
 * @public
 */
export const CMS_FRAGMENT_TREE_MAX_DEPTH = 10;

/**
 * @description Most node occurrences one tree read returns. Fragments can be shared between
 * parents, so occurrences can outnumber fragments; past this the read fails rather than
 * returning a silently partial tree.
 * @public
 */
export const CMS_FRAGMENT_TREE_MAX_NODES = 1_000;
