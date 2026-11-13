import type {
  CmsFragmentRowFragment,
  CmsLayoutFragmentNodeFragment,
  CmsLayoutRowFragment,
  CmsLibraryComponentRowFragment,
  CmsLibraryRowFragment,
  CmsSchemaRowFragment,
} from '~/__generated__/graphql';
import { GLOBAL_TABLE_COLUMN_KIND } from '~/global/data/data.global-table';
import type { GlobalTableColumn } from '~/global/types/global-table';

/**
 * @description `GlobalTable` columns for the components index (`/components`).
 */
export const CMS_COMPONENT_COLUMNS: readonly GlobalTableColumn<CmsLibraryComponentRowFragment>[] =
  [
    { header: 'Name', key: 'name', kind: GLOBAL_TABLE_COLUMN_KIND.TEXT },
    {
      header: 'Typename',
      key: 'typename',
      kind: GLOBAL_TABLE_COLUMN_KIND.CODE,
    },
    { header: 'Status', key: 'status', kind: GLOBAL_TABLE_COLUMN_KIND.BADGE },
    {
      header: 'Library',
      key: 'libraryUuid',
      kind: GLOBAL_TABLE_COLUMN_KIND.CODE,
    },
  ];

/**
 * @description `GlobalTable` columns for a library's components on its detail page (no Library column).
 */
export const CMS_LIBRARY_COMPONENT_COLUMNS: readonly GlobalTableColumn<CmsLibraryComponentRowFragment>[] =
  [
    { header: 'Name', key: 'name', kind: GLOBAL_TABLE_COLUMN_KIND.TEXT },
    {
      header: 'Typename',
      key: 'typename',
      kind: GLOBAL_TABLE_COLUMN_KIND.CODE,
    },
    { header: 'Status', key: 'status', kind: GLOBAL_TABLE_COLUMN_KIND.BADGE },
  ];

/**
 * @description `GlobalTable` columns for the fragments index (`/fragments`).
 */
export const CMS_FRAGMENT_COLUMNS: readonly GlobalTableColumn<CmsFragmentRowFragment>[] =
  [
    { header: 'Name', key: 'name', kind: GLOBAL_TABLE_COLUMN_KIND.TEXT },
    {
      header: 'Typename',
      key: 'typename',
      kind: GLOBAL_TABLE_COLUMN_KIND.CODE,
    },
    {
      header: 'System',
      key: 'isSystem',
      kind: GLOBAL_TABLE_COLUMN_KIND.BOOLEAN,
    },
    {
      header: 'Created',
      key: 'createdAt',
      kind: GLOBAL_TABLE_COLUMN_KIND.DATE,
    },
    {
      header: 'Updated',
      key: 'updatedAt',
      kind: GLOBAL_TABLE_COLUMN_KIND.DATE,
    },
  ];

/**
 * @description `GlobalTable` columns for a layout's fragment tree on its detail page.
 */
export const CMS_LAYOUT_FRAGMENT_COLUMNS: readonly GlobalTableColumn<CmsLayoutFragmentNodeFragment>[] =
  [
    { header: 'Name', key: 'name', kind: GLOBAL_TABLE_COLUMN_KIND.TEXT },
    {
      header: 'Typename',
      key: 'typename',
      kind: GLOBAL_TABLE_COLUMN_KIND.CODE,
    },
    { header: 'Depth', key: 'depth', kind: GLOBAL_TABLE_COLUMN_KIND.TEXT },
  ];

/**
 * @description `GlobalTable` columns for the layouts index (`/layouts`).
 */
export const CMS_LAYOUT_COLUMNS: readonly GlobalTableColumn<CmsLayoutRowFragment>[] =
  [
    { header: 'Name', key: 'name', kind: GLOBAL_TABLE_COLUMN_KIND.TEXT },
    { header: 'Slug', key: 'slug', kind: GLOBAL_TABLE_COLUMN_KIND.CODE },
    { header: 'Status', key: 'status', kind: GLOBAL_TABLE_COLUMN_KIND.BADGE },
    { header: 'Tags', key: 'tags', kind: GLOBAL_TABLE_COLUMN_KIND.LIST },
    {
      header: 'Created',
      key: 'createdAt',
      kind: GLOBAL_TABLE_COLUMN_KIND.DATE,
    },
    {
      header: 'Updated',
      key: 'updatedAt',
      kind: GLOBAL_TABLE_COLUMN_KIND.DATE,
    },
  ];

/**
 * @description `GlobalTable` columns for the libraries index (`/libraries`).
 */
export const CMS_LIBRARY_COLUMNS: readonly GlobalTableColumn<CmsLibraryRowFragment>[] =
  [
    { header: 'Name', key: 'name', kind: GLOBAL_TABLE_COLUMN_KIND.TEXT },
    {
      header: 'Description',
      key: 'description',
      kind: GLOBAL_TABLE_COLUMN_KIND.TEXT,
    },
    { header: 'Status', key: 'status', kind: GLOBAL_TABLE_COLUMN_KIND.BADGE },
    {
      header: 'Updated',
      key: 'updatedAt',
      kind: GLOBAL_TABLE_COLUMN_KIND.DATE,
    },
  ];

/**
 * @description `GlobalTable` columns for the schemas index (`/schemas`).
 */
export const CMS_SCHEMA_COLUMNS: readonly GlobalTableColumn<CmsSchemaRowFragment>[] =
  [
    {
      header: 'Typename',
      key: 'typename',
      kind: GLOBAL_TABLE_COLUMN_KIND.CODE,
    },
    { header: 'Version', key: 'version', kind: GLOBAL_TABLE_COLUMN_KIND.CODE },
    { header: 'Status', key: 'status', kind: GLOBAL_TABLE_COLUMN_KIND.BADGE },
    {
      header: 'Created',
      key: 'createdAt',
      kind: GLOBAL_TABLE_COLUMN_KIND.DATE,
    },
    {
      header: 'Updated',
      key: 'updatedAt',
      kind: GLOBAL_TABLE_COLUMN_KIND.DATE,
    },
  ];
