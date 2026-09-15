/**
 * @public
 * @packageDocumentation
 * OpenThrottle rollout: RBAC-aware typed feature flags. The package owns the
 * domain (entity, module, and RolloutService with role-targeted evaluation);
 * the GraphQL resolver lives in openthrottle-server.
 */

export type {
  CreateRolloutFlagInput,
  UpdateRolloutFlagInput,
} from './modules/rollout-flags/rollout.service.ts';
export { RolloutService } from './modules/rollout-flags/rollout.service.ts';
export {
  pickFallthroughVariation,
  principalIdToBucket,
} from './modules/rollout-flags/rollout-flag.bucketing.ts';
export type {
  RolloutEvaluation,
  RolloutEvaluationReason,
  RolloutFallthrough,
  RolloutFallthroughBucket,
  RolloutFlagKind,
  RolloutFlagVariation,
  RolloutJsonValue,
  RolloutVariationValue,
} from './modules/rollout-flags/rollout-flag.constants.ts';
export {
  ROLLOUT_BOOLEAN_DEFAULT_FALLTHROUGH,
  ROLLOUT_BOOLEAN_DEFAULT_VARIATIONS,
  ROLLOUT_EVALUATION_REASON,
  ROLLOUT_FLAG_KIND,
} from './modules/rollout-flags/rollout-flag.constants.ts';
export type { RolloutFlagData } from './modules/rollout-flags/rollout-flag.entity.ts';
export { RolloutFlag } from './modules/rollout-flags/rollout-flag.entity.ts';
export { RolloutFlagsModule } from './modules/rollout-flags/rollout-flags.module.ts';
