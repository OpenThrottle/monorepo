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
    description: `False when no embeddings provider is configured; the UI renders its gated state.`,
  })
  available!: boolean;

  @Field(() => [CodeSearchMatch], {
    description: `Ranked code matches by similarity (empty when unavailable or no hits).`,
  })
  matches!: CodeSearchMatch[];
}

@ObjectType()
export class CodeIndexStatusObject {
  @Field(() => Int, {
    description: `Number of indexed code chunks for the repository (0 when not indexed).`,
  })
  indexedChunks!: number;

  @Field(() => String, { description: `Registered repository id.` })
  repositoryId!: string;

  @Field(() => String, {
    description: `One of: unavailable, indexing, ready, notIndexed.`,
  })
  status!: string;
}

@ObjectType()
export class IndexCodeRepositoryResult {
  @Field(() => String, { description: `Registered repository id.` })
  repositoryId!: string;

  @Field(() => String, {
    description: `Status after enqueue: indexing, or unavailable when no provider is configured.`,
  })
  status!: string;
}
