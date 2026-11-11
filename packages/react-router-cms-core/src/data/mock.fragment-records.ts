import type { CmsFragmentRecord } from '../types/cms-records';

const BASE_RECORD: CmsFragmentRecord = {
  created_at: '2026-01-01T00:00:00.000Z',
  is_deleted: false,
  is_system: false,
  name: '',
  properties: {},
  schema_uuid: 'schema-1',
  typename: 'Heading',
  updated_at: '2026-01-01T00:00:00.000Z',
  uuid: 'child-0',
};

/**
 * @description Three stored child fragments; the second has no name. Specs only — not
 * exported from the package.
 */
export const MOCK_FRAGMENT_RECORDS: readonly CmsFragmentRecord[] = [
  { ...BASE_RECORD, name: 'Intro heading', uuid: 'child-1' },
  { ...BASE_RECORD, typename: 'Card', uuid: 'child-2' },
  {
    ...BASE_RECORD,
    name: 'Signup button',
    typename: 'Button',
    uuid: 'child-3',
  },
];
