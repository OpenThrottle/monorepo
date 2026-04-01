/**
 * @description GraphQL object returned by register mutation (user id, email, and JWT for immediate use).
 */

import { Field, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class RegisterResultObject {
  @Field(() => String, { description: 'Created user id (UUID)' })
  id!: string;

  @Field(() => String, { description: 'Registered email' })
  email!: string;

  @Field(() => String, {
    description:
      'JWT access token so the client can stay logged in without calling login',
  })
  accessToken!: string;
}
