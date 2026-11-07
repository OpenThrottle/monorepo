/**
 * @description GraphQL input type for moving an eval run to a new status.
 */

import { Field, ID, InputType } from '@nestjs/graphql';

@InputType()
export class UpdateEvalRunStatusInput {
  @Field(() => ID, { description: `Run to update.` })
  runId!: string;

  @Field(() => String, {
    description: `New status: pending, running, usage_limited, completed, failed or cancelled.`,
  })
  status!: string;
}
