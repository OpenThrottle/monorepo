/**
 * @description GraphQL input for removeRepeatableJob mutation: queue name and repeatable job key (from repeatableJobs query).
 */

import { Field, InputType } from '@nestjs/graphql';

@InputType()
export class RemoveRepeatableJobInput {
  @Field(() => String, { description: 'Queue name (e.g. plans).' })
  queueName!: string;

  @Field(() => String, {
    description:
      'Repeatable job key (from repeatableJobs query). Required to remove a repeatable job.',
  })
  key!: string;
}
