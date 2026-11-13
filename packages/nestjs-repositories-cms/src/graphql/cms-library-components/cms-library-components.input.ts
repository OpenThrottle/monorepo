/**
 * @description GraphQL inputs for the cms library-component mutations.
 */

import { Field, InputType } from '@nestjs/graphql';

@InputType({ description: `A new component in a live cms library.` })
export class CreateCmsLibraryComponentInput {
  @Field(() => String, { description: `Component source code.` })
  code!: string;

  @Field(() => String)
  libraryUuid!: string;

  @Field(() => String)
  name!: string;

  @Field(() => String, {
    description: `JSON Schema of the component's props, as a JSON object string. Must compile under strict Ajv. Omit for an empty schema.`,
    nullable: true,
  })
  propsSchemaJson!: string | null;

  @Field(() => String, {
    description: `ACTIVE | DISABLED | DRAFT (default DRAFT)`,
    nullable: true,
  })
  status!: string | null;

  @Field(() => String)
  typename!: string;
}

@InputType({
  description: `Changes to a library component. Omitted fields are left as they are.`,
})
export class UpdateCmsLibraryComponentInput {
  @Field(() => String, { nullable: true })
  code!: string | null;

  @Field(() => String, { nullable: true })
  name!: string | null;

  @Field(() => String, { nullable: true })
  propsSchemaJson!: string | null;

  @Field(() => String, { nullable: true })
  status!: string | null;

  @Field(() => String, { nullable: true })
  typename!: string | null;

  @Field(() => String)
  uuid!: string;
}
