/**
 * @description GraphQL input for queue query: name and optional pagination/filter (limit, offset, asc, states).
 */

import { Field, InputType, Int } from '@nestjs/graphql';

@InputType()
export class QueueDetailsInput {
  @Field(() => String, { description: 'Queue name (e.g. plans).' })
  name!: string;

  @Field(() => Int, {
    description: 'Max jobs to return. Omit or 0 to skip loading jobs.',
    nullable: true,
  })
  limit?: number;

  @Field(() => Int, {
    description: 'Offset for job pagination.',
    nullable: true,
  })
  offset?: number;

  @Field(() => Boolean, {
    description: 'Sort jobs ascending by timestamp.',
    nullable: true,
  })
  asc?: boolean;

  @Field(() => [String], {
    description:
      'Job states to include (e.g. waiting, active, completed, failed, delayed). Defaults to all if empty.',
    nullable: true,
  })
  states?: string[];
}
