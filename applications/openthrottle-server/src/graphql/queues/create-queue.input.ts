/**
 * @description GraphQL input for createQueue mutation: queue name.
 */

import { Field, InputType } from '@nestjs/graphql';

@InputType()
export class CreateQueueInput {
  @Field(() => String, { description: 'Name of the queue to create.' })
  name!: string;
}
