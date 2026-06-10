import { Column, CreateDateColumn, Entity, PrimaryColumn } from 'typeorm';
import { vectorTransformer } from '../../common/vector.transformer';

/**
 * @description TypeORM entity for the code_embeddings table (databases/migrations 052). Backs the
 * `@openthrottle/openthrottle-ide` engine's pgvector `VectorStore`. Unlike plan/task embeddings this
 * has no FK/metadata: the `id` is a content-derived chunk id (hashContent(path + content)) and the
 * store is scoped by `workspaceRoot`. Uses pgvector vector(1536).
 */
@Entity('code_embeddings')
export class CodeEmbedding {
  /** Content-derived chunk id (hashContent(path + content)); idempotent upsert key. */
  @PrimaryColumn({ name: 'id', type: 'text' })
  id!: string;

  @Column({ name: 'content', type: 'text' })
  content!: string;

  /** sha256 of the chunk content; lets the engine detect changed chunks. */
  @Column({ name: 'content_hash', type: 'text' })
  contentHash!: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp with time zone' })
  createdAt!: Date;

  @Column({
    name: 'embedding',
    transformer: vectorTransformer,
    type: 'vector',
  })
  embedding!: number[];

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
