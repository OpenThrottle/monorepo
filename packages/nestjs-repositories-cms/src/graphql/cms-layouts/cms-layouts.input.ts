/**
 * @description GraphQL inputs for the cms layout mutations.
 */

import { Field, InputType } from '@nestjs/graphql';

@InputType({
  description: `A new layout. Its root fragment is created with it, on the newest ACTIVE "Layout" schema.`,
})
export class CreateCmsLayoutInput {
  @Field(() => String)
  name!: string;

  @Field(() => String, {
    description: `Unique across every layout, deleted ones included.`,
  })
  slug!: string;
}

@InputType({
  description: `Changes to a layout. Omitted fields are left as they are.`,
})
export class UpdateCmsLayoutInput {
  @Field(() => String, {
    description: `Layout metadata as a JSON object string.`,
    nullable: true,
  })
  metadataJson!: string | null;

  @Field(() => String, { nullable: true })
  name!: string | null;

  @Field(() => String, { nullable: true })
  slug!: string | null;

  @Field(() => String, {
    description: `ACTIVE | DISABLED | DRAFT`,
    nullable: true,
  })
  status!: string | null;

  @Field(() => [String], { nullable: true })
  tags!: string[] | null;

  @Field(() => String)
  uuid!: string;
}
