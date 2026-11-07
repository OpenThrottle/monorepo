/**
 * @description GraphQL ObjectType for an eval run. Mirrors the eval_runs entity from
 * @openthrottle/nestjs-repositories (migration 147). `trials` is a field resolver.
 */

import { Field, Float, ID, Int, ObjectType } from '@nestjs/graphql';

@ObjectType('EvalRun', {
  description: `One configuration (driver, model, effort, prompt and skill SHAs, auth mode) executed over a dataset, k attempts per case.`,
})
export class EvalRunObject {
  @Field(() => String, {
    description: `How the CLI was billed: api_key or subscription.`,
  })
  authMode!: string;

  @Field(() => Int, {
    description: `Token budget for the whole run. Null means unlimited.`,
    nullable: true,
  })
  budgetTokens!: number | null;

  @Field(() => Float, {
    description: `Dollar budget for the whole run. Null means unlimited.`,
    nullable: true,
  })
  budgetUsd!: number | null;

  @Field(() => Date, { description: `When the run was recorded.` })
  createdAt!: Date;

  @Field(() => String, {
    description: `Who started the run: the GitHub username of the caller, stamped server-side.`,
  })
  createdBy!: string;

  @Field(() => ID, { description: `Dataset that was run.` })
  datasetId!: string;

  @Field(() => Int, { description: `The dataset version the run executed.` })
  datasetVersion!: number;

  @Field(() => String, { description: `Agent driver under test.` })
  driver!: string;

  @Field(() => String, {
    description: `Reasoning effort under test. Null when the driver default was used.`,
    nullable: true,
  })
  effort!: string | null;

  @Field(() => Date, {
    description: `When the run reached a terminal status. Null while unfinished.`,
    nullable: true,
  })
  finishedAt!: Date | null;

  @Field(() => ID, { description: `Run id.` })
  id!: string;

  @Field(() => Int, { description: `Attempts per case.` })
  k!: number;

  @Field(() => String, {
    description: `Model under test. Null when the driver default was used.`,
    nullable: true,
  })
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

  @Field(() => Date, {
    description: `When the run began executing. Null while pending.`,
    nullable: true,
  })
  startedAt!: Date | null;

  @Field(() => String, {
    description: `Run lifecycle: pending, running, usage_limited (a resumable pause), completed, failed or cancelled.`,
  })
  status!: string;
}
