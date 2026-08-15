import type { Fetcher } from 'react-router';

/**
 * @description Pure predicates over a React Router `useFetcher` result — the
 * `state !== 'idle'` and in-flight `formData` intent checks that route
 * components otherwise hand-roll. Typed against react-router's `Fetcher` union;
 * `FetcherWithComponents<T>` (what `useFetcher` returns) is assignable to it.
 */

/**
 * @public
 * @description True while a fetcher is submitting or loading (i.e. not idle).
 * The canonical "busy" flag for disabling controls / showing spinners.
 */
export const isFetcherBusy = (fetcher: Fetcher): boolean => {
  return fetcher.state !== 'idle';
};

/**
 * @public
 * @description True when the fetcher is busy *and* its in-flight `formData`
 * carries a non-empty string for `field`. Used to scope a pending state to a
 * specific submission (e.g. only the `intent` currently in flight), rather than
 * lighting up every control while any submission runs.
 */
export const isFetcherFormPending = (
  fetcher: Fetcher,
  field: string,
): boolean => {
  if (!isFetcherBusy(fetcher)) {
    return false;
  }

  const value = fetcher.formData?.get(field);
  const isString = typeof value === 'string';

  return isString && value.length > 0;
};
