/**
 * Deterministic formatting helpers for the public blog. Dates are always
 * formatted in UTC with a fixed locale so server render and hydration agree.
 */

const BLOG_DATE_FORMAT = new Intl.DateTimeFormat('en-US', {
  dateStyle: 'long',
  timeZone: 'UTC',
});

const toValidDate = (value: unknown): Date | null => {
  if (
    !(value instanceof Date) &&
    typeof value !== 'string' &&
    typeof value !== 'number'
  ) {
    return null;
  }

  const date = new Date(value);

  return Number.isNaN(date.getTime()) ? null : date;
};

/**
 * @description Formats a GraphQL `DateTime` value (ISO string on the wire) as
 * e.g. `March 4, 2026`. Returns `null` for nullish or unparseable input.
 */
export const formatBlogDate = (value: unknown): string | null => {
  const date = toValidDate(value);

  return date ? BLOG_DATE_FORMAT.format(date) : null;
};

/** @description The `datetime` attribute value for a `<time>` element. */
export const toBlogIsoDate = (value: unknown): string | null => {
  const date = toValidDate(value);

  return date ? date.toISOString() : null;
};

/** @description First letters of up to two name parts, for avatar fallbacks. */
export const getBlogAuthorInitials = (displayName: string): string =>
  displayName
    .split(/\s+/)
    .filter((part) => part.length > 0)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('');
