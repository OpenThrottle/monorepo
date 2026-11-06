/**
 * @description GraphQL input type for labelling an agent trajectory. The rater is never an input:
 * it is derived from the caller's identity.
 */

import { Field, ID, InputType } from '@nestjs/graphql';

@InputType()
export class LabelAgentTrajectoryInput {
  @Field(() => String, {
    description: `Free-text failure category, for example wrong-file. Blank is stored as null.`,
    nullable: true,
  })
  failureType!: string | null;

  @Field(() => String, {
    description: `Free-text observation about the trajectory, at most 4000 characters. Blank is stored as null.`,
    nullable: true,
  })
  note!: string | null;

  @Field(() => ID, { description: `Trajectory being labelled.` })
  trajectoryId!: string;

  @Field(() => String, {
    description: `The verdict: pass or fail. Re-labelling replaces your own earlier label.`,
  })
  verdict!: string;
}
