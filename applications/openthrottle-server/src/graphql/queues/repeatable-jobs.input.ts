/**
 * @description GraphQL input for repeatableJobs query: queue name and optional range/sort (start, end, asc).
 */

import { Field, InputType, Int } from '@nestjs/graphql';

@InputType()
export class RepeatableJobsInput {
  @Field(() => String, { description: 'Queue name (e.g. plans).' })
  queueName!: string;

  @Field(() => Int, {
    description: 'Start index for pagination.',
    nullable: true,
  })
  start?: number;

  @Field(() => Int, {
    description: 'End index for pagination.',
    nullable: true,
  })
  end?: number;

  @Field(() => Boolean, {
    description: 'Sort repeatable jobs ascending.',
    nullable: true,
  })
  asc?: boolean;
}
