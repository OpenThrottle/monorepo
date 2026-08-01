/**
 * @description GraphQL input for reversible queue controls (pauseQueue / resumeQueue): queue name only.
 */

import { Field, InputType } from '@nestjs/graphql';

@InputType()
export class QueueControlInput {
  @Field(() => String, { description: 'Queue name (e.g. plans).' })
  queueName!: string;
}
