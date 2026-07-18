/**
 * @description GraphQL ObjectTypes for tag→action rules and the
 * rule_applications apply-once ledger. JSONB columns travel as JSON-encoded
 * strings (actionPayloadJson/detailsJson), matching the runConfigJson
 * precedent.
 */

import { Field, ID, ObjectType } from '@nestjs/graphql';

@ObjectType({
  description: `A declarative tag→action rule: when a plan's effective tag set satisfies tagAll (AND) plus the optional qualifiers, the action dispatches. Owned by the authenticated user.`,
})
export class TagActionRuleObject {
  @Field(() => ID)
  id!: string;

  @Field(() => ID)
  userId!: string;

  @Field(() => ID, {
    description: `Optional project scope; null matches every project.`,
    nullable: true,
  })
  projectId!: string | null;

  @Field(() => String, {
    description: `Human-readable label for the rule (required, non-empty).`,
  })
  title!: string;

  @Field(() => [String], {
    description: `Tags that must ALL be present in the plan's effective tag set; empty matches every plan.`,
  })
  tagAll!: string[];

  @Field(() => String, {
    description: `Optional plan-status qualifier; null matches any status.`,
    nullable: true,
  })
  status!: string | null;

  @Field(() => String, {
    description: `Optional environment qualifier (ci | interactive | ralph); null applies everywhere.`,
    nullable: true,
  })
  environment!: string | null;

  @Field(() => String, {
    description: `Action type: "inject-task" or "availability-exception".`,
  })
  actionType!: string;

  @Field(() => String, {
    description: `JSON-encoded action payload, validated per action type at write time.`,
  })
  actionPayloadJson!: string;

  @Field(() => Boolean)
  enabled!: boolean;

  @Field(() => Date)
  createdAt!: Date;

  @Field(() => Date)
  updatedAt!: Date;
}

@ObjectType({
  description: `One apply-once ledger row for a (rule, plan) pair. States: applied | pre-satisfied | flagged | orphaned.`,
})
export class RuleApplicationObject {
  @Field(() => ID)
  id!: string;

  @Field(() => ID)
  ruleId!: string;

  @Field(() => ID)
  planId!: string;

  @Field(() => ID, {
    description: `The injected (or pre-satisfying) task; null when not applicable or after a human deleted the task.`,
    nullable: true,
  })
  taskId!: string | null;

  @Field(() => String, {
    description: `applied | pre-satisfied | flagged | orphaned.`,
  })
  state!: string;

  @Field(() => String, {
    description: `JSON-encoded executor context for the state (e.g. {"reason":"skill-unavailable"}).`,
    nullable: true,
  })
  detailsJson!: string | null;

  @Field(() => Date)
  createdAt!: Date;

  @Field(() => Date)
  updatedAt!: Date;
}
