import type { CmsLibraryRowFragment } from '~/__generated__/graphql';
import { getLibraryHref } from '~/global/utils/getLibraryHref';

/**
 * @description The library detail URL for a row of the libraries table.
 */
export const getLibraryRowHref = (row: CmsLibraryRowFragment): string => {
  return getLibraryHref(row.uuid);
};
