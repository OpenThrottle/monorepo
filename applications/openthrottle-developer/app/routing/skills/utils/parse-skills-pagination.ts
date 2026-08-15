import {
  DEFAULT_PAGINATION_LIMIT,
  DEFAULT_PAGINATION_PAGE,
} from '@openthrottle/react-router-utils';

/**
 * @description Parse the `?page=` search param for the client-side `/skills`
 * pager. Falls back to page 1 for missing/invalid/out-of-lower-bound values.
 * Upper-bound clamping (page > totalPages) is the caller's job — it needs the
 * filtered count.
 */
export const parsePaginationPage = (raw: string | null): number => {
  const parsed = raw != null && raw !== '' ? Number(raw) : NaN;

  return Number.isFinite(parsed) && parsed >= 1
    ? Math.floor(parsed)
    : DEFAULT_PAGINATION_PAGE;
};

/**
 * @description Parse the `?limit=` search param for the `/skills` pager. Falls
 * back to the shared default for missing/invalid/below-one values.
 */
export const parsePaginationLimit = (raw: string | null): number => {
  const parsed = raw != null && raw !== '' ? Number(raw) : NaN;

  return Number.isFinite(parsed) && parsed >= 1
    ? Math.floor(parsed)
    : DEFAULT_PAGINATION_LIMIT;
};
