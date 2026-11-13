/**
 * @description GraphQL shapes for cms component libraries and their components.
 */

import { Field, Int, ObjectType } from '@nestjs/graphql';

@ObjectType({
  description: `The component that renders one fragment typename within a cms library.`,
})
export class CmsLibraryComponentObject {
  @Field(() => String, { description: `Component source code.` })
  code!: string;

  @Field(() => String)
  libraryUuid!: string;

  @Field(() => String)
  name!: string;

  @Field(() => String, {
    description: `JSON Schema of the component's props, as a JSON object string.`,
  })
  propsSchemaJson!: string;

  @Field(() => String, {
    description: `ACTIVE | DISABLED | DRAFT`,
    nullable: true,
  })
  status!: string | null;

  @Field(() => String)
  typename!: string;

  @Field(() => String)
  uuid!: string;
}

@ObjectType({ description: `A named set of renderable cms components.` })
export class CmsLibraryObject {
  @Field(() => [CmsLibraryComponentObject], {
    description: `The library's live components, by typename.`,
  })
  components!: CmsLibraryComponentObject[];

  @Field(() => Date)
  createdAt!: Date;

  @Field(() => String, { nullable: true })
  description!: string | null;

  @Field(() => String)
  name!: string;

  @Field(() => String, {
    description: `ACTIVE | DISABLED | DRAFT`,
    nullable: true,
  })
  status!: string | null;

  @Field(() => Date)
  updatedAt!: Date;

  @Field(() => String)
  uuid!: string;
}

@ObjectType({ description: `One page of live cms libraries, oldest first.` })
export class CmsLibraryListResult {
  @Field(() => Boolean)
  hasNextPage!: boolean;

  @Field(() => [CmsLibraryObject])
  items!: CmsLibraryObject[];

  @Field(() => Int)
  totalCount!: number;
}

@ObjectType({
  description: `One page of live cms library components, across every library, by typename.`,
})
export class CmsLibraryComponentListResult {
  @Field(() => Boolean)
  hasNextPage!: boolean;

  @Field(() => [CmsLibraryComponentObject])
  items!: CmsLibraryComponentObject[];

  @Field(() => Int)
  totalCount!: number;
}
