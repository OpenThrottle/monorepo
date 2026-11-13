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
