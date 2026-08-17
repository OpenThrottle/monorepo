import {
  DEFAULT_PAGINATION_LIMIT,
  DEFAULT_PAGINATION_PAGE,
} from '../config/defaults';

/** Options for {@link parsePaginationLimit} and {@link parsePagination}. */
export interface ParsePaginationOptions {
  /** Fallback when `limit` is missing or invalid. Defaults to `DEFAULT_PAGINATION_LIMIT`. */
  readonly defaultLimit?: number;
  /** Fallback when `page` is missing or invalid. Defaults to `DEFAULT_PAGINATION_PAGE`. */
  readonly defaultPage?: number;
  /** Upper clamp for a parsed `limit`. Omit for no upper bound. */
  readonly maxLimit?: number;
  /** Lower clamp for a parsed `limit`. Defaults to `1`. */
  readonly minLimit?: number;
}

/** Offset-based pagination derived from `?page=` / `?limit=`. */
export interface ParsedPagination {
  readonly limit: number;
  readonly offset: number;
  readonly page: number;
}

/**
 * @description Coerce a raw search-param string to a finite integer >= 1, or
 * `null` when it is missing, empty, non-numeric, or below one.
 */
const parsePositiveInteger = (
  raw: string | null | undefined,
): null | number => {
  const parsed = raw != null && raw !== '' ? Number(raw) : Number.NaN;

  return Number.isFinite(parsed) && parsed >= 1 ? Math.floor(parsed) : null;
};

/**
 * @description Parse a raw `?page=` value. Missing, empty, non-finite, or
 * below-one values fall back to `defaultPage` (`DEFAULT_PAGINATION_PAGE`).
 * Never upper-clamped — that needs `totalPages`, which only the caller knows.
 * @public
 */
export const parsePaginationPage = (
  raw: string | null | undefined,
  defaultPage: number = DEFAULT_PAGINATION_PAGE,
): number => parsePositiveInteger(raw) ?? defaultPage;

/**
 * @description Parse a raw `?limit=` value. Missing, empty, non-finite, or
 * below-one values fall back to `defaultLimit` (`DEFAULT_PAGINATION_LIMIT`);
 * otherwise the value is floored then clamped into `[minLimit, maxLimit]`.
 * @public
 */
export const parsePaginationLimit = (
  raw: string | null | undefined,
  options: ParsePaginationOptions = {},
): number => {
  const {
    defaultLimit = DEFAULT_PAGINATION_LIMIT,
    maxLimit,
    minLimit = 1,
  } = options;

  const parsed = parsePositiveInteger(raw);

  if (parsed == null) {
    return defaultLimit;
  }

  const lowerBounded = Math.max(minLimit, parsed);

  return maxLimit == null ? lowerBounded : Math.min(maxLimit, lowerBounded);
};

/**
 * @description Parse the `?page=` / `?limit=` pager params off a
 * `URLSearchParams` into `{ limit, offset, page }` for offset-based queries.
 * @public
 */
export const parsePagination = (
  searchParams: URLSearchParams,
  options: ParsePaginationOptions = {},
): ParsedPagination => {
  const limit = parsePaginationLimit(searchParams.get('limit'), options);
  const page = parsePaginationPage(
    searchParams.get('page'),
    options.defaultPage,
  );

  return { limit, offset: (page - 1) * limit, page };
};

export const parseShortUUID = (uuid?: string | null): string => {
  if (uuid == null) {
    return '';
  }

  if (uuid.length < 8) {
    return uuid;
  }

  return uuid.slice(0, 8);
};
