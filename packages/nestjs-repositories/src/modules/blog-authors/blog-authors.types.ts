/**
 * Input for {@link BlogAuthorsService.upsertAuthor}. The write replaces the author's fields:
 * an omitted or `null` bio / avatar clears the column. `userId` is deliberately not settable.
 * @public
 */
export interface BlogAuthorUpsertInput {
  readonly avatarUrl?: string | null;
  readonly bio?: string | null;
  readonly displayName: string;
  readonly slug: string;
}
