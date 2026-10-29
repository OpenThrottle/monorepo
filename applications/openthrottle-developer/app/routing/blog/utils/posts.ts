import { BlogPostState } from '~/__generated__/graphql';
import { formatDateTime } from '~/global/utils/dates';
import {
  BLOG_CURSOR_PARAM,
  BLOG_DRAFT_SLUG_PREFIX,
  BLOG_SEARCH_PARAM,
  BLOG_STATE_PARAM,
  BLOG_STATE_TABS,
  DEFAULT_BLOG_STATE,
} from '~/routing/blog/config/defaults';
import { BLOG_AGENT_EDITORS } from '~/routing/blog/data/data.agent-editors';
import { BLOG_COPY } from '~/routing/blog/data/data.copy';

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

/**
 * @description The "Published" cell text. A draft has no `publishedAt`, so it
 * renders an em dash; a scheduled post reads `goes live <date, time zone>`; a
 * live or archived post shows the date it went live.
 */
export const formatBlogPublishedLabel = (
  state: BlogPostState,
  publishedAt: string | null | undefined,
  timeZone: string | undefined,
): string => {
  if (publishedAt === null || publishedAt === undefined) {
    return BLOG_COPY.noValue;
  }

  const when = formatDateTime(publishedAt, {
    timeZone,
    withTimeZoneName: true,
  });

  return state === BlogPostState.Scheduled
    ? `${BLOG_COPY.goesLive} ${when}`
    : when;
};

/**
 * @description True when `lastEditedBy` names an agent (service account) rather
 * than a person.
 *
 * Heuristic, and deliberately conservative: the API exposes only a name string,
 * never an actor type. Agent writes arrive as a service-account name (the
 * OpenThrottle MCP writes as `openthrottle-mcp`), while people arrive as a
 * GitHub username, display name or email. So a value is an agent only when it
 * has no `@` (never an email) AND matches the known service-account list in
 * {@link BLOG_AGENT_EDITORS}, case-insensitively. An unknown service account
 * therefore renders as a plain name until it is added to that list.
 */
export const isAgentEditor = (lastEditedBy: string | null): boolean => {
  if (lastEditedBy === null || lastEditedBy.includes('@')) {
    return false;
  }

  const needle = lastEditedBy.trim().toLowerCase();

  return BLOG_AGENT_EDITORS.some((name) => name === needle);
};

/**
 * @description Generates a slug for a brand-new draft that satisfies the
 * server's kebab-case rule: `untitled-<base36 time>-<base36 random>`. Two calls
 * in the same millisecond still differ in the random part, which is what lets
 * `/blog/new` retry after a slug conflict.
 */
export const generateBlogDraftSlug = (
  now: number,
  random: () => number,
): string => {
  const entropy = Math.floor(random() * 36 ** 4)
    .toString(36)
    .padStart(4, '0');

  return `${BLOG_DRAFT_SLUG_PREFIX}-${now.toString(36)}-${entropy}`;
};
