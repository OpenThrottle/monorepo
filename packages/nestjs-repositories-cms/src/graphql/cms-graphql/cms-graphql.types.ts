/**
 * @description The `extensions.code` values cms mutations fail with. Clients branch on these;
 * the message is for people.
 * @public
 */
export type CmsGraphqlErrorCode =
  'BAD_USER_INPUT' | 'CONFLICT' | 'FORBIDDEN' | 'NOT_FOUND' | 'UNAUTHENTICATED';
