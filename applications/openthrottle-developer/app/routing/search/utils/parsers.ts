import { ROUTE_STATS_URL } from '@openthrottle/react-router-ui-global';
import { parsePagination } from '@openthrottle/react-router-utils';

import type { SearchScopeValue } from '~/routing/search/config';
import {
  DEFAULT_SEARCH_LIMIT,
  SEARCH_BASE_PATH,
  SEARCH_SCOPE,
} from '~/routing/search/config';

/** Parsed search URL parameters. */
export interface ParsedSearchParams {
  /** When true, power-user mode: expand ranking details on each result (`details=ranking`). */
  readonly expandRankingDetails: boolean;
  readonly limit: number;
  readonly page: number;
  readonly q: string;
  /** Code scope only: the registered repository to search (`repositoryId`), or null for the default. */
  readonly repositoryId: string | null;
  readonly scope: SearchScopeValue;
}

/** Options {@link buildSearchUrl} carries besides the query, page and limit. */
export interface BuildSearchUrlOptions {
  readonly detailsRanking?: boolean;
  readonly repositoryId?: string | null;
  readonly scope?: SearchScopeValue;
}

/** @description `scope=code` selects code search; anything else is the knowledge default. */
export function parseSearchScope(value: string | null): SearchScopeValue {
  return value === SEARCH_SCOPE.code
    ? SEARCH_SCOPE.code
    : SEARCH_SCOPE.knowledge;
}

/**
 * @description Parses URL search params into typed q, page, limit, scope and repository.
 */
export function parseSearchParams(
  searchParams: URLSearchParams,
): ParsedSearchParams {
  const q = searchParams.get('q') ?? '';
  const { limit, page } = parsePagination(searchParams, {
    defaultLimit: DEFAULT_SEARCH_LIMIT,
    maxLimit: 50,
  });
  const details = searchParams.get('details') ?? '';
  const expandRankingDetails = details === 'ranking';
  const scope = parseSearchScope(searchParams.get('scope'));
  const repositoryParam = searchParams.get('repositoryId') ?? '';
  const repositoryId = repositoryParam === '' ? null : repositoryParam;

  return { expandRankingDetails, limit, page, q, repositoryId, scope };
}

/**
 * @description Builds the search URL path and query string for the given params. The knowledge
 * scope is the default, so it never appears in the URL; a repository is only carried in code scope.
 */
export function buildSearchUrl(
  q: string,
  page?: number,
  limit?: number,
  options?: BuildSearchUrlOptions,
): string {
  const params = new URLSearchParams();
  const isCode = options?.scope === SEARCH_SCOPE.code;

  if (q) params.set('q', q);
  if (page !== undefined && page > 1) params.set('page', String(page));
  if (limit !== undefined && limit !== DEFAULT_SEARCH_LIMIT) {
    params.set('limit', String(limit));
  }

  if (options?.detailsRanking === true) {
    params.set('details', 'ranking');
  }

  if (isCode) {
    params.set('scope', SEARCH_SCOPE.code);
  }

  if (isCode && options?.repositoryId) {
    params.set('repositoryId', options.repositoryId);
  }

  const query = params.toString();
  return query ? `${SEARCH_BASE_PATH}?${query}` : SEARCH_BASE_PATH;
}

/**
 * @description Carries the stats panel's open state (`ROUTE_STATS_URL.param`) from the current
 * URL onto a built search URL, so switching scope or repository keeps the panel as it was.
 */
export function withStatsParam(url: string, current: URLSearchParams): string {
  const value = current.get(ROUTE_STATS_URL.param);

  if (value === null) {
    return url;
  }

  const separator = url.includes('?') ? '&' : '?';
  const param = new URLSearchParams({ [ROUTE_STATS_URL.param]: value });

  return `${url}${separator}${param.toString()}`;
}
