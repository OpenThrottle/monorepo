/**
 * Input for {@link BlogTagsService.upsertTag}. The write replaces the tag's fields: an omitted
 * or `null` description clears the column.
 * @public
 */
export interface BlogTagUpsertInput {
  readonly description?: string | null;
  readonly name: string;
  readonly slug: string;
}
