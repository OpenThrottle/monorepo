/**
 * @description GraphQL input types for note mutations. Replaces individual @Args with a single input object.
 */

import { Field, ID, InputType } from '@nestjs/graphql';

@InputType()
export class CreateNoteInput {
  @Field(() => String, { nullable: true })
  author!: string | null;

  @Field(() => String)
  content!: string;
}

@InputType()
export class UpdateNoteInput {
  @Field(() => String, { nullable: true })
  author!: string | null;

  @Field(() => String, { nullable: true })
  content!: string | null;

  @Field(() => ID, { description: 'Note id to update' })
  id!: string;
}
