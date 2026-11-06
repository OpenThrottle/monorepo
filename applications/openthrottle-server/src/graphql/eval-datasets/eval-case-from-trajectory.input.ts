/**
 * @description GraphQL input type for one case created from a recorded trajectory.
 */

import { Field, ID, InputType } from '@nestjs/graphql';

@InputType()
export class EvalCaseFromTrajectoryInput {
  @Field(() => String, {
    description: `What a correct outcome looks like, as a JSON string.`,
  })
  goldJson!: string;

  @Field(() => String, {
    description: `What the agent is asked to do, as a JSON string. Omit to derive an object from the trajectory (id, task id, plan run id, driver, model).`,
    nullable: true,
  })
  inputJson!: string | null;

  @Field(() => String, {
    description: `Which side of the dataset the case sits on: dev or test.`,
  })
  split!: string;

  @Field(() => ID, {
    description: `The recorded trajectory (a real failure) the case is created from.`,
  })
  trajectoryId!: string;
}
