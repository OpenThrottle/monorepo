/**
 * @description GraphQL shapes for cms schemas: the versioned JSON Schema a fragment typename's
 * properties validate against.
 */

import { Field, Int, ObjectType } from '@nestjs/graphql';

@ObjectType({
  description: `One version of the JSON Schema for a cms fragment typename.`,
})
export class CmsSchemaObject {
  @Field(() => Date)
  createdAt!: Date;

  @Field(() => String, {
    description: `The JSON Schema as a JSON object string (repo convention: no JSON scalar).`,
  })
  jsonSchemaJson!: string;

  @Field(() => String, {
    description: `ACTIVE | DISABLED | DRAFT. At most one version per typename is meant to be ACTIVE.`,
    nullable: true,
  })
  status!: string | null;

  @Field(() => String)
  typename!: string;

  @Field(() => Date)
  updatedAt!: Date;

  @Field(() => String)
  uuid!: string;

  @Field(() => String, {
    description: `Content-hash version of the schema (16 hex characters for generated schemas).`,
  })
  version!: string;
}

@ObjectType({
  description: `One page of live cms schemas, newest first, then by typename.`,
})
export class CmsSchemaListResult {
  @Field(() => Boolean)
  hasNextPage!: boolean;

  @Field(() => [CmsSchemaObject])
  items!: CmsSchemaObject[];

  @Field(() => Int)
  totalCount!: number;
}
