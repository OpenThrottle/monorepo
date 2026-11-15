/**
 * @description GraphQL input for search over plans, tasks and documentation.
 */

import { Field, InputType, Int } from '@nestjs/graphql';

@InputType()
export class SearchInput {
  @Field(() => Int, {
    description: `Max number of chunks to return (default 20).`,
    nullable: true,
  })
  limit!: number | null;

  @Field(() => String, {
    description: `Requested ranking: "hybrid" (default; vector and full-text merged by reciprocal rank fusion) or "semantic" (vector similarity only). The full-text fallback still applies when the embedder cannot answer.`,
    nullable: true,
  })
  mode!: string | null;

  @Field(() => Int, {
    description: `Number of ranked chunks to skip before returning \`limit\` (default 0). Pages are slices of one ranking of at most 100 candidates, so offsets past \`total\` return no chunks.`,
    nullable: true,
  })
  offset!: number | null;

  @Field(() => String, {
    description: `Text query to search for.`,
  })
  query!: string;
}
