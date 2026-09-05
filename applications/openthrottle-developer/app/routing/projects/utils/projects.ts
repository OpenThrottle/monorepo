import type { SortBy, SortOrder, View } from '~/routing/projects/config';
import {
  SORT_BY_VALUES,
  SORT_ORDER_VALUES,
  VIEW_VALUES,
} from '~/routing/projects/config';

export function isSortBy(v: string): v is SortBy {
  return SORT_BY_VALUES.some((value) => value === v);
}

export function isSortOrder(v: string): v is SortOrder {
  return SORT_ORDER_VALUES.some((value) => value === v);
}

export function isView(v: string): v is View {
  return VIEW_VALUES.some((value) => value === v);
}
