import { z } from 'zod/v3';

import type {
  ArchiveBlogPostEditorMutation,
  PublishBlogPostEditorMutation,
  UnpublishBlogPostEditorMutation,
} from '~/__generated__/graphql';
import { BLOG_POST_LIFECYCLE_INTENT } from '~/routing/blog/config/defaults';
import type {
  BlogPostLifecycleRequest,
  BlogPostLifecycleResult,
} from '~/routing/blog/types';

const LIFECYCLE_REQUEST_SCHEMA = z.discriminatedUnion('intent', [
  z.object({ intent: z.literal(BLOG_POST_LIFECYCLE_INTENT.ARCHIVE) }).strict(),
  z
    .object({
      intent: z.literal(BLOG_POST_LIFECYCLE_INTENT.PUBLISH),
      publishedAt: z.string().datetime().nullable(),
    })
    .strict(),
  z
    .object({ intent: z.literal(BLOG_POST_LIFECYCLE_INTENT.UNPUBLISH) })
    .strict(),
]);

const LIFECYCLE_INTENTS: readonly string[] = Object.values(
  BLOG_POST_LIFECYCLE_INTENT,
);

/**
 * @description True when the raw action body names a lifecycle intent, so the
 * action knows to demand `blog:write` before it reads anything else.
 */
export const isBlogPostLifecycleBody = (body: unknown): boolean =>
  typeof body === 'object' &&
  body !== null &&
  'intent' in body &&
  typeof body.intent === 'string' &&
  LIFECYCLE_INTENTS.includes(body.intent);

/**
 * @description Validates a lifecycle JSON body. `null` for anything that is not
 * a well-formed {@link BlogPostLifecycleRequest}, such as a `publishedAt` that
 * is not an ISO timestamp.
 */
export const parseBlogPostLifecycleRequest = (
  body: unknown,
): BlogPostLifecycleRequest | null => {
  const parsed = LIFECYCLE_REQUEST_SCHEMA.safeParse(body);

  return parsed.success ? parsed.data : null;
};

/** @description Maps the `publishBlogPost` union onto a lifecycle result. */
export const toBlogPostPublishResult = (
  result: PublishBlogPostEditorMutation['publishBlogPost'],
): BlogPostLifecycleResult => {
  switch (result.__typename) {
    case 'BlogPostAdminObject':
      return {
        outcome: 'published',
        publishedAt:
          result.publishedAt === null || result.publishedAt === undefined
            ? null
            : String(result.publishedAt),
        state: result.state,
      };
    case 'BlogPostNotFoundError':
      return { message: result.message, outcome: 'lifecycleNotFound' };
  }
};

/** @description Maps the `unpublishBlogPost` union onto a lifecycle result. */
export const toBlogPostUnpublishResult = (
  result: UnpublishBlogPostEditorMutation['unpublishBlogPost'],
): BlogPostLifecycleResult => {
  switch (result.__typename) {
    case 'BlogPostAdminObject':
      return { outcome: 'unpublished' };
    case 'BlogPostNotFoundError':
      return { message: result.message, outcome: 'lifecycleNotFound' };
  }
};

/** @description Maps the `archiveBlogPost` union onto a lifecycle result. */
export const toBlogPostArchiveResult = (
  result: ArchiveBlogPostEditorMutation['archiveBlogPost'],
): BlogPostLifecycleResult => {
  switch (result.__typename) {
    case 'BlogPostAdminObject':
      return { outcome: 'archived' };
    case 'BlogPostNotFoundError':
      return { message: result.message, outcome: 'lifecycleNotFound' };
  }
};

/** @description Narrows an unknown action result to a lifecycle result. */
export const isBlogPostLifecycleResult = (
  value: unknown,
): value is BlogPostLifecycleResult =>
  typeof value === 'object' &&
  value !== null &&
  'outcome' in value &&
  (value.outcome === 'archived' ||
    value.outcome === 'lifecycleError' ||
    value.outcome === 'lifecycleNotFound' ||
    value.outcome === 'published' ||
    value.outcome === 'unpublished');

/**
 * @description True when the action changed the post, so the loader must
 * re-read it (new state, `publishedAt` and `updatedAt`). A not-found or failed
 * action wrote nothing.
 */
export const didBlogPostLifecycleWrite = (value: unknown): boolean =>
  isBlogPostLifecycleResult(value) &&
  (value.outcome === 'archived' ||
    value.outcome === 'published' ||
    value.outcome === 'unpublished');
