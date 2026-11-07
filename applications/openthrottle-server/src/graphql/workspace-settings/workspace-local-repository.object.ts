/**
 * @description GraphQL object for a user-registered local filesystem repository.
 */

import { Field, ID, ObjectType } from '@nestjs/graphql';

import { ProjectObject } from '../projects/project.object.ts';

@ObjectType({
  description: `A local filesystem checkout registered under the user's workspace settings.`,
})
export class WorkspaceLocalRepositoryObject {
  @Field(() => ID)
  id!: string;

  @Field(() => ID)
  userId!: string;

  @Field(() => String, {
    description: `Canonical absolute path on the server host.`,
  })
  filesystemPath!: string;

  @Field(() => String)
  displayName!: string;

  @Field(() => String, {
    description: `Optional git remote URL (origin).`,
    nullable: true,
  })
  gitRemoteUrl!: string | null;

  @Field(() => String, {
    description: `Branch the checkout is on per its last inspection scan; null until scanned or when HEAD is detached.`,
    nullable: true,
  })
  gitCurrentBranch!: string | null;

  @Field(() => String, {
    nullable: true,
  })
  gitDefaultBranch!: string | null;

  @Field(() => String, {
    description: `Checkout kind: 'primary' (the repository's main clone) or 'worktree' (a linked git worktree).`,
  })
  kind!: string;

  @Field(() => ID, {
    description: `Optional OpenThrottle project linked to this checkout.`,
    nullable: true,
  })
  projectId!: string | null;

  @Field(() => ProjectObject, { nullable: true })
  project?: ProjectObject | null;

  @Field(() => Date)
  createdAt!: Date;

  @Field(() => Date)
  updatedAt!: Date;
}
