/**
 * @public
 * @packageDocumentation
 * OpenThrottle rollout: RBAC-aware feature flags. The package owns the domain
 * (entity, module, and RolloutService with role-targeted evaluation); the GraphQL
 * resolver lives in openthrottle-server.
 */

export { RolloutFlag } from './modules/rollout-flags/rollout-flag.entity';
export type { RolloutFlagData } from './modules/rollout-flags/rollout-flag.entity';
export { RolloutFlagsModule } from './modules/rollout-flags/rollout-flags.module';
export { RolloutService } from './modules/rollout-flags/rollout.service';
export type {
  CreateRolloutFlagInput,
  EvaluatedFlag,
  UpdateRolloutFlagInput,
} from './modules/rollout-flags/rollout.service';
