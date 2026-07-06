/**
 * @description GraphQL inputs for workspace settings mutations.
 */

import { Field, ID, InputType } from '@nestjs/graphql';
import { WorkspaceEditorIdEnum } from './workspace-editor-id.enum';

@InputType()
export class UpdateWorkspaceProfileInput {
  @Field(() => String, { nullable: true })
  contactDisplayName?: string | null;

  @Field(() => String, { nullable: true })
  contactEmail?: string | null;

  @Field(() => [WorkspaceEditorIdEnum], { nullable: true })
  enabledEditors?: WorkspaceEditorIdEnum[] | null;
}

@InputType()
export class CreateWorkspaceLocalRepositoryInput {
  @Field(() => String, {
    description: `Absolute path to an existing directory on the server host.`,
  })
  filesystemPath!: string;

  @Field(() => String)
  displayName!: string;

  @Field(() => String, { nullable: true })
  gitRemoteUrl?: string | null;

  @Field(() => String, { nullable: true })
  gitDefaultBranch?: string | null;

  @Field(() => ID, { nullable: true })
  projectId?: string | null;
}

@InputType()
export class UpdateWorkspaceLocalRepositoryInput {
  @Field(() => ID)
  id!: string;

  @Field(() => String, { nullable: true })
  displayName?: string | null;

  @Field(() => String, { nullable: true })
  gitRemoteUrl?: string | null;

  @Field(() => String, { nullable: true })
  gitDefaultBranch?: string | null;

  @Field(() => ID, { nullable: true })
  projectId?: string | null;
}

@InputType()
export class SetWorkspaceLocalRepositoryProjectInput {
  @Field(() => ID)
  id!: string;

  @Field(() => ID, {
    description: `Cortex project id, or null to clear the link.`,
    nullable: true,
  })
  projectId?: string | null;
}
