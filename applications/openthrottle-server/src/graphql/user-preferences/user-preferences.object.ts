/**
 * @description GraphQL types for the authenticated user's preferences (migration 153).
 */

import { Field, ObjectType } from '@nestjs/graphql';

import { WorkspaceEditorIdEnum } from '../workspace-settings/workspace-editor-id.enum.ts';

@ObjectType({
  description: `The user's default agent. Backend and model always travel together, so a half-set agent cannot be represented.`,
})
export class UserPreferencesAgentObject {
  @Field(() => String, {
    description: `Agent CLI driver id (e.g. claude, cursor, codex).`,
  })
  backend!: string;

  @Field(() => String, {
    description: `Reasoning effort level, or null for the backend's own default.`,
    nullable: true,
  })
  effort!: string | null;

  @Field(() => String, {
    description: `Driver-specific model id, opaque to the server.`,
  })
  model!: string;
}

@ObjectType({
  description: `Per-user preferences. A null field means "use the system default".`,
})
export class UserPreferencesObject {
  @Field(() => UserPreferencesAgentObject, {
    description: `Default agent (backend + model + effort), or null for the system default.`,
    nullable: true,
  })
  defaultAgent!: UserPreferencesAgentObject | null;

  @Field(() => WorkspaceEditorIdEnum, {
    description: `Default editor for open-in-editor links, or null for the system default (VS Code).`,
    nullable: true,
  })
  defaultEditor!: WorkspaceEditorIdEnum | null;
}
