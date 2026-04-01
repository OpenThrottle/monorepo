/**
 * @description GraphQL input types for custom prompt mutations.
 */

import { Field, ID, InputType } from '@nestjs/graphql';
import { CustomPromptTypeEnum } from './custom-prompt.object';

@InputType({ description: 'Input for creating a new custom prompt' })
export class CreateCustomPromptInput {
  @Field(() => String)
  title!: string;

  @Field(() => String)
  content!: string;

  @Field(() => String, { nullable: true })
  description!: string | null;

  @Field(() => CustomPromptTypeEnum)
  promptType!: CustomPromptTypeEnum;

  @Field(() => [String], { defaultValue: [] })
  labels!: string[];

  @Field(() => String, {
    description:
      'File path relative to workspace root for file system persistence',
    nullable: true,
  })
  filePath!: string | null;

  @Field(() => ID, { nullable: true })
  userId!: string | null;

  @Field(() => ID, { nullable: true })
  projectId!: string | null;

  @Field(() => Boolean, {
    defaultValue: false,
    description: 'Write content to the file system at filePath if provided',
  })
  writeToFileSystem!: boolean;
}

@InputType({ description: 'Input for updating an existing custom prompt' })
export class UpdateCustomPromptInput {
  @Field(() => ID, { description: 'Custom prompt id to update' })
  id!: string;

  @Field(() => String, { nullable: true })
  title!: string | null;

  @Field(() => String, { nullable: true })
  content!: string | null;

  @Field(() => String, { nullable: true })
  description!: string | null;

  @Field(() => CustomPromptTypeEnum, { nullable: true })
  promptType!: CustomPromptTypeEnum | null;

  @Field(() => [String], { nullable: true })
  labels!: string[] | null;

  @Field(() => String, { nullable: true })
  filePath!: string | null;

  @Field(() => ID, { nullable: true })
  userId!: string | null;

  @Field(() => ID, { nullable: true })
  projectId!: string | null;

  @Field(() => Boolean, {
    defaultValue: false,
    description: 'Write content to the file system at filePath if provided',
  })
  writeToFileSystem!: boolean;
}

@InputType({
  description: 'Input for listing custom prompts with optional filters',
})
export class ListCustomPromptsInput {
  @Field(() => CustomPromptTypeEnum, {
    description: 'Filter by prompt type',
    nullable: true,
  })
  promptType!: CustomPromptTypeEnum | null;

  @Field(() => [String], {
    description: 'Filter by labels (matches any)',
    nullable: true,
  })
  labels!: string[] | null;

  @Field(() => String, {
    description: 'Search by title (case-insensitive partial match)',
    nullable: true,
  })
  search!: string | null;

  @Field(() => ID, {
    description: 'Filter by project ID',
    nullable: true,
  })
  projectId!: string | null;

  @Field(() => ID, {
    description: 'Filter by user ID',
    nullable: true,
  })
  userId!: string | null;

  @Field(() => Boolean, {
    defaultValue: false,
    description: 'Include soft-deleted prompts',
  })
  includeDeleted!: boolean;
}
