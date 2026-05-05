import {
  SORT_BY_VALUES,
  SORT_ORDER_VALUES,
  SortBy,
  SortOrder,
  View,
  VIEW_VALUES,
} from '~/routing/projects/config';

export function isSortBy(v: string): v is SortBy {
  return SORT_BY_VALUES.includes(v as SortBy);
}

export function isSortOrder(v: string): v is SortOrder {
  return SORT_ORDER_VALUES.includes(v as SortOrder);
}

export function isView(v: string): v is View {
  return VIEW_VALUES.includes(v as View);
}
