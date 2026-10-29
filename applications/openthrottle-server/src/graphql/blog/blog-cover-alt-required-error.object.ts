/**
 * @description Typed error result: the write would leave the post with a cover image URL but
 * no cover alt text. Nothing was written; set `coverImageAlt` or clear `coverImageUrl`.
 */

import { Field, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class BlogCoverAltRequiredError {
  @Field(() => String, { description: `Human-readable explanation.` })
  message!: string;
}
