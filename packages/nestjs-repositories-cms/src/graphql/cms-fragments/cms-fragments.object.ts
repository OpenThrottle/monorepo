/**
 * @description GraphQL shape of one stored cms fragment, as returned by the fragment mutations.
 */

import { Field, ObjectType } from '@nestjs/graphql';

@ObjectType({
  description: `A stored cms fragment: a named, typed piece of content whose properties conform to its pinned schema.`,
})
export class CmsFragmentObject {
  @Field(() => Date)
  createdAt!: Date;

  @Field(() => Boolean)
  isSystem!: boolean;

  @Field(() => String)
  name!: string;

  @Field(() => String, {
    description: `The fragment's properties as a JSON object string.`,
  })
  propertiesJson!: string;

  @Field(() => String, {
    description: `The schema version the properties are validated against; fixed at creation.`,
  })
  schemaUuid!: string;

  @Field(() => String)
  typename!: string;

  @Field(() => Date)
  updatedAt!: Date;

  @Field(() => String)
  uuid!: string;
}
