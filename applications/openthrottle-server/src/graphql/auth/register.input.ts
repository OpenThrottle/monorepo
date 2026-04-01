/**
 * @description GraphQL input for register mutation (email, password, optional githubUsername).
 */

import { Field, InputType } from '@nestjs/graphql';

@InputType()
export class RegisterInput {
  @Field(() => String, { description: 'User email (must be unique)' })
  email!: string;

  @Field(() => String, {
    description: 'User password (stored hashed with bcrypt)',
  })
  password!: string;

  @Field(() => String, {
    description:
      'GitHub username for display; defaults to email local part if omitted',
    nullable: true,
  })
  githubUsername?: string | null;
}
