/**
 * @description Writing timeline view state back into URL search params, so every
 * view is shareable and the back button works. The parsers in `parsers.ts` are
 * the read side of this same contract.
 *
 * A param at its default is *removed* rather than written, so the canonical
 * view has a clean URL and two people looking at the same thing get the same
 * link to paste at each other.
 */

import {
  DEFAULT_TIMELINE_GROUPING,
  DEFAULT_TIMELINE_WINDOW_PRESET,
  TIMELINE_SEARCH_PARAM,
} from '../config/defaults';
import type { TimelineWindowPreset } from '../config/defaults';
import type { TimelineLaneGrouping } from '~/__generated__/graphql';

const withParam = (
  params: URLSearchParams,
  key: string,
  value: string | null,
): URLSearchParams => {
  const next = new URLSearchParams(params);
  if (value == null || value === '') next.delete(key);
  else next.set(key, value);

  return next;
};

export function withTimelineWindow(
  params: URLSearchParams,
  preset: TimelineWindowPreset,
): URLSearchParams {
  return withParam(
    params,
    TIMELINE_SEARCH_PARAM.window,
    preset === DEFAULT_TIMELINE_WINDOW_PRESET ? null : preset,
  );
}

export function withTimelineGrouping(
  params: URLSearchParams,
  grouping: TimelineLaneGrouping,
): URLSearchParams {
  return withParam(
    params,
    TIMELINE_SEARCH_PARAM.grouping,
    grouping === DEFAULT_TIMELINE_GROUPING ? null : grouping,
  );
}

export function withTimelineBranch(
  params: URLSearchParams,
  branch: string | null,
): URLSearchParams {
  return withParam(params, TIMELINE_SEARCH_PARAM.branch, branch);
}

/**
 * Write a kind allowlist.
 *
 * The three states are distinct and all reachable: absent means every kind
 * (the default), a list means those kinds, and the empty string means *none* —
 * unchecking every box has to survive a page reload rather than silently
 * reverting to "show everything".
 */
export function withTimelineKinds(
  params: URLSearchParams,
  key: string,
  kinds: readonly string[] | null,
  allKinds: readonly string[],
): URLSearchParams {
  if (kinds == null || kinds.length === allKinds.length) {
    return withParam(params, key, null);
  }

  const next = new URLSearchParams(params);
  next.set(key, kinds.join(','));

  return next;
}

/** Toggle one kind in an allowlist, resolving `null` to "everything" first. */
export function toggleTimelineKind<TKind extends string>(
  selected: readonly TKind[] | null,
  allKinds: readonly TKind[],
  kind: TKind,
): TKind[] {
  const current = selected ?? allKinds;

  return current.includes(kind)
    ? current.filter((entry) => entry !== kind)
    : // Preserve the canonical order rather than appending, so the URL is
      // stable however the boxes were clicked.
      allKinds.filter((entry) => current.includes(entry) || entry === kind);
}
