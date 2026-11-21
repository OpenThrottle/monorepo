/**
 * @description GraphQL ObjectTypes for the read-only tag→action rule match preview
 * (`previewTagActionRule`).
 */

import { Field, ID, Int, ObjectType } from '@nestjs/graphql';

@ObjectType({
  description: `One match condition of a rule against one plan: what the rule requires and what the plan offered.`,
})
export class TagActionConditionObject {
  @Field(() => String, {
    description: `What the plan offered (null when it has no value; for tags, the subset of the rule's tags the plan has).`,
    nullable: true,
  })
  actual!: string | null;

  @Field(() => String, {
    description: `repository | environment | status | tags | project.`,
  })
  condition!: string;

  @Field(() => String, {
    description: `What the rule requires; null when the rule does not qualify on this condition.`,
    nullable: true,
  })
  expected!: string | null;

  @Field(() => Boolean)
  passed!: boolean;
}

@ObjectType({ description: `A plan a previewed rule would match.` })
export class TagActionRulePreviewPlanObject {
  @Field(() => ID)
  id!: string;

  @Field(() => ID, { nullable: true })
  repositoryId!: string | null;

  @Field(() => String)
  status!: string;

  @Field(() => String)
  title!: string;
}

@ObjectType({
  description: `A plan a previewed rule would NOT match, with the per-condition reason.`,
})
export class TagActionRulePreviewNonMatchObject {
  @Field(() => [TagActionConditionObject])
  conditions!: TagActionConditionObject[];

  @Field(() => Boolean, {
    description: `True when every condition passes except the environment: the rule would apply on a pass carrying its environment.`,
  })
  failedOnlyOnEnvironment!: boolean;

  @Field(() => ID)
  id!: string;

  @Field(() => [String], {
    description: `The rule's tags the plan's effective tag set lacks.`,
  })
  missingTags!: string[];

  @Field(() => ID, { nullable: true })
  repositoryId!: string | null;

  @Field(() => String)
  status!: string;

  @Field(() => String)
  title!: string;
}

@ObjectType({
  description: `What a rule would match among the caller's plans, computed by the real evaluator without dispatching anything.`,
})
export class TagActionRulePreviewObject {
  @Field(() => Int, {
    description: `The most plans evaluated (newest-updated first); see truncated.`,
  })
  cap!: number;

  @Field(() => String, {
    description: `The environment the plans were evaluated against; null for a pass that carries none (a developer-app edit or a background trigger).`,
    nullable: true,
  })
  environment!: string | null;

  @Field(() => Int)
  evaluated!: number;

  @Field(() => [TagActionRulePreviewPlanObject])
  matched!: TagActionRulePreviewPlanObject[];

  @Field(() => Int)
  matchedCount!: number;

  @Field(() => [TagActionRulePreviewNonMatchObject], {
    description: `A sample (newest-updated first) of plans the rule does not match.`,
  })
  nonMatching!: TagActionRulePreviewNonMatchObject[];

  @Field(() => Int, {
    description: `How narrowly the rule is scoped (higher is narrower), the same score the engine ranks by.`,
  })
  specificity!: number;

  @Field(() => Boolean, {
    description: `True when the caller has more plans than the cap, so evaluated covers only the newest.`,
  })
  truncated!: boolean;
}
