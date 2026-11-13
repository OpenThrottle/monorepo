import type {
  CmsLayoutFragmentNodeFragment,
  CmsLayoutRowFragment,
} from '~/__generated__/graphql';

/**
 * @description The layout detail URL for a row of the layouts table.
 */
export const getLayoutRowHref = (row: CmsLayoutRowFragment): string => {
  return `/layouts/${row.uuid}`;
};

/**
 * @description The fragment detail URL for a node of a layout's fragment tree.
 */
export const getLayoutFragmentRowHref = (
  row: CmsLayoutFragmentNodeFragment,
): string => {
  return `/fragments/${row.uuid}`;
};

/**
 * @description A tree node's row id. Keyed by `key`, not `uuid`, because a shared fragment can
 * appear more than once in one tree.
 */
export const getLayoutFragmentRowId = (
  row: CmsLayoutFragmentNodeFragment,
): string => {
  return row.key;
};
