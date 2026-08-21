import * as React from 'react';
import { useFetcher } from 'react-router';

/** Resource route serving keystroke branch searches. */
const USAGE_BRANCH_SEARCH_PATH = '/resources/usage-branches';

/** Debounce between the last keystroke and hitting the resource route. */
const DEFAULT_DEBOUNCE_MS = 200;

/** One selectable branch with its invocation count. */
export interface UsageBranchOption {
  readonly branch: string;
  readonly count: number;
}

/**
 * Payload the branch resource route returns. `query` echoes the normalized
 * search the items were resolved for, so a stale keystroke's response can be
 * discarded instead of flickering into the list.
 */
export interface UsageBranchSearchData {
  readonly hasMore: boolean;
  readonly items: readonly UsageBranchOption[];
  readonly query: string;
}

export interface UseUsageBranchSearchOptions {
  readonly debounceMs?: number;
  /** Range end (YYYY-MM-DD) the search runs over. */
  readonly end: string;
  /** Whether the SSR first page was itself truncated. */
  readonly initialHasMore: boolean;
  /** SSR first page, so an opened dropdown is never empty. */
  readonly initialOptions: readonly UsageBranchOption[];
  /** Range start (YYYY-MM-DD) the search runs over. */
  readonly start: string;
}

export interface UseUsageBranchSearchResult {
  readonly hasMore: boolean;
  readonly loading: boolean;
  readonly onSearchChange: (search: string) => void;
  readonly options: readonly UsageBranchOption[];
  readonly search: string;
}

/**
 * @description Debounced server-side branch search for the `/usage` filter.
 * Owns the search string, debounces a `useFetcher().load` against
 * {@link USAGE_BRANCH_SEARCH_PATH}, and only surfaces a response whose echoed
 * `query` matches the current input — so an out-of-order keystroke can never
 * win. A blank search resolves to the SSR-seeded first page with no request at
 * all; while a search is in flight the last resolved list stays visible so the
 * popover never blanks.
 */
export const useUsageBranchSearch = (
  options: UseUsageBranchSearchOptions,
): UseUsageBranchSearchResult => {
  const { end, initialHasMore, initialOptions, start } = options;
  const debounceMs = options.debounceMs ?? DEFAULT_DEBOUNCE_MS;

  // Hooks
  const fetcher = useFetcher<UsageBranchSearchData>();
  const [search, setSearch] = React.useState('');
  const [pending, setPending] = React.useState(false);
  const [resolved, setResolved] = React.useState<UsageBranchSearchData | null>(
    null,
  );

  // Setup
  const normalized = search.trim();
  // `load` identity changes every render, so the scheduling effect keys on the
  // query and reads the latest loader through a ref.
  const loadRef = React.useRef(fetcher.load);
  const isFresh = normalized === '' || resolved?.query === normalized;
  const source = resolved !== null && normalized !== '' ? resolved : null;
  const loading = !isFresh && (pending || fetcher.state === 'loading');

  // Handlers
  const onSearchChange = React.useCallback((next: string): void => {
    setSearch(next);
  }, []);

  // Markup

  // Life Cycle
  React.useEffect(() => {
    loadRef.current = fetcher.load;
  }, [fetcher.load]);

  React.useEffect(() => {
    if (normalized === '') {
      setPending(false);

      return;
    }

    setPending(true);
    const timeout = setTimeout(() => {
      setPending(false);
      loadRef.current(
        `${USAGE_BRANCH_SEARCH_PATH}?${new URLSearchParams({
          end,
          query: normalized,
          start,
        }).toString()}`,
      );
    }, debounceMs);

    return () => {
      clearTimeout(timeout);
    };
  }, [debounceMs, end, normalized, start]);

  React.useEffect(() => {
    const data = fetcher.data;

    if (data !== undefined && data.query === normalized) {
      setResolved(data);
    }
  }, [fetcher.data, normalized]);

  // 🔌 Short Circuit

  return {
    hasMore: source?.hasMore ?? initialHasMore,
    loading,
    onSearchChange,
    options: source?.items ?? initialOptions,
    search,
  };
};
