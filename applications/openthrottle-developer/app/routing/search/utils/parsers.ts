import {
  DEFAULT_SEARCH_LIMIT,
  SEARCH_BASE_PATH,
} from '~/routing/search/config';

/** Parsed search URL parameters. */
interface ParsedSearchParams {
  /** When true, power-user mode: expand ranking details on each result (`details=ranking`). */
  readonly expandRankingDetails: boolean;
  readonly limit: number;
  readonly page: number;
  readonly q: string;
}

/**
 * @description Parses URL search params into typed q, page, and limit.
 */
export function parseSearchParams(
  searchParams: URLSearchParams,
): ParsedSearchParams {
  const q = searchParams.get('q') ?? '';
  const pageRaw = searchParams.get('page');
  const page = Math.max(1, parseInt(pageRaw ?? '1', 10) || 1);
  const limitRaw = searchParams.get('limit');
  const limit = Math.max(
    1,
    Math.min(
      100,
      parseInt(limitRaw ?? String(DEFAULT_SEARCH_LIMIT), 10) ||
        DEFAULT_SEARCH_LIMIT,
    ),
  );
  const details = searchParams.get('details') ?? '';
  const expandRankingDetails = details === 'ranking';
  return { expandRankingDetails, limit, page, q };
}

/**
 * @description Builds the search URL path and query string for the given params.
 */
export function buildSearchUrl(
  q: string,
  page?: number,
  limit?: number,
  options?: { readonly detailsRanking?: boolean },
): string {
  const params = new URLSearchParams();
  if (q) params.set('q', q);
  if (page !== undefined && page > 1) params.set('page', String(page));
  if (limit !== undefined && limit !== DEFAULT_SEARCH_LIMIT) {
    params.set('limit', String(limit));
  }
  if (options?.detailsRanking === true) {
    params.set('details', 'ranking');
  }
  const query = params.toString();
  return query ? `${SEARCH_BASE_PATH}?${query}` : SEARCH_BASE_PATH;
}
