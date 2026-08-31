export {
  buildPaginationPageItems,
  type BuildPaginationPageItemsOptions,
  type PaginationPageItem,
} from './pagination-page-items';

export interface ProjectsSearchParamsExtras {
  /** Plan list assignee filter. When set, multiple assignee params are appended. */
  readonly assignees?: readonly string[];
  /** Preserved on pagination for routes that use it (e.g. search `details=ranking`). */
  readonly details?: string;
  readonly search?: string;
  readonly sortBy?: string;
  readonly sortOrder?: string;
  /** Plan list single status (legacy). Prefer statuses for plans index. */
  readonly status?: string;
  /** Plan list multi-status filter. When set, multiple status params are appended. */
  readonly statuses?: readonly string[];
  readonly view?: 'table' | 'card';
}

/**
 * @description Builds projects index URL search params; preserves search/sort/view/status or statuses when provided so pagination links keep filters.
 */
export function buildProjectsSearchParams(
  page: number,
  limit: number,
  extras?: ProjectsSearchParamsExtras,
): string {
  const params = new URLSearchParams();
  params.set('page', String(page));
  params.set('limit', String(limit));
  if (extras?.assignees?.length) {
    for (const a of extras.assignees) {
      params.append('assignee', a);
    }
  }
  if (extras?.details) params.set('details', extras.details);
  if (extras?.search) params.set('q', extras.search);
  if (extras?.sortBy) params.set('sortBy', extras.sortBy);
  if (extras?.sortOrder) params.set('sortOrder', extras.sortOrder);
  if (extras?.statuses?.length) {
    for (const s of extras.statuses) {
      params.append('status', s);
    }
  } else if (extras?.status) {
    params.set('status', extras.status);
  }
  if (extras?.view) params.set('view', extras.view);
  return params.toString();
}

/**
 * @description Page-link params built from the *live* query string: clones the
 * current params and rewrites only `page`/`limit`, so route-local filters the
 * extras contract does not model (`?source=`, a route's own `?search=`) survive
 * a page change instead of being silently dropped.
 *
 * @public
 */
export function buildPreservedSearchParams(
  current: URLSearchParams,
  page: number,
  limit: number,
): string {
  const params = new URLSearchParams(current);
  params.set('page', String(page));
  params.set('limit', String(limit));

  return params.toString();
}
