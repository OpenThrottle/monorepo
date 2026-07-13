/**
 * @description GraphQL ObjectTypes for the *resolved* per-context skill-availability
 * surface (`skillAvailability` query). Each skill carries its tri-state static
 * `disable-model-invocation`, the resolved `effectiveDisableModelInvocation`, and the
 * decisive rung's `provenance`. The result envelope follows the ListResult convention
 * ({ skills, totalCount }) and adds the resolver's deduped `warnings`. Maps 1:1 onto
 * `SkillAvailabilityResult` / `ResolvedSkillAvailability` from
 * @openthrottle/openthrottle-skills. See docs/monorepo/skill-availability-design.md
 * ("Output contract").
 */

import { Field, Int, ObjectType } from '@nestjs/graphql';

@ObjectType({
  description: `A single skill's resolved, per-context availability: its static frontmatter flag, the effective flag, and the decisive rung's provenance.`,
})
export class SkillAvailabilityResolvedSkillObject {
  @Field(() => Boolean, {
    description: `Resolved per-context flag: true ⇒ model auto-invocation suppressed. Human /skill invocation is never gated.`,
  })
  effectiveDisableModelInvocation!: boolean;

  @Field(() => String, {
    description: `Decisive rung's provenance (closed grammar), e.g. frontmatter:true|false|unset, posture:deny, slug-allow:<slug>@<ruleId>, tag-deny:<tag>@<ruleId>.`,
  })
  provenance!: string;

  @Field(() => [String], {
    description: `Plan-context annotation: this skill's tags ∩ the plan's effective DOMAIN tag set. Empty when the query has no planId.`,
  })
  matchedPlanTags!: string[];

  @Field(() => Boolean, {
    description: `Plan-context annotation: true when matchedPlanTags is non-empty. Always false when the query has no planId.`,
  })
  planRelevant!: boolean;

  @Field(() => String, {
    description: `Skill slug (the skill frontmatter \`name\`).`,
  })
  slug!: string;

  @Field(() => Boolean, {
    description: `Static frontmatter \`disable-model-invocation\`. Tri-state: null = unset, true = suppressed, false = explicitly enabled.`,
    nullable: true,
  })
  staticDisableModelInvocation!: boolean | null;
}

@ObjectType({
  description: `A project's resolved skill-availability universe for a given context (environment), plus resolve-time warnings.`,
})
export class SkillAvailabilityResolutionResult {
  @Field(() => [SkillAvailabilityResolvedSkillObject], {
    description: `Resolved skills, in the project's ingested order (alphabetical by slug).`,
  })
  skills!: SkillAvailabilityResolvedSkillObject[];

  @Field(() => Int, {
    description: `Number of skills in the resolved universe.`,
  })
  totalCount!: number;

  @Field(() => [String], {
    description: `Resolve-time warnings (e.g. unknown-tag:<tag>@<slug>), deduped. Empty for pure passthrough.`,
  })
  warnings!: string[];
}
