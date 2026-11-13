import type {
  CmsComponentDetailFragment,
  CmsFragmentDetailFragment,
  CmsLayoutDetailFragment,
  CmsLibraryDetailFragment,
  CmsSchemaDetailFragment,
} from '~/__generated__/graphql';
import { GLOBAL_TABLE_COLUMN_KIND } from '~/global/data/data.global-table';
import type { GlobalDetailField } from '~/global/types/global-detail-list';

/**
 * @description `GlobalDetailList` fields for a component's detail page.
 */
export const CMS_COMPONENT_DETAIL_FIELDS: readonly GlobalDetailField<CmsComponentDetailFragment>[] =
  [
    { key: 'name', kind: GLOBAL_TABLE_COLUMN_KIND.TEXT, label: 'Name' },
    { key: 'typename', kind: GLOBAL_TABLE_COLUMN_KIND.CODE, label: 'Typename' },
    { key: 'status', kind: GLOBAL_TABLE_COLUMN_KIND.BADGE, label: 'Status' },
    { key: 'uuid', kind: GLOBAL_TABLE_COLUMN_KIND.CODE, label: 'UUID' },
  ];

/**
 * @description `GlobalDetailList` fields for a fragment's detail page.
 */
export const CMS_FRAGMENT_DETAIL_FIELDS: readonly GlobalDetailField<CmsFragmentDetailFragment>[] =
  [
    { key: 'name', kind: GLOBAL_TABLE_COLUMN_KIND.TEXT, label: 'Name' },
    { key: 'typename', kind: GLOBAL_TABLE_COLUMN_KIND.CODE, label: 'Typename' },
    {
      key: 'isSystem',
      kind: GLOBAL_TABLE_COLUMN_KIND.BOOLEAN,
      label: 'System',
    },
    {
      key: 'schemaUuid',
      kind: GLOBAL_TABLE_COLUMN_KIND.CODE,
      label: 'Schema',
    },
    { key: 'createdAt', kind: GLOBAL_TABLE_COLUMN_KIND.DATE, label: 'Created' },
    { key: 'updatedAt', kind: GLOBAL_TABLE_COLUMN_KIND.DATE, label: 'Updated' },
    { key: 'uuid', kind: GLOBAL_TABLE_COLUMN_KIND.CODE, label: 'UUID' },
  ];

/**
 * @description `GlobalDetailList` fields for a layout's detail page.
 */
export const CMS_LAYOUT_DETAIL_FIELDS: readonly GlobalDetailField<CmsLayoutDetailFragment>[] =
  [
    { key: 'name', kind: GLOBAL_TABLE_COLUMN_KIND.TEXT, label: 'Name' },
    { key: 'slug', kind: GLOBAL_TABLE_COLUMN_KIND.CODE, label: 'Slug' },
    { key: 'status', kind: GLOBAL_TABLE_COLUMN_KIND.BADGE, label: 'Status' },
    { key: 'tags', kind: GLOBAL_TABLE_COLUMN_KIND.LIST, label: 'Tags' },
    { key: 'createdAt', kind: GLOBAL_TABLE_COLUMN_KIND.DATE, label: 'Created' },
    { key: 'updatedAt', kind: GLOBAL_TABLE_COLUMN_KIND.DATE, label: 'Updated' },
    { key: 'uuid', kind: GLOBAL_TABLE_COLUMN_KIND.CODE, label: 'UUID' },
  ];

/**
 * @description `GlobalDetailList` fields for a library's detail page.
 */
export const CMS_LIBRARY_DETAIL_FIELDS: readonly GlobalDetailField<CmsLibraryDetailFragment>[] =
  [
    { key: 'name', kind: GLOBAL_TABLE_COLUMN_KIND.TEXT, label: 'Name' },
    {
      key: 'description',
      kind: GLOBAL_TABLE_COLUMN_KIND.TEXT,
      label: 'Description',
    },
    { key: 'status', kind: GLOBAL_TABLE_COLUMN_KIND.BADGE, label: 'Status' },
    { key: 'updatedAt', kind: GLOBAL_TABLE_COLUMN_KIND.DATE, label: 'Updated' },
    { key: 'uuid', kind: GLOBAL_TABLE_COLUMN_KIND.CODE, label: 'UUID' },
  ];

/**
 * @description `GlobalDetailList` fields for a schema's detail page.
 */
export const CMS_SCHEMA_DETAIL_FIELDS: readonly GlobalDetailField<CmsSchemaDetailFragment>[] =
  [
    { key: 'typename', kind: GLOBAL_TABLE_COLUMN_KIND.CODE, label: 'Typename' },
    { key: 'version', kind: GLOBAL_TABLE_COLUMN_KIND.CODE, label: 'Version' },
    { key: 'status', kind: GLOBAL_TABLE_COLUMN_KIND.BADGE, label: 'Status' },
    { key: 'createdAt', kind: GLOBAL_TABLE_COLUMN_KIND.DATE, label: 'Created' },
    { key: 'updatedAt', kind: GLOBAL_TABLE_COLUMN_KIND.DATE, label: 'Updated' },
    { key: 'uuid', kind: GLOBAL_TABLE_COLUMN_KIND.CODE, label: 'UUID' },
  ];
