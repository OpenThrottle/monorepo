/**
 * @description GraphQL inputs for the cms fragment mutations.
 */

import { Field, InputType } from '@nestjs/graphql';

@InputType({
  description: `A new fragment of a typename, on that typename's newest ACTIVE schema.`,
})
export class CreateCmsFragmentInput {
  @Field(() => String)
  name!: string;

  @Field(() => String, {
    description: `Properties as a JSON object string, merged over the schema's defaults. Omit to start from the defaults alone.`,
    nullable: true,
  })
  propertiesJson!: string | null;

  @Field(() => String)
  typename!: string;
}

@InputType({
  description: `Changes to a fragment. Omitted fields are left as they are.`,
})
export class UpdateCmsFragmentInput {
  @Field(() => String, { nullable: true })
  name!: string | null;

  @Field(() => String, {
    description: `The full new properties as a JSON object string, validated against the fragment's own (pinned) schema.`,
    nullable: true,
  })
  propertiesJson!: string | null;

  @Field(() => String)
  uuid!: string;
}
