/**
 * @description GraphQL ObjectTypes for the per-project skill universe: a single
 * skill row (slug, static frontmatter tags, tri-state static
 * `disable-model-invocation` flag) and a ListResult-style envelope
 * ({ skills, totalCount }). Backs the `projectSkills` query.
 *
 * v1 is the "quick win" from docs/monorepo/skill-availability-design.md
 * ("Surfacing"): the STATIC frontmatter value only — display-only, no rules,
 * no resolver, no effective values.
 */

import { Field, Int, ObjectType } from '@nestjs/graphql';

@ObjectType({
  description: `A single skill in a project's ingested skill universe, with its static frontmatter tags and tri-state disable-model-invocation flag.`,
})
export class ProjectSkillObject {
  @Field(() => String, {
    description: `Skill slug (the skill frontmatter \`name\`).`,
  })
  slug!: string;

  @Field(() => String, {
    description: `Skill provenance from frontmatter \`source\`: 'openthrottle' for skills OpenThrottle authors and manages, 'external' for skills installed from an outside source (omitted frontmatter normalizes to 'external').`,
  })
  source!: string;

  @Field(() => String, {
    description: `Optional origin URL for external skills (marketplace listing or upstream repo); null when the frontmatter omits it.`,
    nullable: true,
  })
  sourceUrl!: string | null;

  @Field(() => [String], {
    description: `Static frontmatter tags for this skill (empty when none).`,
  })
  tags!: string[];

  @Field(() => Boolean, {
    description: `Static frontmatter \`disable-model-invocation\`. Tri-state: null = unset (frontmatter omits the key), true = auto-invocation suppressed, false = auto-invocation explicitly enabled.`,
    nullable: true,
  })
  staticDisableModelInvocation!: boolean | null;
}

@ObjectType({
  description: `A project's ingested skill universe, alphabetically by slug.`,
})
export class ProjectSkillsResult {
  @Field(() => [ProjectSkillObject], {
    description: `Skills ingested for the project, alphabetically by slug.`,
  })
  skills!: ProjectSkillObject[];

  @Field(() => Int, { description: `Number of skills in the universe.` })
  totalCount!: number;
}
