/**
 * @description True when the API rejected the `after` pagination cursor as not
 * one it issued. The server throws `BadRequestException('Invalid pagination
 * cursor.')`; `executeGraphql` surfaces it as an `Error` whose message carries
 * that text (either as a `GraphQL errors:` body or a `GraphQL error 400:` status).
 */
export const isInvalidBlogCursorError = (error: unknown): boolean =>
  error instanceof Error && error.message.includes('Invalid pagination cursor');
