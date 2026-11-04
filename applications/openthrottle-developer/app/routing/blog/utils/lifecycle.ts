import { toast } from '@openthrottle/react-router-shadcn';
import { z } from 'zod/v3';

import type {
  ArchiveBlogPostEditorMutation,
  PublishBlogPostEditorMutation,
  UnpublishBlogPostEditorMutation,
} from '~/__generated__/graphql';
import { BlogPostState } from '~/__generated__/graphql';
import {
  formatDateTime,
  formatTimeZoneName,
  localDateTimeToUtcIso,
  parseDate,
} from '~/global/utils/dates';
import { BLOG_POST_LIFECYCLE_INTENT } from '~/routing/blog/config/defaults';
import { BLOG_COPY, BLOG_LIFECYCLE_COPY } from '~/routing/blog/data/data.copy';
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

/**
 * @description Raises the one toast a finished lifecycle action owes: success
 * for archive, publish, schedule and unpublish, error otherwise.
 */
export const announceBlogPostLifecycleResult = (
  result: BlogPostLifecycleResult,
): void => {
  switch (result.outcome) {
    case 'archived':
      toast.success(BLOG_LIFECYCLE_COPY.toasts.archived);
      break;
    case 'lifecycleError':
    case 'lifecycleNotFound':
      toast.error(result.message);
      break;
    case 'published':
      toast.success(
        result.state === BlogPostState.Scheduled
          ? BLOG_LIFECYCLE_COPY.toasts.scheduled
          : BLOG_LIFECYCLE_COPY.toasts.published,
      );
      break;
    case 'unpublished':
      toast.success(BLOG_LIFECYCLE_COPY.toasts.unpublished);
      break;
  }
};

/**
 * @description The inline error for a schedule input, or `null` when it is a
 * usable future time. A time that is not strictly after `now` (epoch ms) is
 * rejected, so a post can never be "scheduled" into the past.
 */
export const validateScheduleLocalDateTime = (
  local: string,
  now: number,
): string | null => {
  const iso = localDateTimeToUtcIso(local);

  if (iso === null) {
    return BLOG_LIFECYCLE_COPY.errors.required;
  }

  return Date.parse(iso) > now ? null : BLOG_LIFECYCLE_COPY.errors.past;
};

/**
 * @description The "Scheduled for Nov 1, 2026, 9:00 AM (PST)" line. Pass
 * `timeZone` to pin a zone (the server render pins `UTC`) or `undefined` for
 * the viewer's local zone. An unparseable value renders as an em dash.
 */
export const formatBlogScheduledFor = (
  iso: string,
  timeZone: string | undefined,
): string => {
  const date = parseDate(iso);

  if (date === null) {
    return BLOG_COPY.noValue;
  }

  return BLOG_LIFECYCLE_COPY.scheduledFor(
    formatDateTime(date, { timeZone, withTimeZoneName: false }),
    formatTimeZoneName(date, timeZone),
  );
};
