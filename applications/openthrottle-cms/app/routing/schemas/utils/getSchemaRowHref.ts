import type { CmsSchemaRowFragment } from '~/__generated__/graphql';

/**
 * @description The schema detail URL for a row of the schemas table.
 */
export const getSchemaRowHref = (row: CmsSchemaRowFragment): string => {
  return `/schemas/${row.uuid}`;
};
