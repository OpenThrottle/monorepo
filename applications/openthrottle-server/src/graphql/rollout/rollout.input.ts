/**
 * @description GraphQL input types for rollout feature-flag mutations.
 */

import { Field, ID, InputType } from '@nestjs/graphql';

@InputType()
export class CreateRolloutFlagInput {
  @Field(() => String, {
    description: `Description of what the flag gates.`,
    nullable: true,
  })
  description!: string | null;

  @Field(() => Boolean, {
    defaultValue: false,
    description: `Master switch. Defaults to off.`,
  })
  enabled!: boolean;

  @Field(() => String, {
    description: `Unique flag key (kebab/dotted string). Must be unique.`,
  })
  key!: string;

  @Field(() => [String], {
    defaultValue: [],
    description: `RBAC role names to target. Empty => enabled for everyone.`,
  })
  targetRoles!: string[];
}

@InputType()
export class UpdateRolloutFlagInput {
  @Field(() => String, {
    description: `Description. Pass null to clear, omit to leave unchanged.`,
    nullable: true,
  })
  description!: string | null;

  @Field(() => Boolean, {
    description: `Master switch. Omit to leave unchanged.`,
    nullable: true,
  })
  enabled!: boolean | null;

  @Field(() => ID, { description: `Flag id to update` })
  id!: string;

  @Field(() => String, {
    description: `Flag key. Omit to leave unchanged; must stay unique.`,
    nullable: true,
  })
  key!: string | null;

  @Field(() => [String], {
    description: `RBAC role names to target. Omit to leave unchanged.`,
    nullable: true,
  })
  targetRoles!: string[] | null;
}
