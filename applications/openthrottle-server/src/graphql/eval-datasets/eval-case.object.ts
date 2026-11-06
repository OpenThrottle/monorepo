/**
 * @description GraphQL ObjectType for an eval case. Mirrors the eval_cases entity from
 * @openthrottle/nestjs-repositories (migration 147); `input` and `gold` are exposed as JSON strings
 * because the schema has no JSON scalar.
 */

import { Field, ID, ObjectType } from '@nestjs/graphql';

@ObjectType('EvalCase', {
  description: `One input for the agent plus what a correct outcome looks like.`,
})
export class EvalCaseObject {
  @Field(() => Date, { description: `When the case was added.` })
  createdAt!: Date;

  @Field(() => ID, { description: `Dataset the case belongs to.` })
  datasetId!: string;

  @Field(() => String, {
    description: `What a correct outcome looks like, serialized with JSON.stringify.`,
  })
  goldJson!: string;

  @Field(() => ID, { description: `Case id.` })
  id!: string;

  @Field(() => String, {
    description: `What the agent is asked to do, serialized with JSON.stringify.`,
  })
  inputJson!: string;

  @Field(() => ID, {
    description: `The trajectory (a real failure) the case was created from. Null for hand-written cases or a pruned trajectory.`,
    nullable: true,
  })
  sourceTrajectoryId!: string | null;

  @Field(() => String, {
    description: `Which side of the dataset the case sits on: dev or test.`,
  })
  split!: string;
}
