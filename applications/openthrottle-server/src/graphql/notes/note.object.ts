/**
 * @description GraphQL ObjectType for Note. Mirrors the notes entity from @openthrottle/nestjs-repositories.
 */

import { Field, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class NoteObject {
  @Field(() => String, { nullable: true })
  author!: string | null;

  @Field(() => String)
  content!: string;

  @Field(() => Date)
  createdAt!: Date;

  @Field(() => String)
  id!: string;

  @Field(() => Date)
  updatedAt!: Date;
}
