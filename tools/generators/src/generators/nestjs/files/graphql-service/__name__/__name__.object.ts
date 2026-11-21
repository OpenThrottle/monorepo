/**
 * @description GraphQL ObjectTypes for <%= name %>. Hand-written @ObjectType classes —
 * there is no Result / ListResult factory. Add fields as the feature grows. The list envelope
 * extends the shared `OffsetPageObject`, so every offset-paged list reads
 * `{ items, totalCount, hasNextPage }`.
 */

import { Field, ObjectType } from '@nestjs/graphql';
import { OffsetPageObject } from '@openthrottle/nestjs-graphql';

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

/** @description One page of <%= plural %>; `totalCount` and `hasNextPage` come from `OffsetPageObject`. */
@ObjectType()
export class <%= singularPascal %>ListResult extends OffsetPageObject {
  @Field(() => [<%= singularPascal %>Object])
  items!: <%= singularPascal %>Object[];
}
