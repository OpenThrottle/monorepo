import type { FragmentChildPicker } from '~/routing/fragments/types/fragment-children';
import type { CmsFragmentEditorRecords } from '~/routing/fragments/utils/to-cms-records';

/**
 * @description A Heading fragment and its pinned schema, as the editor receives them. Specs only.
 */
export const MOCK_FRAGMENT_EDITOR_RECORDS: CmsFragmentEditorRecords = {
  children: [],
  draft: { copy: 'Hello', heading: 'h2' },
  fragment: {
    created_at: '2026-11-01T00:00:00.000Z',
    is_deleted: false,
    is_system: false,
    name: 'Hero heading',
    properties: { copy: 'Hello', heading: 'h2' },
    schema_uuid: 'schema-1',
    typename: 'Heading',
    updated_at: '2026-11-02T00:00:00.000Z',
    uuid: 'fragment-1',
  },
  hasChildren: false,
  previewChildren: [],
  schema: {
    created_at: '2026-11-01T00:00:00.000Z',
    is_deleted: false,
    json_schema: {
      properties: {
        copy: { type: 'string' },
        heading: { enum: ['h1', 'h2'], type: 'string' },
      },
      required: ['copy'],
      type: 'object',
    },
    status: 'ACTIVE',
    typename: 'Heading',
    updated_at: '2026-11-01T00:00:00.000Z',
    uuid: 'schema-1',
    version: 'abc',
  },
};

const CHILD = {
  ...MOCK_FRAGMENT_EDITOR_RECORDS.fragment,
  schema_uuid: 'schema-1',
};

/**
 * @description A LayoutGrid container with two children, as the editor receives it. Specs only.
 */
export const MOCK_CONTAINER_EDITOR_RECORDS: CmsFragmentEditorRecords = {
  children: [
    { ...CHILD, name: 'First child', uuid: 'child-1' },
    { ...CHILD, name: 'Second child', uuid: 'child-2' },
  ],
  draft: { className: 'grid' },
  fragment: {
    ...MOCK_FRAGMENT_EDITOR_RECORDS.fragment,
    name: 'Grid',
    properties: { className: 'grid' },
    schema_uuid: 'schema-grid',
    typename: 'LayoutGrid',
    uuid: 'grid-1',
  },
  hasChildren: true,
  previewChildren: [
    {
      children: [
        {
          children: [],
          properties: { copy: 'Nested' },
          typename: 'Heading',
          uuid: 'grandchild-1',
        },
      ],
      properties: { className: 'inner' },
      typename: 'LayoutGrid',
      uuid: 'child-1',
    },
    {
      children: [],
      properties: { copy: 'Hello', heading: 'h2' },
      typename: 'Heading',
      uuid: 'child-2',
    },
  ],
  schema: {
    ...MOCK_FRAGMENT_EDITOR_RECORDS.schema,
    json_schema: {
      properties: {
        children: { type: 'array', 'x-cms-widget': 'children' },
        className: { type: 'string', 'x-cms-widget': 'className' },
      },
      type: 'object',
    },
    typename: 'LayoutGrid',
    uuid: 'schema-grid',
  },
};

/**
 * @description A first page of child candidates with more to come. Specs only.
 */
export const MOCK_FRAGMENT_CHILD_PICKER: FragmentChildPicker = {
  candidates: [
    { name: 'Intro', typename: 'Heading', uuid: 'child-1' },
    { name: '', typename: 'Button', uuid: 'child-2' },
  ],
  hasNextPage: true,
  page: 0,
  typename: null,
  typenames: ['Button', 'Heading'],
};
