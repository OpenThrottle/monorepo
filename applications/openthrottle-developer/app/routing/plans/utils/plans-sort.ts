import type { PlansSortBy, PlansSortOrder } from '~/routing/plans/config/types';
import { PLANS_SORT_ORDER } from '~/routing/plans/config/types';

const PLANS_SORT_BY_VALUES: readonly PlansSortBy[] = [
  'createdAt',
  'name',
  'updatedAt',
];

export const isPlansSortBy = (value: string): value is PlansSortBy =>
  PLANS_SORT_BY_VALUES.some((candidate) => candidate === value);

export const isPlansSortOrder = (value: string): value is PlansSortOrder =>
  PLANS_SORT_ORDER.some((candidate) => candidate === value);
