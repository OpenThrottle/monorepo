/**
 * @description The `extensions.code` values cms operations fail with. Clients branch on these;
 * the message is for people. `CMS_TREE_TOO_LARGE` is a read failure: a fragment tree past the
 * node cap.
 * @public
 */
export type CmsGraphqlErrorCode =
  | 'BAD_USER_INPUT'
  | 'CMS_TREE_TOO_LARGE'
  | 'CONFLICT'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'UNAUTHENTICATED';

/**
 * @description The paging arguments of a cms list query: `limit` / `offset`, plus the
 * deprecated `take` / `skip` they replace.
 */
export interface CmsPageArgs {
  readonly limit: number | null | undefined;
  readonly offset: number | null | undefined;
  readonly skip: number | null | undefined;
  readonly take: number | null | undefined;
}
