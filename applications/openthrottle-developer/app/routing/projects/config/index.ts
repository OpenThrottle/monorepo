import {
  ProjectsSortBy,
  ProjectsSortOrder,
} from '~/routing/prompts/config/types';

export const SORT_BY_OPTIONS = [
  { label: 'Name', value: 'name' },
  { label: 'Created', value: 'createdAt' },
  { label: 'Updated', value: 'updatedAt' },
] as const;

export const SORT_ORDER_OPTIONS = [
  { label: 'Ascending', value: 'asc' },
  { label: 'Descending', value: 'desc' },
] as const;

export const PROJECTS_SORT_OPTIONS: readonly {
  readonly label: string;
  readonly value: `${ProjectsSortBy}-${ProjectsSortOrder}`;
}[] = [
  { label: 'Newest first', value: 'createdAt-desc' },
  { label: 'Oldest first', value: 'createdAt-asc' },
  { label: 'Recently updated', value: 'updatedAt-desc' },
  { label: 'Least recently updated', value: 'updatedAt-asc' },
  { label: 'Name A-Z', value: 'name-asc' },
  { label: 'Name Z-A', value: 'name-desc' },
];
