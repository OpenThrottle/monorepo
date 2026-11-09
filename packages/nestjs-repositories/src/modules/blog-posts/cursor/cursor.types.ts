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

/**
 * Keyset cursor for the admin list, ordered `updated_at DESC, id DESC`. Same wire format as
 * {@link BlogPostCursor} (ISO timestamp at database precision, `|`, id), but typed separately so
 * a public cursor is never mistaken for an admin one at the call site.
 */
export interface BlogPostAdminCursor {
  readonly id: string;
  readonly updatedAt: string;
}
