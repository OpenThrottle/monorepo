/**
 * @description GraphQL ObjectType for CustomPrompt. Mirrors the custom_prompts entity from @openthrottle/nestjs-repositories.
 */

import { Field, ObjectType, registerEnumType } from '@nestjs/graphql';

export enum CustomPromptTypeEnum {
  AGENTS = 'agents',
  COMMANDS = 'commands',
  PERSONAS = 'personas',
  PROMPTS = 'prompts',
  RULES = 'rules',
  SKILLS = 'skills',
}

registerEnumType(CustomPromptTypeEnum, {
  description: 'Type of custom prompt document',
  name: 'CustomPromptType',
});

@ObjectType({
  description: 'A custom prompt document for AI workflow customization',
})
export class CustomPromptObject {
  @Field(() => String)
  id!: string;

  @Field(() => Date)
  createdAt!: Date;

  @Field(() => Date)
  updatedAt!: Date;

  @Field(() => String)
  title!: string;

  @Field(() => String)
  content!: string;

  @Field(() => String, { nullable: true })
  description!: string | null;

  @Field(() => CustomPromptTypeEnum)
  promptType!: CustomPromptTypeEnum;

  @Field(() => [String])
  labels!: string[];

  @Field(() => String, { nullable: true })
  filePath!: string | null;

  @Field(() => String, { nullable: true })
  userId!: string | null;

  @Field(() => String, { nullable: true })
  projectId!: string | null;

  @Field(() => Date, { nullable: true })
  deletedAt!: Date | null;
}
