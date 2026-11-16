import type {
  ShouldRevalidateFunction,
  ShouldRevalidateFunctionArgs,
} from 'react-router';

const searchWithout = (
  url: URL,
  ignoredParams: ReadonlySet<string>,
): string => {
  const kept = [...url.searchParams.entries()].filter(([key]) => {
    return !ignoredParams.has(key);
  });
  kept.sort(([a], [b]) => {
    return a.localeCompare(b);
  });

  return new URLSearchParams(kept).toString();
};

/**
 * @public
 * @description Builds a route `shouldRevalidate` that skips the loader when a
 * navigation changed **only** the given search params — UI-state params such as
 * `stats` that no loader reads. Every other case defers to React Router's
 * `defaultShouldRevalidate`: form submissions, a different pathname, any other
 * param changing, and a same-URL revalidation (`useRevalidator`, a fetcher) that
 * changed nothing at all.
 *
 * @example
 * export const shouldRevalidate = shouldRevalidateIgnoringParams(['stats']);
 */
export const shouldRevalidateIgnoringParams = (
  ignoredParams: readonly string[],
): ShouldRevalidateFunction => {
  const ignored: ReadonlySet<string> = new Set(ignoredParams);

  return (args: ShouldRevalidateFunctionArgs): boolean => {
    const { currentUrl, defaultShouldRevalidate, formMethod, nextUrl } = args;

    if (formMethod !== undefined) {
      return defaultShouldRevalidate;
    }

    if (currentUrl.pathname !== nextUrl.pathname) {
      return defaultShouldRevalidate;
    }

    if (currentUrl.search === nextUrl.search) {
      return defaultShouldRevalidate;
    }

    const isOnlyIgnoredChange =
      searchWithout(currentUrl, ignored) === searchWithout(nextUrl, ignored);

    if (isOnlyIgnoredChange) {
      return false;
    }

    return defaultShouldRevalidate;
  };
};
