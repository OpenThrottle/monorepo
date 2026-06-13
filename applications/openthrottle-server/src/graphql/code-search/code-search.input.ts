/**
 * @description GraphQL input for code semantic search over a registered repository's indexed code.
 */

import { Field, ID, InputType, Int } from '@nestjs/graphql';

@InputType()
export class CodeSemanticSearchInput {
  @Field(() => Int, {
    description: `Max number of matches to return (default 10).`,
    nullable: true,
  })
  limit!: number | null;

  @Field(() => String, {
    description: `Natural-language query to embed and search by vector similarity.`,
  })
  query!: string;

  @Field(() => ID, {
    description: `Registered WorkspaceLocalRepository id to search within.`,
  })
  repositoryId!: string;
}
