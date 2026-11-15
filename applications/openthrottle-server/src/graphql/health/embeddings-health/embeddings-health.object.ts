import { Field, Int, ObjectType } from '@nestjs/graphql';

import { EmbeddingCoverageObject } from './embedding-coverage.object.ts';
import type { EmbeddingsHealthStatus } from './embeddings-health.types.ts';

@ObjectType({
  description: `Semantic-search embeddings health: the embedder's state, per-table coverage, stale rows and queue backlog.`,
})
export class EmbeddingsHealthObject {
  @Field(() => [EmbeddingCoverageObject], {
    description: `Coverage per embedded table.`,
  })
  coverage!: EmbeddingCoverageObject[];

  @Field(() => String, {
    description: `Why the embedder is not ok (missing weights, refused env, dimension mismatch, provider error), or null.`,
    nullable: true,
  })
  detail!: string | null;

  @Field(() => Int, {
    description: `Vector dimension of the configured model, or null when unconfigured.`,
    nullable: true,
  })
  dims!: number | null;

  @Field(() => String, {
    description: `Configured embedding model (recorded as embedding_model), or null when unconfigured.`,
    nullable: true,
  })
  model!: string | null;

  @Field(() => String, {
    description: `EMBEDDING_PROVIDER as configured: local | ollama (or a refused value).`,
  })
  provider!: string;

  @Field(() => Int, {
    description: `Embedding jobs waiting, delayed or active; null when Redis cannot be read.`,
    nullable: true,
  })
  queueDepth!: number | null;

  @Field(() => Int, {
    description: `Rows across all tables whose vector is stale.`,
  })
  staleCount!: number;

  @Field(() => String, {
    description: `ok | degraded (coverage below threshold, backlog above it, or provider erroring) | unconfigured (search is lexical-only).`,
  })
  status!: EmbeddingsHealthStatus;
}
