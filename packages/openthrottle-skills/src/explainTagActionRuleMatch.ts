import type {
  TagActionEvaluationContext,
  TagActionRuleInput,
} from './tag-actions.ts';
import { evaluateTagActionRules } from './tag-actions.ts';

/**
 * @description The match conditions of a tag→action rule, in the order
 * {@link explainTagActionRuleMatch} reports them. Each one passes for a rule that leaves it unset.
 * @public
 */
export const TAG_ACTION_CONDITIONS = {
  ENVIRONMENT: 'environment',
  PROJECT: 'project',
  REPOSITORY: 'repository',
  STATUS: 'status',
  TAGS: 'tags',
} as const;

/** @public */
export type TagActionCondition =
  (typeof TAG_ACTION_CONDITIONS)[keyof typeof TAG_ACTION_CONDITIONS];

/**
 * @description One condition's verdict. `expected` is what the rule requires (null when the rule
 * does not qualify on it) and `actual` is what the plan offered (null when it has no value; for
 * `tags`, the subset of the rule's tags the plan has).
 * @public
 */
export interface TagActionConditionResult {
  readonly actual: string | null;
  readonly condition: TagActionCondition;
  readonly expected: string | null;
  readonly passed: boolean;
}

/**
 * @description Why a rule does or does not match a plan context.
 * @public
 */
export interface TagActionRuleMatchExplanation {
  /** One verdict per condition, in {@link TAG_ACTION_CONDITIONS} order. */
  readonly conditions: readonly TagActionConditionResult[];
  /** The rule's own enabled flag; a disabled rule never matches. */
  readonly enabled: boolean;
  /**
   * True when the rule is enabled, every other condition passes and only the environment fails:
   * it would apply on a pass (or plan-context read) carrying its environment.
   */
  readonly failedOnlyOnEnvironment: boolean;
  /** Decided by {@link evaluateTagActionRules}, never recomputed here. */
  readonly matched: boolean;
  /** The rule's `tagAll` tags absent from the context's effective tags. */
  readonly missingTags: readonly string[];
}

const scalarCondition = (
  condition: TagActionCondition,
  expected: string | null,
  actual: string | null,
): TagActionConditionResult => {
  return {
    actual,
    condition,
    expected,
    passed: expected == null || expected === actual,
  };
};

/**
 * @description Explains, per condition, why one rule does or does not match a plan context: the
 * per-condition pass/fail the evaluator collapses into a single boolean, plus the missing tags.
 * Pure (zero I/O). `matched` is taken from {@link evaluateTagActionRules} itself, so this can
 * explain but never disagree with the engine; the condition verdicts mirror its checks and a test
 * pins the two together.
 * @public
 */
export const explainTagActionRuleMatch = (
  context: TagActionEvaluationContext,
  rule: TagActionRuleInput,
): TagActionRuleMatchExplanation => {
  const effective = new Set(context.effectiveTags);
  const presentTags = rule.tagAll.filter((tag) => effective.has(tag));
  const missingTags = rule.tagAll.filter((tag) => !effective.has(tag));

  const conditions: readonly TagActionConditionResult[] = [
    scalarCondition(
      TAG_ACTION_CONDITIONS.REPOSITORY,
      rule.repositoryId,
      context.repositoryId,
    ),
    scalarCondition(
      TAG_ACTION_CONDITIONS.ENVIRONMENT,
      rule.environment,
      context.environment,
    ),
    scalarCondition(
      TAG_ACTION_CONDITIONS.STATUS,
      rule.status,
      context.planStatus,
    ),
    {
      actual: presentTags.length === 0 ? null : presentTags.join(', '),
      condition: TAG_ACTION_CONDITIONS.TAGS,
      expected: rule.tagAll.length === 0 ? null : rule.tagAll.join(', '),
      passed: missingTags.length === 0,
    },
    scalarCondition(
      TAG_ACTION_CONDITIONS.PROJECT,
      rule.projectId,
      context.projectId,
    ),
  ];

  const failed = conditions.filter((result) => !result.passed);
  const failedOnlyOnEnvironment =
    rule.enabled &&
    failed.length === 1 &&
    failed[0]?.condition === TAG_ACTION_CONDITIONS.ENVIRONMENT;

  return {
    conditions,
    enabled: rule.enabled,
    failedOnlyOnEnvironment,
    matched: evaluateTagActionRules(context, [rule]).length > 0,
    missingTags,
  };
};
