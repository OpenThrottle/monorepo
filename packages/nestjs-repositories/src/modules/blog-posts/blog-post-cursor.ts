/**
 * @description Opaque keyset cursor for blog post pagination, ordered
 * `published_at DESC, id DESC`. Encodes the (publishedAt ISO, id) pair of the last row
 * on a page. `publishedAt` stays a string with the database's full (microsecond)
 * precision — round-tripping through a JS `Date` would truncate to milliseconds and
 * break stability for rows that tie within the same millisecond.
 */

export interface BlogPostCursor {
  readonly id: string;
  readonly publishedAt: string;
}

const CURSOR_SEPARATOR = '|';
const ISO_TIMESTAMP = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,6})?Z$/;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const encodeBlogPostCursor = (cursor: BlogPostCursor): string =>
  Buffer.from(
    `${cursor.publishedAt}${CURSOR_SEPARATOR}${cursor.id}`,
    'utf8',
  ).toString('base64url');

/** Returns `null` for anything that is not a cursor this module produced. */
export const decodeBlogPostCursor = (value: string): BlogPostCursor | null => {
  const [publishedAt, id, ...rest] = Buffer.from(value, 'base64url')
    .toString('utf8')
    .split(CURSOR_SEPARATOR);
  if (rest.length > 0 || publishedAt == null || id == null) return null;
  if (!ISO_TIMESTAMP.test(publishedAt) || !UUID.test(id)) return null;
  return { id, publishedAt };
};
