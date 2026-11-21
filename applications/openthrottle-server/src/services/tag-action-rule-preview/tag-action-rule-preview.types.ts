import type {
  TagActionRuleMatchExplanation,
  TagActionType,
} from '@openthrottle/openthrottle-skills';

/**
 * @description The match fields of the rule being previewed. Only these matter: the action
 * payload is deliberately absent, so a half-written payload never blocks a preview.
 * @public
 */
export interface TagActionRulePreviewRule {
  readonly actionType: TagActionType;
  readonly environment: string | null;
  readonly projectId: string | null;
  readonly repositoryId: string | null;
  readonly status: string | null;
  readonly tagAll: readonly string[];
}

/** @public */
export interface TagActionRulePreviewPlan {
  readonly id: string;
  readonly repositoryId: string | null;
  readonly status: string;
  readonly title: string;
}

/** @public */
export interface TagActionRulePreviewNonMatch extends TagActionRulePreviewPlan {
  readonly explanation: TagActionRuleMatchExplanation;
}

/**
 * @description What {@link TagActionRulePreviewService.preview} returns.
 * @public
 */
export interface TagActionRulePreviewResult {
  readonly cap: number;
  /** The environment the plans were evaluated against; null for a pass that carries none. */
  readonly environment: string | null;
  readonly evaluated: number;
  readonly matched: readonly TagActionRulePreviewPlan[];
  readonly matchedCount: number;
  readonly nonMatching: readonly TagActionRulePreviewNonMatch[];
  readonly specificity: number;
  /** True when the caller owns more plans than the cap, so `evaluated` is a prefix of them. */
  readonly truncated: boolean;
}
