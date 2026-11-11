/**
 * @description Shape of a blog slug (lowercase kebab-case). MUST equal the regex in the
 * `chk_blog_posts_slug`, `chk_blog_tags_slug` and `chk_blog_authors_slug` CHECK constraints of
 * databases/openthrottle/migrations/131 — a test pins the two together — so a bad slug is rejected here as a
 * `BadRequestException` (a GraphQL error) instead of surfacing as a constraint violation.
 * @public
 */
export const BLOG_SLUG_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;
