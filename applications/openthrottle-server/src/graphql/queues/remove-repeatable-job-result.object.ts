/**
 * @description GraphQL result object for removeRepeatableJob mutation. success true when removed, or success false with error.
 */

import { Field, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class RemoveRepeatableJobResultObject {
  @Field(() => Boolean, {
    description: 'Whether the repeatable job was removed.',
  })
  success!: boolean;

  @Field(() => String, {
    description: 'Error message when success is false.',
    nullable: true,
  })
  error!: string | null;
}
