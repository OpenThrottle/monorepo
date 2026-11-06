/**
 * @description GraphQL ObjectType for an eval dataset. Mirrors the eval_datasets entity from
 * @openthrottle/nestjs-repositories (migration 147). `cases` is a field resolver.
 */

import { Field, ID, Int, ObjectType } from '@nestjs/graphql';

@ObjectType('EvalDataset', {
  description: `A versioned, per-repository set of eval cases.`,
})
export class EvalDatasetObject {
  @Field(() => Date, { description: `When the dataset version was created.` })
  createdAt!: Date;

  @Field(() => String, {
    description: `Who created the dataset: the GitHub username of the caller, stamped server-side.`,
  })
  createdBy!: string;

  @Field(() => String, {
    description: `Free-text description of what the dataset covers.`,
    nullable: true,
  })
  description!: string | null;

  @Field(() => ID, { description: `Dataset id.` })
  id!: string;

  @Field(() => String, {
    description: `Dataset name, unique per repository together with version.`,
  })
  name!: string;

  @Field(() => ID, { description: `Repository the dataset belongs to.` })
  repositoryId!: string;

  @Field(() => String, {
    description: `What the dataset evaluates: plan_task, skill or mcp_tool_selection.`,
  })
  target!: string;

  @Field(() => Date, { description: `When the dataset row last changed.` })
  updatedAt!: Date;

  @Field(() => Int, {
    description: `Dataset version, starting at 1. Re-creating a name bumps it.`,
  })
  version!: number;
}
