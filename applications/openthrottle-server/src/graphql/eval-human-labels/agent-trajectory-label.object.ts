/**
 * @description GraphQL ObjectType for a human label on an agent trajectory. Mirrors the
 * eval_human_labels entity from @openthrottle/nestjs-repositories (migration 146).
 */

import { Field, ID, ObjectType } from '@nestjs/graphql';

@ObjectType('AgentTrajectoryLabel', {
  description: `One rater's verdict on one agent trajectory. Verdicts are the ground truth LLM judges are calibrated against; notes and failure types are error-analysis coding material.`,
})
export class AgentTrajectoryLabelObject {
  @Field(() => Date, {
    description: `When the rater first labelled the trajectory.`,
  })
  createdAt!: Date;

  @Field(() => String, {
    description: `Free-text failure category. Null when not given.`,
    nullable: true,
  })
  failureType!: string | null;

  @Field(() => ID, { description: `Label id.` })
  id!: string;

  @Field(() => String, {
    description: `Free-text observation about the trajectory. Null when not given.`,
    nullable: true,
  })
  note!: string | null;

  @Field(() => String, {
    description: `Who recorded the label: the GitHub username of the caller, stamped server-side.`,
  })
  rater!: string;

  @Field(() => ID, { description: `Trajectory the label is about.` })
  trajectoryId!: string;

  @Field(() => Date, {
    description: `When the rater last replaced their label.`,
  })
  updatedAt!: Date;

  @Field(() => String, {
    description: `The rater's judgement: pass or fail.`,
  })
  verdict!: string;
}
