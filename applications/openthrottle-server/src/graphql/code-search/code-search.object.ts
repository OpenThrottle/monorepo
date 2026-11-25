/**
 * @description GraphQL ObjectTypes for code semantic search: a match (path + line range + score),
 * the search result envelope (with `available` provider gate), the index status, and the enqueue
 * result. Consumed by the /ide Semantic tab.
 */

import { Field, Float, Int, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class CodeSearchMatch {
  @Field(() => String, { description: `Raw source text of the matched chunk.` })
  content!: string;

  @Field(() => Int, {
    description: `1-based inclusive last line of the match.`,
  })
  endLine!: number;

  @Field(() => String, {
    description: `Workspace-relative POSIX path of the matched file.`,
  })
  path!: string;

  @Field(() => Float, {
    description: `Similarity score (0–1, higher is more relevant).`,
  })
  score!: number;

  @Field(() => Int, { description: `1-based first line of the match.` })
  startLine!: number;
}

@ObjectType()
export class CodeSemanticSearchResult {
  @Field(() => Boolean, {
    description: `False when no embeddings provider is configured, or a hosted one is not opted in for code; the UI renders its gated state.`,
  })
  available!: boolean;

  @Field(() => [CodeSearchMatch], {
    description: `Ranked code matches by similarity (empty when unavailable or no hits): the page selected by \`offset\` and \`limit\`.`,
  })
  matches!: CodeSearchMatch[];

  @Field(() => Int, {
    description: `How many ranked candidates the query matched, capped at 50. Page through them with \`offset\` and \`limit\`.`,
  })
  total!: number;
}

@ObjectType()
export class CodeIndexStatusObject {
  @Field(() => String, {
    description: `Why the last code-index job failed, when status is failed; null otherwise.`,
    nullable: true,
  })
  failedReason!: string | null;

  @Field(() => Int, {
    description: `Number of indexed code chunks for the repository (0 when not indexed).`,
  })
  indexedChunks!: number;

  @Field(() => String, { description: `Registered repository id.` })
  repositoryId!: string;

  @Field(() => String, {
    description: `One of: unavailable, hostedOptInRequired, indexing, failed, ready, notIndexed. failed means the last index job failed (see failedReason) and any indexed chunks are partial. hostedOptInRequired means the embedder is hosted (openai/gemini) and CODE_EMBEDDINGS_ALLOW_HOSTED is not true, so code is not indexed.`,
  })
  status!: string;
}

@ObjectType()
export class IndexCodeRepositoryResult {
  @Field(() => String, { description: `Registered repository id.` })
  repositoryId!: string;

  @Field(() => String, {
    description: `Status after enqueue: indexing; unavailable when no provider is configured; hostedOptInRequired (nothing enqueued) when a hosted provider is not opted in for code.`,
  })
  status!: string;
}
