/**
 * @description GraphQL object returned by signout mutation.
 */

import { Field, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class SignoutResultObject {
  @Field(() => Boolean, {
    description: 'Whether signout completed successfully',
  })
  success!: boolean;
}
