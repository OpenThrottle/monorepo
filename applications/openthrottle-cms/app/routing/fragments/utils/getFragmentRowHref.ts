import type { CmsFragmentRowFragment } from '~/__generated__/graphql';

/**
 * @description The fragment detail URL for a row of the fragments table.
 */
export const getFragmentRowHref = (row: CmsFragmentRowFragment): string => {
  return `/fragments/${row.uuid}`;
};
