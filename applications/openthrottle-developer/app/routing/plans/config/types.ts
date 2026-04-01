export type PlansSortBy = 'createdAt' | 'name' | 'updatedAt';
export const PLANS_SORT_BY: readonly PlansSortBy[] = [
  'createdAt',
  'name',
  'updatedAt',
];

export const PLANS_SORT_BY_OPTIONS: readonly {
  readonly label: string;
  readonly value: `${PlansSortBy}-${PlansSortOrder}`;
}[] = [
  { label: 'Newest first', value: 'createdAt-desc' },
  { label: 'Oldest first', value: 'createdAt-asc' },
  { label: 'Recently updated', value: 'updatedAt-desc' },
  { label: 'Least recently updated', value: 'updatedAt-asc' },
  { label: 'Name A-Z', value: 'name-asc' },
  { label: 'Name Z-A', value: 'name-desc' },
];

export type PlansSortOrder = 'asc' | 'desc';
export const PLANS_SORT_ORDER: readonly PlansSortOrder[] = ['asc', 'desc'];
