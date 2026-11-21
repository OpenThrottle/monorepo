/**
 * @description GraphQL input types for <%= name %>.
 */

import { Field, ID, InputType } from '@nestjs/graphql';
import { OffsetPaginationInput } from '@openthrottle/nestjs-graphql';

@InputType()
export class Get<%= singularPascal %>Input {
  @Field(() => ID, { description: `<%= singularPascal %> id` })
  id!: string;
}

/** @description `limit` / `offset` for listing <%= plural %>; validate with `assertPagination`. */
@InputType()
export class List<%= pluralPascal %>Input extends OffsetPaginationInput {}
