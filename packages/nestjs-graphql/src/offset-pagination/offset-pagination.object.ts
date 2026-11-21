import { Field, Int, ObjectType } from '@nestjs/graphql';

/**
 * @description The page metadata every offset-paged list result shares. Abstract, so it adds
 * no type of its own to the schema: a feature's `<Thing>Page` `extends` it and declares its own
 * typed `items` field, which keeps every envelope `{ items, totalCount, hasNextPage }` without
 * a generic result factory.
 * @public
 */
@ObjectType({ isAbstract: true })
export abstract class OffsetPageObject {
  @Field(() => Boolean, {
    description: `Whether rows remain after this page`,
  })
  hasNextPage!: boolean;

  @Field(() => Int, {
    description: `Rows across every page`,
  })
  totalCount!: number;
}
