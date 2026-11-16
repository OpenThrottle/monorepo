/**
 * @description The `extensions.code` values cms operations fail with. Clients branch on these;
 * the message is for people. `CMS_TREE_TOO_LARGE` is a read failure: a fragment tree past the
 * node cap. `CMS_SCHEMA_SYNC_FAILED`: the on-demand schema sync could not
 * read the manifests or write them.
 * @public
 */
export type CmsGraphqlErrorCode =
  | 'BAD_USER_INPUT'
  | 'CMS_SCHEMA_SYNC_FAILED'
  | 'CMS_TREE_TOO_LARGE'
  | 'CONFLICT'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'UNAUTHENTICATED';
