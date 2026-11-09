/**
 * @description GraphQL inputs for updateUserPreferences. Values are validated by
 * UserPreferencesService, not here.
 */

import { Field, InputType } from '@nestjs/graphql';

import { WorkspaceEditorIdEnum } from '../workspace-settings/workspace-editor-id.enum.ts';

@InputType({
  description: `A default agent. Backend and model are required together; effort may be null.`,
})
export class UserPreferencesAgentInput {
  @Field(() => String, { description: `Agent CLI driver id.` })
  backend!: string;

  @Field(() => String, {
    description: `Reasoning effort level, or null for the backend's own default.`,
    nullable: true,
  })
  effort?: string | null;

  @Field(() => String, { description: `Driver-specific model id.` })
  model!: string;
}

@InputType({
  description: `A partial update: an omitted field is left unchanged and an explicit null clears it.`,
})
export class UpdateUserPreferencesInput {
  @Field(() => UserPreferencesAgentInput, { nullable: true })
  defaultAgent?: UserPreferencesAgentInput | null;

  @Field(() => WorkspaceEditorIdEnum, { nullable: true })
  defaultEditor?: WorkspaceEditorIdEnum | null;
}
