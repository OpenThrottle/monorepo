import * as React from 'react';
import { useSearchParams } from 'react-router';

const DEFAULT_DEBOUNCE_MS = 300;
const DEFAULT_PARAM_KEY = 'q';

export interface UseDebouncedSearchParamOptions {
  /**
   * @description Delay between last keystroke and writing the trimmed value to the URL. Use `replace: true` so history is not flooded (see {@link UseDebouncedSearchParamOptions.replace}).
   */
  readonly debounceMs?: number;
  /**
   * @description Search param key for the committed filter (default `q`).
   */
  readonly paramKey?: string;
  /**
   * @description Passed through to `setSearchParams` when supported by your React Router version.
   */
  readonly preventScrollReset?: boolean;
  /**
   * @description Use `replace` navigations when committing so each debounced step does not create a history entry. Anti-pattern: `replace: false` with debounced commits inserts many history slots.
   */
  readonly replace?: boolean;
  /**
   * @description Applied to a copy of the **current** URLSearchParams immediately before the search key is written (e.g. reset `page` to `1`, keep `limit`). Runs on debounced commits and on {@link UseDebouncedSearchParamResult.commitNow}.
   */
  readonly transformCommittedParams?: (next: URLSearchParams) => void;
}

export interface UseDebouncedSearchParamResult {
  /**
   * @description Applies the current input to the URL immediately (trimmed); clears the param when empty. Cancels any pending debounced write.
   */
  readonly commitNow: () => void;
  /**
   * @description Trimmed value last reflected in the URL for {@link UseDebouncedSearchParamOptions.paramKey}. Matches loader/query reads on navigation.
   */
  readonly committedValue: string;
  /**
   * @description Wire to the search `<input>` `onChange`. Updates local value immediately; commits trimmed text to the URL after {@link UseDebouncedSearchParamOptions.debounceMs}.
   */
  readonly onSearchInputChange: (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => void;
  /**
   * @description Controlled local value for responsive typing; SSR/hydration should match the server URL via {@link UseDebouncedSearchParamResult.committedValue} on first paint.
   */
  readonly searchInputValue: string;
}

/**
 * @description Canonical pattern for list/search filters: keep the input locally controlled, debounce writes to `URLSearchParams`, and use `replace` so history stays usable.
 *
 * Anti-patterns (avoid):
 * - Calling `setSearchParams` on every keystroke without debouncing or without `replace`, which floods browser history and triggers excessive navigations.
 * - Omitting sync-from-URL on external navigations (back/forward, clearing filters): this hook resets local input when the committed param changes.
 *
 * Prefer committing early on explicit submit (`commitNow`) or blur when users expect immediate results.
 */
export function useDebouncedSearchParam(
  options?: UseDebouncedSearchParamOptions,
): UseDebouncedSearchParamResult {
  const debounceMs = options?.debounceMs ?? DEFAULT_DEBOUNCE_MS;
  const paramKey = options?.paramKey ?? DEFAULT_PARAM_KEY;
  const replace = options?.replace ?? true;
  const preventScrollReset = options?.preventScrollReset;
  const transformCommittedParams = options?.transformCommittedParams;

  const [searchParams, setSearchParams] = useSearchParams();
  const searchParamsRef = React.useRef(searchParams);

  React.useEffect(() => {
    searchParamsRef.current = searchParams;
  }, [searchParams]);

  const committedValue = searchParams.get(paramKey) ?? '';

  const [searchInputValue, setSearchInputValue] =
    React.useState(committedValue);

  React.useEffect(() => {
    setSearchInputValue(committedValue);
  }, [committedValue]);

  const debounceRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearDebounce = React.useCallback((): void => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
      debounceRef.current = null;
    }
  }, []);

  const applyToUrl = React.useCallback(
    (rawInput: string): void => {
      const next = new URLSearchParams(searchParamsRef.current);
      transformCommittedParams?.(next);
      const trimmed = rawInput.trim();
      if (trimmed) {
        next.set(paramKey, trimmed);
      } else {
        next.delete(paramKey);
      }
      const navigateOpts =
        preventScrollReset === undefined
          ? { replace }
          : { preventScrollReset, replace };
      setSearchParams(next, navigateOpts);
    },
    [
      paramKey,
      preventScrollReset,
      replace,
      setSearchParams,
      transformCommittedParams,
    ],
  );

  const scheduleCommit = React.useCallback(
    (rawInput: string): void => {
      clearDebounce();
      debounceRef.current = setTimeout(() => {
        debounceRef.current = null;
        applyToUrl(rawInput);
      }, debounceMs);
    },
    [applyToUrl, clearDebounce, debounceMs],
  );

  React.useEffect(() => () => clearDebounce(), [clearDebounce]);

  const commitNow = React.useCallback((): void => {
    clearDebounce();
    applyToUrl(searchInputValue);
  }, [applyToUrl, clearDebounce, searchInputValue]);

  const onSearchInputChange = React.useCallback(
    (event: React.ChangeEvent<HTMLInputElement>): void => {
      const value = event.target.value;
      setSearchInputValue(value);
      scheduleCommit(value);
    },
    [scheduleCommit],
  );

  return {
    commitNow,
    committedValue,
    onSearchInputChange,
    searchInputValue,
  };
}
