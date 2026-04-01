/**
 * @description GraphQL object returned by login mutation (JWT access token).
 */

import { Field, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class LoginResultObject {
  @Field(() => String, {
    description: 'JWT access token to send in Authorization header or cookie',
  })
  accessToken!: string;
}
