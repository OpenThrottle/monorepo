import { BlogPostState } from '~/__generated__/graphql';
import type { BlogPostEditorField } from '~/routing/blog/types';

/** Search param carrying the opaque pagination cursor (`blogAdminPosts.after`). */
export const BLOG_CURSOR_PARAM = 'after';

/** The create-a-draft route; POST to it to create, GET shows a one-button form. */
export const BLOG_NEW_POST_PATH = '/blog/new';

/** Rows fetched per page of the post list. */
export const BLOG_POSTS_PAGE_SIZE = 20;

/** Search param carrying the free-text query. */
export const BLOG_SEARCH_PARAM = 'q';

/** Search param carrying the active state tab. */
export const BLOG_STATE_PARAM = 'state';

/** The tab shown when `state` is missing or unrecognised. */
export const DEFAULT_BLOG_STATE: BlogPostState = BlogPostState.Draft;

/** State tabs in display order. Each tab maps to exactly one `BlogPostState`. */
export const BLOG_STATE_TABS: readonly BlogPostState[] = [
  BlogPostState.Draft,
  BlogPostState.Scheduled,
  BlogPostState.Live,
  BlogPostState.Archived,
];

/**
 * Shape of a post slug: lowercase letters, digits and single hyphens. Mirrors
 * `BLOG_SLUG_PATTERN` in `@openthrottle/nestjs-repositories` (a server package
 * the client bundle must not import); the server stays the authority.
 */
export const BLOG_SLUG_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;

/** Prefix of the slug `/blog/new` generates: `untitled-<base36 time>-<random>`. */
export const BLOG_DRAFT_SLUG_PREFIX = 'untitled';

/** How many times `/blog/new` tries a fresh slug before reporting a conflict. */
export const BLOG_DRAFT_SLUG_ATTEMPTS = 2;

/**
 * `intent` values the `/blog/:postId` action accepts. `save` sends the loaded
 * `updatedAt` as `expectedUpdatedAt` so a concurrent edit is caught; `overwrite`
 * resends the same changes without it, after the author chose to overwrite.
 */
export const BLOG_POST_SAVE_INTENT = {
  OVERWRITE: 'overwrite',
  SAVE: 'save',
} as const;

/**
 * Lifecycle `intent` values the `/blog/:postId` action accepts, beside the save
 * intents. Each maps onto one server mutation and needs `blog:write`.
 */
export const BLOG_POST_LIFECYCLE_INTENT = {
  ARCHIVE: 'archive',
  PUBLISH: 'publish',
  UNPUBLISH: 'unpublish',
} as const;

/** Author `<Select>` value for "no byline" (Radix Select forbids an empty value). */
export const BLOG_NO_AUTHOR_VALUE = '__none__';

/** Monaco theme for each resolved app color mode. */
export const BLOG_EDITOR_MONACO_THEMES = {
  dark: 'vs-dark',
  light: 'light',
} as const;

/** Every editable field of the post editor, in display order. */
export const BLOG_POST_EDITOR_FIELDS: readonly BlogPostEditorField[] = [
  'title',
  'slug',
  'excerpt',
  'authorSlug',
  'tagSlugs',
  'coverImageUrl',
  'coverImageAlt',
  'seoTitle',
  'seoDescription',
  'bodyMarkdown',
];
