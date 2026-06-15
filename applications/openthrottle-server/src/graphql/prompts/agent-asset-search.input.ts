/**
 * @description GraphQL input for semantic search over agent-asset (custom_prompt) embeddings.
 */

import { Field, ID, InputType, Int } from '@nestjs/graphql';
import { CustomPromptTypeEnum } from './custom-prompt.object';

@InputType({
  description:
    'Input for semantic search over agent-asset (custom_prompt) embeddings.',
})
export class AgentAssetSearchInput {
  @Field(() => String, {
    description: 'Text query to embed and search by vector similarity.',
  })
  query!: string;

  @Field(() => Int, {
    description: 'Max number of assets to return (default 20, max 50).',
    nullable: true,
  })
  limit!: number | null;

  @Field(() => [CustomPromptTypeEnum], {
    description:
      'Filter by prompt types (default: skills, rules, personas). Empty/null uses the default set.',
    nullable: true,
  })
  promptTypes!: CustomPromptTypeEnum[] | null;

  @Field(() => ID, {
    description: 'Filter by project id (multi-repo scoping).',
    nullable: true,
  })
  projectId!: string | null;
}
