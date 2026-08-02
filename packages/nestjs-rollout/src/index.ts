/**
 * @public
 * @packageDocumentation
 * OpenThrottle rollout: RBAC-aware typed feature flags. The package owns the
 * domain (entity, module, and RolloutService with role-targeted evaluation);
 * the GraphQL resolver lives in openthrottle-server.
 */

export {
  ROLLOUT_BOOLEAN_DEFAULT_FALLTHROUGH,
  ROLLOUT_BOOLEAN_DEFAULT_VARIATIONS,
  ROLLOUT_FLAG_KIND,
} from './modules/rollout-flags/rollout-flag.constants';
export type {
  RolloutFallthrough,
  RolloutFallthroughBucket,
  RolloutFlagKind,
  RolloutFlagVariation,
  RolloutJsonValue,
  RolloutVariationValue,
} from './modules/rollout-flags/rollout-flag.constants';
export { RolloutFlag } from './modules/rollout-flags/rollout-flag.entity';
export type { RolloutFlagData } from './modules/rollout-flags/rollout-flag.entity';
export { RolloutFlagsModule } from './modules/rollout-flags/rollout-flags.module';
export { RolloutService } from './modules/rollout-flags/rollout.service';
export type {
  CreateRolloutFlagInput,
  EvaluatedFlag,
  UpdateRolloutFlagInput,
} from './modules/rollout-flags/rollout.service';
