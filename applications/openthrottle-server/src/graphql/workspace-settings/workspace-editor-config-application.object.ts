/**
 * @description GraphQL result for applying editor configuration to one repository/editor pair.
 */

import { Field, ID, ObjectType } from '@nestjs/graphql';
import { WorkspaceEditorIdEnum } from './workspace-editor-id.enum';

@ObjectType({
  description: `Result of applying editor configuration for one linked repository and editor.`,
})
class WorkspaceEditorConfigApplicationObject {
  @Field(() => ID)
  repositoryId!: string;

  @Field()
  filesystemPath!: string;

  @Field(() => WorkspaceEditorIdEnum)
  editor!: WorkspaceEditorIdEnum;

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
