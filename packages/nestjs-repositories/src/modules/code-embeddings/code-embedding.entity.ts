import { vectorTransformer } from '@openthrottle/nestjs-postgres';
import { Column, CreateDateColumn, Entity, PrimaryColumn } from 'typeorm';

/**
 * @description TypeORM entity for the code_embeddings table (databases/openthrottle/migrations 052). Backs the
 * `@openthrottle/openthrottle-ide` engine's pgvector `VectorStore`. Unlike plan/task embeddings this
 * has no FK/metadata: the `id` is a content-derived chunk id (hashContent(path + content)) and the
 * store is scoped by `workspaceRoot`. Uses pgvector vector(768) (nomic-embed-text-v1.5, migration 164) with the
 * same provenance columns as the other embedding tables; `embedding` is NULL until the server's embedder
 * has embedded the chunk.
 */
@Entity('code_embeddings')
export class CodeEmbedding {
  /** Content-derived chunk id (hashContent(path + content)); idempotent upsert key. */
  @PrimaryColumn({ name: 'id', type: 'text' })
  id!: string;

  @Column({ name: 'content', type: 'text' })
  content!: string;

  /** sha256 hex of the exact text embedded (document prefix + content, capped). */
  @Column({ name: 'content_hash', type: 'text' })
  contentHash!: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp with time zone' })
  createdAt!: Date;

  @Column({
    name: 'embedding',
    nullable: true,
    transformer: vectorTransformer,
    type: 'vector',
  })
  embedding!: number[] | null;

  /** Dimension of `embedding` as returned by the model; NULL until embedded. */
  @Column({ name: 'embedding_dims', nullable: true, type: 'integer' })
  embeddingDims!: number | null;

  /** Model that produced `embedding`; NULL or another model means the row is stale. */
  @Column({ name: 'embedding_model', nullable: true, type: 'text' })
  embeddingModel!: string | null;

  /** 1-based inclusive last line of the chunk. */
  @Column({ name: 'end_line', type: 'integer' })
  endLine!: number;

  /** Workspace-relative POSIX path of the source file. */
  @Column({ name: 'path', type: 'text' })
  path!: string;

  /** 1-based inclusive first line of the chunk. */
  @Column({ name: 'start_line', type: 'integer' })
  startLine!: number;

  /** Absolute filesystem path of the registered repository; scopes every VectorStore operation. */
  @Column({ name: 'workspace_root', type: 'text' })
  workspaceRoot!: string;
}

/**
 * @description Row shape from raw SQL vector search over code_embeddings (snake_case columns plus a
 * computed `similarity`). Mirrors {@link PlanEmbeddingSearchRow} / {@link TaskEmbeddingSearchRow}.
 * `similarity` is `1 - (embedding <=> $query::vector)` returned as a string by pg.
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
