/**
 * @description Input for applying workspace editor configuration to linked repositories.
 */

import { Field, ID, InputType } from '@nestjs/graphql';

@InputType({
  description: `Optional filter: apply only to these local repository ids. Omit to apply to all linked repos.`,
})
export class ApplyWorkspaceEditorConfigurationInput {
  @Field(() => [ID], {
    description: `When set, only these repositories receive editor configuration.`,
    nullable: true,
  })
  repositoryIds?: string[] | null;
}
