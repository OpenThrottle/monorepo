/**
 * @description GraphQL input for login mutation (email/password).
 */

import { Field, InputType } from '@nestjs/graphql';

@InputType()
export class LoginInput {
  @Field(() => String, { description: 'User email' })
  email!: string;

  @Field(() => String, { description: 'User password' })
  password!: string;
}
