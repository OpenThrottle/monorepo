/**
 * @description GraphQL input types for user mutations. Replaces many individual @Args with a single input object.
 */

import { Field, ID, InputType } from '@nestjs/graphql';

@InputType()
export class CreateUserInput {
  @Field(() => String, { nullable: true })
  email!: string | null;

  @Field(() => String, {
    description: `GitHub username (e.g. visormatt)`,
  })
  githubUsername!: string;
}

@InputType()
export class UpdateUserInput {
  @Field(() => Date, {
    description: `Set to null to re-enable a disabled user; omit to leave unchanged.`,
    nullable: true,
  })
  disabledAt!: Date | null | undefined;

  @Field(() => String, { nullable: true })
  email!: string | null;

  @Field(() => String, {
    description: `GitHub username. Pass null to leave unchanged.`,
    nullable: true,
  })
  githubUsername!: string | null;

  @Field(() => ID, { description: `User id to update` })
  id!: string;
}
