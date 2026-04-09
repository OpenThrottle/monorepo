import {
  PROJECTS_SORT_BY,
  PROJECTS_SORT_ORDER,
  ProjectsSortBy,
  ProjectsSortOrder,
} from '~/routing/prompts/config/types';

/**
 * @description Parses sortBy and sortOrder from URL search params;
 * defaults to createdAt-desc if not provided.
 */
export function parseProjectsSortFromSearchParams(
  searchParams: URLSearchParams,
): {
  sortBy: ProjectsSortBy;
  sortOrder: ProjectsSortOrder;
} {
  const by = searchParams.get('sortBy');
  const order = searchParams.get('sortOrder');

  return {
    sortBy: (PROJECTS_SORT_BY as readonly string[]).includes(by ?? '')
      ? (by as ProjectsSortBy)
      : 'createdAt',
    sortOrder: (PROJECTS_SORT_ORDER as readonly string[]).includes(order ?? '')
      ? (order as ProjectsSortOrder)
      : 'desc',
  };
}
