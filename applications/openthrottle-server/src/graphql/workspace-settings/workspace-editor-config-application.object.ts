/**
 * @description GraphQL result for applying editor configuration to one repository/editor pair.
 */

import { Field, ID, ObjectType } from '@nestjs/graphql';

import type { WorkspaceEditorIdValue } from './workspace-editor-id.enum.ts';
import { WORKSPACE_EDITOR_ID } from './workspace-editor-id.enum.ts';

@ObjectType({
  description: `Result of applying editor configuration for one linked repository and editor.`,
})
class WorkspaceEditorConfigApplicationObject {
  @Field(() => ID)
  repositoryId!: string;

  @Field()
  filesystemPath!: string;

  @Field(() => WORKSPACE_EDITOR_ID)
  editor!: WorkspaceEditorIdValue;

  @Field(() => [String])
  filesWritten!: string[];

  @Field(() => [String])
  warnings!: string[];
}

@ObjectType({
  description: `Aggregate result of applying workspace editor configuration.`,
})
export class ApplyWorkspaceEditorConfigurationResultObject {
  @Field(() => [WorkspaceEditorConfigApplicationObject])
  applications!: WorkspaceEditorConfigApplicationObject[];
}
