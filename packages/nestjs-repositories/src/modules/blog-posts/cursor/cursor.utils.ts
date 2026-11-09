import type { BlogPostAdminCursor, BlogPostCursor } from './cursor.types.ts';

const CURSOR_SEPARATOR = '|';
const ISO_TIMESTAMP = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,6})?Z$/;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const encodeBlogPostCursor = (cursor: BlogPostCursor): string => {
  return Buffer.from(
    `${cursor.publishedAt}${CURSOR_SEPARATOR}${cursor.id}`,
    'utf8',
  ).toString('base64url');
};

/** Returns `null` for anything that is not a cursor this module produced. */
export const decodeBlogPostCursor = (value: string): BlogPostCursor | null => {
  const [publishedAt, id, ...rest] = Buffer.from(value, 'base64url')
    .toString('utf8')
    .split(CURSOR_SEPARATOR);
  if (rest.length > 0 || publishedAt == null || id == null) return null;
  if (!ISO_TIMESTAMP.test(publishedAt) || !UUID.test(id)) return null;
  return { id, publishedAt };
};
export const encodeBlogPostAdminCursor = (
  cursor: BlogPostAdminCursor,
): string => {
  return encodeBlogPostCursor({ id: cursor.id, publishedAt: cursor.updatedAt });
};

/** Returns `null` for anything that is not a cursor this module produced. */
export const decodeBlogPostAdminCursor = (
  value: string,
): BlogPostAdminCursor | null => {
  const decoded = decodeBlogPostCursor(value);
  return decoded == null
    ? null
    : { id: decoded.id, updatedAt: decoded.publishedAt };
};
