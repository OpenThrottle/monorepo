/**
 * @description Row shape from raw SQL vector search over code_embeddings (snake_case columns plus a
 * computed `similarity`). Mirrors {@link PlanEmbeddingSearchRow} / {@link TaskEmbeddingSearchRow}.
 * `similarity` is `1 - (embedding <=> $query::vector)` returned as a string by pg.
 * @public
 */
export interface CodeEmbeddingSearchRow {
  readonly content: string;
  readonly content_hash: string;
  readonly end_line: number;
  readonly id: string;
  readonly path: string;
  readonly similarity: string;
  readonly start_line: number;
  readonly workspace_root: string;
}
