import type { BlogPostState } from '~/__generated__/graphql';
import {
  BLOG_CURSOR_PARAM,
  BLOG_SEARCH_PARAM,
  BLOG_STATE_PARAM,
  BLOG_STATE_TABS,
  DEFAULT_BLOG_STATE,
} from '~/routing/blog/config/defaults';

/**
 * @description The `state` URL value for a tab: the lower-cased enum value
 * (`?state=scheduled`). {@link parseBlogState} also accepts the upper-case enum
 * spelling, so `?state=SCHEDULED` keeps working.
 */
export const toBlogStateParam = (state: BlogPostState): string =>
  state.toLowerCase();

/**
 * @description Resolves the active tab from the `state` param, falling back to
 * {@link DEFAULT_BLOG_STATE} for a missing or unknown value.
 */
export const parseBlogState = (raw: string | null): BlogPostState => {
  const needle = raw?.trim().toLowerCase();

  return (
    BLOG_STATE_TABS.find((state) => toBlogStateParam(state) === needle) ??
    DEFAULT_BLOG_STATE
  );
};

/**
 * @description Reads the three URL-owned list inputs (`state`, `q`, `after`).
 * `search` and `after` are `null` when absent or blank, which is what
 * `blogAdminPosts` expects for "no filter" / "first page".
 */
export const parseBlogListParams = (
  searchParams: URLSearchParams,
): {
  readonly after: string | null;
  readonly search: string | null;
  readonly state: BlogPostState;
} => {
  const search = searchParams.get(BLOG_SEARCH_PARAM)?.trim() ?? '';
  const after = searchParams.get(BLOG_CURSOR_PARAM)?.trim() ?? '';

  return {
    after: after === '' ? null : after,
    search: search === '' ? null : search,
    state: parseBlogState(searchParams.get(BLOG_STATE_PARAM)),
  };
};
