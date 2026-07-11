/**
 * @description GraphQL ObjectTypes for per-project skill-availability rules: a single rule
 * (tag/slug allow-deny lists + optional environment) and the project's rule set (posture + rules).
 * Backs the skillAvailabilityRuleSet query and the rule mutations. Maps 1:1 onto the resolver's
 * SkillAvailabilityRuleSet / SkillAvailabilityRule shapes in @openthrottle/openthrottle-skills, so
 * the same objects feed resolveSkillAvailability. See docs/monorepo/skill-availability-design.md.
 */

import { Field, ID, ObjectType } from '@nestjs/graphql';

@ObjectType({
  description: `A single per-project skill-availability rule: tag/slug allow-deny lists, optionally scoped to an environment.`,
})
export class SkillAvailabilityRuleObject {
  @Field(() => ID, {
    description: `Stable rule identifier (used in resolver provenance and as the target of updateSkillAvailabilityRule / removeSkillAvailabilityRule).`,
  })
  id!: string;

  @Field(() => String, {
    description: `Environment qualifier: null applies to all environments; a value (ci | interactive | ralph) scopes the rule to that environment.`,
    nullable: true,
  })
  environment!: string | null;

  @Field(() => [String], {
    description: `Skill slugs this rule allows (rung 1 exceptions); empty when none.`,
  })
  slugAllow!: string[];

  @Field(() => [String], {
    description: `Skill slugs this rule denies (rung 1 exceptions); empty when none.`,
  })
  slugDeny!: string[];

  @Field(() => [String], {
    description: `Tags this rule allows (rung 2); empty when none.`,
  })
  tagAllow!: string[];

  @Field(() => [String], {
    description: `Tags this rule denies (rung 2); empty when none.`,
  })
  tagDeny!: string[];
}

@ObjectType({
  description: `A project's skill-availability rule set: the single per-project posture and its rules. Absent (null query result) ⇒ passthrough.`,
})
export class SkillAvailabilityRuleSetObject {
  @Field(() => String, {
    description: `The single per-project posture (rung 3): "allow" or "deny".`,
  })
  posture!: string;

  @Field(() => [SkillAvailabilityRuleObject], {
    description: `The rule set's rules, evaluated at precedence rungs 1-2.`,
  })
  rules!: SkillAvailabilityRuleObject[];
}
