/**
 * @description GraphQL input for code semantic search over a registered repository's indexed code.
 * Name the repository with `repositoryId`, or let the server resolve it from `workspacePath` — a
 * hint resolved against the caller's own registered checkouts, never a path the server reads.
 */

import { Field, ID, InputType, Int } from '@nestjs/graphql';

@InputType()
export class CodeSemanticSearchInput {
  @Field(() => Int, {
    description: `Max number of matches to return (default 10).`,
    nullable: true,
  })
  limit!: number | null;

  @Field(() => Int, {
    description: `Number of ranked matches to skip before returning \`limit\` (default 0). Pages are slices of one ranking of at most 50 candidates, so offsets past \`total\` return no matches.`,
    nullable: true,
  })
  offset!: number | null;

  @Field(() => String, {
    description: `Natural-language query to embed and search by vector similarity.`,
  })
  query!: string;

  @Field(() => ID, {
    description: `Registered WorkspaceLocalRepository id to search within. Takes precedence over workspacePath; one of the two is required.`,
    nullable: true,
  })
  repositoryId!: string | null;

  @Field(() => String, {
    description: `Absolute path the caller is working in (e.g. an MCP client's cwd). Resolved to the registered repository whose checkout contains it; ignored when repositoryId is set.`,
    nullable: true,
  })
  workspacePath!: string | null;
}
