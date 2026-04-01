/**
 * @description GraphQL input types for commit-link queries. Single input arg per operation for consistency with other resolvers.
 */

import { Field, ID, InputType } from '@nestjs/graphql';

@InputType()
export class GetCommitLinkInput {
  @Field(() => ID, { description: `Commit link id` })
  id!: string;
}

@InputType()
export class CommitLinksByPlanIdInput {
  @Field(() => ID, { description: `Plan id to list commit links for` })
  planId!: string;
}

@InputType()
export class CommitLinksByTaskIdInput {
  @Field(() => ID, { description: `Task id to list commit links for` })
  taskId!: string;
}

/**
 * @description Reserved for a future linkCommit mutation. Use when adding mutation to associate a git commit with a plan (and optional task).
 */
@InputType()
export class LinkCommitInput {
  @Field(() => ID, { description: `Plan id to link the commit to` })
  planId!: string;

  @Field(() => String, { description: `Repository (e.g. owner/repo)` })
  repo!: string;

  @Field(() => String, {
    description: `Git commit SHA (squash commit after PR merge)`,
  })
  sha!: string;

  @Field(() => ID, {
    description: `Optional task id to link the commit to`,
    nullable: true,
  })
  taskId!: string | null;

  @Field(() => String, {
    description: `Optional commit or PR message`,
    nullable: true,
  })
  message!: string | null;
}
