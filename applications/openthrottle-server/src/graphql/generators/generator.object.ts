/**
 * @description GraphQL ObjectTypes for NX generators (list and detail).
 */

import { Field, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class GeneratorObject {
  @Field(() => String)
  description!: string;

  @Field(() => String)
  name!: string;
}

@ObjectType()
export class GeneratorDetailObject {
  @Field(() => String)
  description!: string;

  @Field(() => String)
  name!: string;

  /** JSON string of generator schema, or null if not available. */
  @Field(() => String, { nullable: true })
  schemaJson!: string | null;
}
