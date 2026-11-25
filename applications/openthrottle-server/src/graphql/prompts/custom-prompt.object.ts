/**
 * @description GraphQL ObjectType for CustomPrompt. Mirrors the custom_prompts entity from @openthrottle/nestjs-repositories-server.
 */

import { Field, ObjectType, registerEnumType } from '@nestjs/graphql';

export const CUSTOM_PROMPT_TYPE = {
  AGENTS: 'agents',
  COMMANDS: 'commands',
  PERSONAS: 'personas',
  PROMPTS: 'prompts',
  RULES: 'rules',
  SKILLS: 'skills',
} as const;

export type CustomPromptTypeKey = keyof typeof CUSTOM_PROMPT_TYPE;
export type CustomPromptTypeValue =
  (typeof CUSTOM_PROMPT_TYPE)[CustomPromptTypeKey];

registerEnumType(CUSTOM_PROMPT_TYPE, {
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

  @Field(() => CUSTOM_PROMPT_TYPE)
  promptType!: CustomPromptTypeValue;

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
