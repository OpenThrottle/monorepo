import type { CmsLibraryComponentRowFragment } from '~/__generated__/graphql';

/**
 * @description The component detail URL for a row of the components table.
 */
export const getComponentRowHref = (
  row: CmsLibraryComponentRowFragment,
): string => {
  return `/components/${row.uuid}`;
};
