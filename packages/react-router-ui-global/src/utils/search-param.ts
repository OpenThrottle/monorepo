/**
 * @public
 * Canonical URL param key for list-toolbar search, matching the default
 * `paramKey` of {@link GlobalToolbarSearch}.
 */
export const SEARCH_PARAM_KEY = 'search';

/**
 * @public
 * Legacy URL param key kept alive for gradual `q → search` migrations, so
 * existing `?q=` bookmarks keep filtering. See
 * `docs/monorepo/url-first-ui-state.md` §7.
 */
export const LEGACY_SEARCH_PARAM_KEY = 'q';

/**
 * @public
 * Reads the committed list-toolbar search query from URL params the canonical
 * way: prefer `search`, fall back to the legacy `q`, then trim. Returns `''`
 * when neither is present, so callers can treat empty as "no query".
 *
 * Centralizes the `searchParams.get('search') ?? searchParams.get('q')` pattern
 * used by every URL-driven list surface (readers only — {@link
 * GlobalToolbarSearch} owns the write side).
 */
export const readSearchParam = (searchParams: URLSearchParams): string => {
  return (
    (
      searchParams.get(SEARCH_PARAM_KEY) ??
      searchParams.get(LEGACY_SEARCH_PARAM_KEY)
    )?.trim() ?? ''
  );
};
