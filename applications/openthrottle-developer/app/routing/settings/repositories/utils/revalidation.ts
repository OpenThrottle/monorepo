import type { ShouldRevalidateFunctionArgs } from 'react-router';

import {
  REPOSITORIES_READ_ONLY_INTENTS,
  REPOSITORIES_VIEW_PARAMS,
} from '~/routing/settings/repositories/config/repositories.defaults';

/** Every search-param key that differs between two URLs, in either direction. */
const changedParamKeys = (current: URL, next: URL): Set<string> => {
  const keys = new Set([
    ...current.searchParams.keys(),
    ...next.searchParams.keys(),
  ]);
  return new Set(
    [...keys].filter((key) => {
      return (
        current.searchParams.getAll(key).join('\u0000') !==
        next.searchParams.getAll(key).join('\u0000')
      );
    }),
  );
};

/**
 * @description Whether /settings/repositories should re-run its loader.
 *
 * Search, sort, paging and the show-missing toggle are applied on the client over data the page
 * already holds (`buildRepositoriesView`), so a navigation that changes ONLY those params has
 * nothing new to fetch — re-running the loader would re-query every checkout and the on-disk scan
 * for an identical answer. Those navigations skip it, as does finishing a read-only action (the
 * folder picker browsing directories).
 *
 * Everything else keeps the default: any mutating action (add, clone, refresh, prune, remove,
 * rescan), an explicit `revalidator.revalidate()` — the URL is unchanged, so no param changed —
 * and arriving from another route.
 */
export const shouldRevalidateRepositories = (
  args: ShouldRevalidateFunctionArgs,
): boolean => {
  const { currentUrl, defaultShouldRevalidate, formData, formMethod, nextUrl } =
    args;

  if (formMethod !== undefined) {
    const intent = formData?.get('intent');
    const isReadOnly =
      typeof intent === 'string' &&
      REPOSITORIES_READ_ONLY_INTENTS.includes(intent);
    return isReadOnly ? false : defaultShouldRevalidate;
  }

  if (currentUrl.pathname !== nextUrl.pathname) {
    return defaultShouldRevalidate;
  }

  const changed = changedParamKeys(currentUrl, nextUrl);
  if (changed.size === 0) return defaultShouldRevalidate;

  const isViewOnly = [...changed].every((key) => {
    return REPOSITORIES_VIEW_PARAMS.includes(key);
  });
  return isViewOnly ? false : defaultShouldRevalidate;
};
