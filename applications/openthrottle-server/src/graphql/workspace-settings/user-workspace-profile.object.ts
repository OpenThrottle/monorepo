/**
 * @description GraphQL object for per-user workspace profile (contact + editor prefs).
 */

import { Field, ID, ObjectType } from '@nestjs/graphql';
import { WorkspaceEditorIdEnum } from './workspace-editor-id.enum';

@ObjectType({
  description: `Per-user workspace profile: contact fields and enabled editors.`,
})
export class UserWorkspaceProfileObject {
  @Field(() => String, {
    description: `Display name for notifications and workspace attribution.`,
    nullable: true,
  })
  contactDisplayName!: string | null;

  @Field(() => String, {
    description: `Contact email for workspace profile (distinct from auth email).`,
    nullable: true,
  })
  contactEmail!: string | null;

  @Field(() => Date)
  createdAt!: Date;

  @Field(() => [WorkspaceEditorIdEnum], {
    description: `Editors the user wants OpenThrottle to configure in linked repos.`,
  })
  enabledEditors!: WorkspaceEditorIdEnum[];

  @Field(() => Date)
  updatedAt!: Date;

  @Field(() => ID)
  userId!: string;

  @Field(() => String, {
    description: `Directory every git worktree is created under; null uses the default sibling openthrottle-worktrees directory.`,
    nullable: true,
  })
  worktreeRoot!: string | null;
}
