/**
 * @description GraphQL input type for creating an eval dataset from recorded trajectories. The
 * creator is never an input: it is derived from the caller's identity.
 */

import { Field, ID, InputType } from '@nestjs/graphql';

import { EvalCaseFromTrajectoryInput } from './eval-case-from-trajectory.input.ts';

@InputType()
export class CreateEvalDatasetFromTrajectoriesInput {
  @Field(() => [EvalCaseFromTrajectoryInput], {
    description: `The cases, one per selected trajectory. At least one.`,
  })
  cases!: EvalCaseFromTrajectoryInput[];

  @Field(() => String, {
    description: `Free-text description of what the dataset covers. Blank is stored as null.`,
    nullable: true,
  })
  description!: string | null;

  @Field(() => String, {
    description: `Dataset name. Re-using a name in the same repository creates the next version.`,
  })
  name!: string;

  @Field(() => ID, { description: `Repository the dataset belongs to.` })
  repositoryId!: string;

  @Field(() => String, {
    description: `What the dataset evaluates: plan_task, skill or mcp_tool_selection.`,
  })
  target!: string;
}
