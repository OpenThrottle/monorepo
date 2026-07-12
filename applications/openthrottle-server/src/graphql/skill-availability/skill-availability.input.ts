/**
 * @description GraphQL inputs for skill-availability mutations. `SkillAvailabilityRuleInput` carries
 * a rule's tag/slug allow-deny lists and optional environment; the allow/deny lists default to an
 * empty array. Values are re-validated server-side by SkillAvailabilityService's strict Zod schema
 * (kebab-case, environment enum) and, for tags, against the caller's vocabulary.
 */

import { Field, InputType } from '@nestjs/graphql';

@InputType()
export class SkillAvailabilityRuleInput {
  @Field(() => String, {
    description: `Environment qualifier: omit/null for all environments, or "ci" | "interactive" | "ralph" to scope the rule.`,
    nullable: true,
  })
  environment?: string | null;

  @Field(() => [String], {
    defaultValue: [],
    description: `Skill slugs to allow (rung 1 exceptions).`,
  })
  slugAllow!: string[];

  @Field(() => [String], {
    defaultValue: [],
    description: `Skill slugs to deny (rung 1 exceptions).`,
  })
  slugDeny!: string[];

  @Field(() => [String], {
    defaultValue: [],
    description: `Tags to allow (rung 2). Must be in the caller's skill-tag vocabulary.`,
  })
  tagAllow!: string[];

  @Field(() => [String], {
    defaultValue: [],
    description: `Tags to deny (rung 2). Must be in the caller's skill-tag vocabulary.`,
  })
  tagDeny!: string[];
}
