/**
 * @description GraphQL shape of one stored cms fragment, as returned by the fragment mutations.
 */

import { Field, ObjectType } from '@nestjs/graphql';
import { OffsetPageObject } from '@openthrottle/nestjs-graphql';

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

@ObjectType({ description: `One page of live cms fragments, oldest first.` })
export class CmsFragmentListResult extends OffsetPageObject {
  @Field(() => [CmsFragmentObject])
  items!: CmsFragmentObject[];
}
