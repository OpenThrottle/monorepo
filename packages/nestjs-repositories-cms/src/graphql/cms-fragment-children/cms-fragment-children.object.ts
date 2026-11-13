/**
 * @description GraphQL shape of one parent → child edge between cms fragments.
 */

import { Field, Int, ObjectType } from '@nestjs/graphql';

@ObjectType({
  description: `One parent → child edge in the cms fragment tree.`,
})
export class CmsFragmentChildObject {
  @Field(() => String)
  childUuid!: string;

  @Field(() => String)
  parentUuid!: string;

  @Field(() => Int, { description: `Position among the parent's children.` })
  sortOrder!: number;
}
