/**
 * @description GraphQL input type for recording an eval run. The dataset version is read from the
 * dataset and the creator from the caller's identity; neither is an input.
 */

import { Field, Float, ID, InputType, Int } from '@nestjs/graphql';

@InputType()
export class RecordEvalRunInput {
  @Field(() => String, {
    description: `How the CLI is billed: api_key or subscription.`,
  })
  authMode!: string;

  @Field(() => Int, {
    description: `Token budget for the whole run. Omit for unlimited.`,
    nullable: true,
  })
  budgetTokens!: number | null;

  @Field(() => Float, {
    description: `Dollar budget for the whole run. Omit for unlimited.`,
    nullable: true,
  })
  budgetUsd!: number | null;

  @Field(() => ID, { description: `Dataset being run.` })
  datasetId!: string;

  @Field(() => String, { description: `Agent driver under test.` })
  driver!: string;

  @Field(() => String, {
    description: `Reasoning effort under test.`,
    nullable: true,
  })
  effort!: string | null;

  @Field(() => Int, { description: `Attempts per case, at least 1.` })
  k!: number;

  @Field(() => String, { description: `Model under test.`, nullable: true })
  model!: string | null;

  @Field(() => String, {
    description: `Content SHA of the prompt under test.`,
    nullable: true,
  })
  promptSha!: string | null;

  @Field(() => String, {
    description: `Content SHA of the skill under test.`,
    nullable: true,
  })
  skillSha!: string | null;

  @Field(() => String, {
    description: `Initial status: pending (default) or running.`,
    nullable: true,
  })
  status!: string | null;
}
