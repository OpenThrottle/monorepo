import { Field, InputType, Int } from '@nestjs/graphql';

/**
 * @description The `limit` / `offset` pair every offset-paged list input shares. Abstract, so
 * it adds no type of its own to the schema: a feature input `extends` it and GraphQL flattens
 * the two fields into that input. Validate it at the resolver with `assertPagination`.
 * @public
 */
@InputType({ isAbstract: true })
export abstract class OffsetPaginationInput {
  @Field(() => Int, {
    description: `Page size. Omitted means the list's default; out of range is rejected`,
    nullable: true,
  })
  limit?: number | null;

  @Field(() => Int, {
    description: `Rows to skip, 0 or more. Omitted means 0`,
    nullable: true,
  })
  offset?: number | null;
}
