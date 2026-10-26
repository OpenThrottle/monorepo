import { BlogPostState } from '~/__generated__/graphql';
import { BLOG_COPY, BLOG_LIFECYCLE_COPY } from '~/routing/blog/data/data.copy';

/**
 * @description Formats an ISO timestamp as `Oct 26, 2026, 1:23 AM PDT`: the date,
 * the time, and the short time-zone name, so a scheduled go-live is unambiguous.
 *
 * Pass `timeZone` to pin a zone (the server render pins `UTC`, since the server
 * cannot know the viewer's zone); omit it to use the viewer's local zone. An
 * unparseable value renders as an em dash instead of throwing.
 */
export const formatBlogDateTime = (
  iso: string,
  timeZone: string | undefined,
): string => {
  const date = new Date(iso);

  if (Number.isNaN(date.getTime())) {
    return '—';
  }

  return new Intl.DateTimeFormat('en-US', {
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    month: 'short',
    timeZone,
    timeZoneName: 'short',
    year: 'numeric',
  }).format(date);
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

  const when = formatBlogDateTime(publishedAt, timeZone);

  return state === BlogPostState.Scheduled
    ? `${BLOG_COPY.goesLive} ${when}`
    : when;
};

/**
 * @description The short name of a time zone at `date` (`PDT`, `UTC`). Pass
 * `timeZone` to pin a zone; omit it for the viewer's local zone.
 */
export const formatBlogTimeZoneName = (
  date: Date,
  timeZone: string | undefined,
): string =>
  new Intl.DateTimeFormat('en-US', { timeZone, timeZoneName: 'short' })
    .formatToParts(date)
    .find((part) => part.type === 'timeZoneName')?.value ?? '';

/**
 * @description The "Scheduled for Nov 1, 2026, 9:00 AM (PST)" line. Like
 * {@link formatBlogDateTime}, pass `timeZone` to pin a zone (the server render
 * pins `UTC`) or omit it for the viewer's local zone. An unparseable value
 * renders as an em dash.
 */
export const formatBlogScheduledFor = (
  iso: string,
  timeZone: string | undefined,
): string => {
  const date = new Date(iso);

  if (Number.isNaN(date.getTime())) {
    return '—';
  }

  const when = new Intl.DateTimeFormat('en-US', {
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    month: 'short',
    timeZone,
    year: 'numeric',
  }).format(date);

  return BLOG_LIFECYCLE_COPY.scheduledFor(
    when,
    formatBlogTimeZoneName(date, timeZone),
  );
};
