/**
 * @description Aggregate GraphQL type for Settings → Workspace loader.
 */

import { Field, ObjectType } from '@nestjs/graphql';

import { UserWorkspaceProfileObject } from './user-workspace-profile.object.ts';
import { WorkspaceLocalRepositoryObject } from './workspace-local-repository.object.ts';

@ObjectType({
  description: `Workspace settings for the authenticated user: profile and local repositories.`,
})
export class WorkspaceSettingsObject {
  @Field(() => UserWorkspaceProfileObject)
  profile!: UserWorkspaceProfileObject;

  @Field(() => [WorkspaceLocalRepositoryObject])
  localRepositories!: WorkspaceLocalRepositoryObject[];
}
