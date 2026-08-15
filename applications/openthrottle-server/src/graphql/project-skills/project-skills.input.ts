/**
 * @description GraphQL inputs for attaching/detaching domain tags on a
 * `project_skills` row. Provenance is not stored on the text[] column; the
 * caller identity is still used to resolve the skill-tag vocabulary.
 */

import { Field, ID, InputType } from '@nestjs/graphql';

@InputType()
export class AddProjectSkillTagInput {
  @Field(() => ID, {
    description: `Project whose skill row to tag. Omit to target the dogfood monorepo project.`,
    nullable: true,
  })
  projectId!: string | undefined;

  @Field(() => String, {
    description: `Skill slug (project_skills.slug).`,
  })
  slug!: string;

  @Field(() => String, {
    description: `Kebab-case domain tag from the caller's skill-tag vocabulary. Phase tags are rejected.`,
  })
  tag!: string;
}

@InputType()
export class RemoveProjectSkillTagInput {
  @Field(() => ID, {
    description: `Project whose skill row to untag. Omit to target the dogfood monorepo project.`,
    nullable: true,
  })
  projectId!: string | undefined;

  @Field(() => String, {
    description: `Skill slug (project_skills.slug).`,
  })
  slug!: string;

  @Field(() => String, { description: `Tag slug to remove.` })
  tag!: string;
}
