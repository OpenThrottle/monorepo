/**
 * @description GraphQL inputs for skill-tag vocabulary mutations (user-scoped).
 */

import { Field, InputType } from '@nestjs/graphql';

@InputType()
export class AddSkillTagInput {
  @Field(() => String, {
    description: `Kebab-case tag slug to add (e.g. "pr-review").`,
  })
  tag!: string;

  @Field(() => String, {
    defaultValue: 'domain',
    description: `Vocabulary axis for the tag: "domain" (default) or "phase".`,
    nullable: true,
  })
  dimension?: string;
}

@InputType()
export class RenameSkillTagInput {
  @Field(() => String, { description: `Existing tag slug to rename.` })
  from!: string;

  @Field(() => String, { description: `New kebab-case tag slug.` })
  to!: string;
}

@InputType()
export class RemoveSkillTagInput {
  @Field(() => String, { description: `Tag slug to remove.` })
  tag!: string;
}
