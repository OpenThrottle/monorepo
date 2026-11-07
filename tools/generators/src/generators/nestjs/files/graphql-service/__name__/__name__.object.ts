/**
 * @description GraphQL ObjectTypes for <%= name %>. Hand-written @ObjectType classes —
 * there is no Result / ListResult factory. Add fields as the feature grows.
 */

import { Field, Int, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class <%= singularPascal %>Object {
  @Field(() => Date)
  createdAt!: Date;

  @Field(() => String)
  id!: string;

  @Field(() => Date)
  updatedAt!: Date;

  // TODO: Add the fields needed for your application
}

/** @description ListResult-style envelope for <%= name %>. */
@ObjectType()
export class <%= singularPascal %>ListResult {
  @Field(() => [<%= singularPascal %>Object])
  items!: <%= singularPascal %>Object[];

  @Field(() => Int)
  totalCount!: number;
}
