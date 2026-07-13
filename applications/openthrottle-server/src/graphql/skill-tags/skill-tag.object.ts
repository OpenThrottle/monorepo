/**
 * @description GraphQL ObjectTypes for the per-user skill-tag vocabulary: a single
 * tag row and a ListResult-style envelope ({ tags, totalCount }). Backs the
 * skillTagVocabulary query; consumed via the openthrottle-mcp list_skill_tags tool.
 */

import { Field, ID, Int, ObjectType } from '@nestjs/graphql';

@ObjectType({
  description: `A single tag in the authenticated user's skill-tag vocabulary.`,
})
export class SkillTagObject {
  @Field(() => ID)
  id!: string;

  @Field(() => ID)
  userId!: string;

  @Field(() => String, {
    description: `Kebab-case tag slug, unique per user.`,
  })
  tag!: string;

  @Field(() => String, {
    description: `Vocabulary axis: "domain" (subject area; the only dimension skills may carry) or "phase" (plan/task lifecycle stage).`,
  })
  dimension!: string;

  @Field(() => Date)
  createdAt!: Date;

  @Field(() => Date)
  updatedAt!: Date;
}

@ObjectType({
  description: `The authenticated user's skill-tag vocabulary, seeded from the platform default on first read.`,
})
export class SkillTagVocabularyResult {
  @Field(() => [SkillTagObject], {
    description: `Tags in the user's vocabulary, alphabetically by tag.`,
  })
  tags!: SkillTagObject[];

  @Field(() => Int, { description: `Number of tags in the vocabulary.` })
  totalCount!: number;
}
