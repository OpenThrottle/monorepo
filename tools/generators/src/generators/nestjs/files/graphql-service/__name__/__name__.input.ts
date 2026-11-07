/**
 * @description GraphQL input types for <%= name %>.
 */

import { Field, ID, InputType } from '@nestjs/graphql';

@InputType()
export class Get<%= singularPascal %>Input {
  @Field(() => ID, { description: `<%= singularPascal %> id` })
  id!: string;
}
